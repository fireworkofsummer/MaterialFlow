// 出库记录页面
const StorageManager = require('../../utils/storage.js');

Page({
  data: {
    outboundRecords: [],
    filteredRecords: [],
    searchKeyword: '',
    dateRange: {
      start: '',
      end: ''
    },
    sortBy: 'date-desc'
  },

  onLoad() {
    this.loadOutboundRecords();
    this.setDefaultDateRange();
  },

  onShow() {
    this.loadOutboundRecords();
  },

  // 设置默认日期范围（最近30天）
  setDefaultDateRange() {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    this.setData({
      dateRange: {
        start: thirtyDaysAgo.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0]
      }
    });
  },

  // 加载出库记录
  loadOutboundRecords() {
    try {
      const records = StorageManager.getOutboundRecords();
      const materials = StorageManager.getMaterials();
      
      // 为记录添加物料信息
      const recordsWithDetails = records.map(record => {
        const itemsWithMaterials = record.items.map(item => {
          const material = materials.find(m => m.id === item.materialId);
          return {
            ...item,
            materialName: material ? material.name : '未知物料',
            materialUnit: material ? material.unit : ''
          };
        });
        
        return {
          ...record,
          items: itemsWithMaterials,
          displayDate: record.outboundDate.split('T')[0]
        };
      });
      
      this.setData({
        outboundRecords: recordsWithDetails
      });
      
      this.filterRecords();
    } catch (error) {
      console.error('加载出库记录失败:', error);
      wx.showToast({
        title: '数据加载失败',
        icon: 'error'
      });
    }
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({
      searchKeyword: e.detail.value
    });
    this.filterRecords();
  },

  // 选择开始日期
  onStartDateChange(e) {
    this.setData({
      'dateRange.start': e.detail.value
    });
    this.filterRecords();
  },

  // 选择结束日期
  onEndDateChange(e) {
    this.setData({
      'dateRange.end': e.detail.value
    });
    this.filterRecords();
  },

  // 排序方式改变
  onSortChange(e) {
    const sortOptions = ['date-desc', 'date-asc', 'amount-desc', 'amount-asc'];
    this.setData({
      sortBy: sortOptions[e.detail.value]
    });
    this.filterRecords();
  },

  // 过滤和排序记录
  filterRecords() {
    let filtered = [...this.data.outboundRecords];
    
    // 按日期范围过滤
    if (this.data.dateRange.start || this.data.dateRange.end) {
      filtered = filtered.filter(record => {
        const recordDate = record.displayDate;
        const start = this.data.dateRange.start;
        const end = this.data.dateRange.end;
        
        if (start && recordDate < start) return false;
        if (end && recordDate > end) return false;
        return true;
      });
    }
    
    // 按关键词过滤
    if (this.data.searchKeyword) {
      const keyword = this.data.searchKeyword.toLowerCase();
      filtered = filtered.filter(record => {
        return record.outboundNumber?.toLowerCase().includes(keyword) ||
               record.recipient?.toLowerCase().includes(keyword) ||
               record.operator?.toLowerCase().includes(keyword) ||
               record.items.some(item => 
                 item.materialName.toLowerCase().includes(keyword)
               );
      });
    }
    
    // 排序
    filtered.sort((a, b) => {
      switch (this.data.sortBy) {
        case 'date-desc':
          return new Date(b.outboundDate) - new Date(a.outboundDate);
        case 'date-asc':
          return new Date(a.outboundDate) - new Date(b.outboundDate);
        case 'amount-desc':
          return b.totalCost - a.totalCost;
        case 'amount-asc':
          return a.totalCost - b.totalCost;
        default:
          return 0;
      }
    });
    
    this.setData({
      filteredRecords: filtered
    });
  },

  // 查看详情
  onViewDetail(e) {
    const record = e.currentTarget.dataset.record;
    let content = `出库单号: ${record.outboundNumber}\n`;
    content += `出库日期: ${record.displayDate}\n`;
    content += `领料人/项目: ${record.recipient || '未填写'}\n`;
    content += `经手人: ${record.operator || '未填写'}\n`;
    content += `总成本: ¥${record.totalCost.toFixed(2)}\n\n`;
    content += `出库明细:\n`;
    
    record.items.forEach((item, index) => {
      content += `${index + 1}. ${item.materialName}\n`;
      content += `   数量: ${item.quantity}${item.materialUnit}\n`;
      content += `   成本: ¥${item.totalCost.toFixed(2)}\n`;
      
      // 显示FIFO明细
      if (item.batchConsumptions && item.batchConsumptions.length > 0) {
        content += `   批次消耗:\n`;
        item.batchConsumptions.forEach((batch, bIndex) => {
          content += `     ${bIndex + 1}. ${batch.inboundDate.split('T')[0]} - ${batch.consumedQuantity}${item.materialUnit} × ¥${batch.unitPrice} = ¥${batch.cost.toFixed(2)}\n`;
        });
      }
    });
    
    if (record.remark) {
      content += `\n备注: ${record.remark}`;
    }
    
    wx.showModal({
      title: '出库单详情',
      content: content,
      showCancel: false
    });
  },

  // 新增出库
  onAddOutbound() {
    wx.navigateTo({
      url: '/pages/outbound-form/outbound-form'
    });
  },

  // 删除出库记录
  onDeleteRecord(e) {
    const recordId = e.currentTarget.dataset.id;
    const record = this.data.outboundRecords.find(r => r.id === recordId);
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除出库单 "${record.outboundNumber}" 吗？删除后库存数量会相应恢复。`,
      success: (res) => {
        if (res.confirm) {
          try {
            // 恢复库存批次
            this.restoreStockBatches(record);
            
            // 删除出库记录
            const records = StorageManager.getOutboundRecords();
            const filteredRecords = records.filter(r => r.id !== recordId);
            StorageManager.saveOutboundRecords(filteredRecords);
            
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });
            
            this.loadOutboundRecords();
          } catch (error) {
            console.error('删除出库记录失败:', error);
            wx.showToast({
              title: '删除失败',
              icon: 'error'
            });
          }
        }
      }
    });
  },

  // 恢复库存批次
  restoreStockBatches(record) {
    const batches = StorageManager.getStockBatches();
    
    record.items.forEach(item => {
      if (item.batchConsumptions) {
        item.batchConsumptions.forEach(consumption => {
          const batch = batches.find(b => b.id === consumption.batchId);
          if (batch) {
            batch.remainingQuantity += consumption.consumedQuantity;
            StorageManager.updateStockBatch(batch.id, {
              remainingQuantity: batch.remainingQuantity
            });
          }
        });
      }
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadOutboundRecords();
    wx.stopPullDownRefresh();
  }
});
