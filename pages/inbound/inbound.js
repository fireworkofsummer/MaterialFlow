// 入库记录页面
const StorageManager = require('../../utils/storage.js');

Page({
  data: {
    inboundRecords: [],
    filteredRecords: [],
    searchKeyword: '',
    dateRange: {
      start: '',
      end: ''
    },
    sortBy: 'date-desc' // date-desc, date-asc, amount-desc, amount-asc
  },

  onLoad() {
    this.loadInboundRecords();
    this.setDefaultDateRange();
  },

  onShow() {
    this.loadInboundRecords();
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

  // 加载入库记录
  loadInboundRecords() {
    try {
      const records = StorageManager.getInboundRecords();
      const materials = StorageManager.getMaterials();
      
      // 为记录添加物料信息和总金额
      const recordsWithDetails = records.map(record => {
        let totalAmount = 0;
        const itemsWithMaterials = record.items.map(item => {
          const material = materials.find(m => m.id === item.materialId);
          const itemTotal = item.quantity * item.unitPrice;
          totalAmount += itemTotal;
          
          return {
            ...item,
            materialName: material ? material.name : '未知物料',
            materialUnit: material ? material.unit : '',
            itemTotal
          };
        });
        
        return {
          ...record,
          items: itemsWithMaterials,
          totalAmount,
          displayDate: record.inboundDate.split('T')[0]
        };
      });
      
      this.setData({
        inboundRecords: recordsWithDetails
      });
      
      this.filterRecords();
    } catch (error) {
      console.error('加载入库记录失败:', error);
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
    let filtered = [...this.data.inboundRecords];
    
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
        return record.inboundNumber?.toLowerCase().includes(keyword) ||
               record.supplier?.toLowerCase().includes(keyword) ||
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
          return new Date(b.inboundDate) - new Date(a.inboundDate);
        case 'date-asc':
          return new Date(a.inboundDate) - new Date(b.inboundDate);
        case 'amount-desc':
          return b.totalAmount - a.totalAmount;
        case 'amount-asc':
          return a.totalAmount - b.totalAmount;
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
    let content = `入库单号: ${record.inboundNumber}\n`;
    content += `入库日期: ${record.displayDate}\n`;
    content += `供应商: ${record.supplier || '未填写'}\n`;
    content += `经手人: ${record.operator || '未填写'}\n`;
    content += `总金额: ¥${record.totalAmount.toFixed(2)}\n\n`;
    content += `入库明细:\n`;
    
    record.items.forEach((item, index) => {
      content += `${index + 1}. ${item.materialName}\n`;
      content += `   数量: ${item.quantity}${item.materialUnit}\n`;
      content += `   单价: ¥${item.unitPrice}\n`;
      content += `   小计: ¥${item.itemTotal.toFixed(2)}\n`;
    });
    
    if (record.remark) {
      content += `\n备注: ${record.remark}`;
    }
    
    wx.showModal({
      title: '入库单详情',
      content: content,
      showCancel: false
    });
  },

  // 新增入库
  onAddInbound() {
    wx.navigateTo({
      url: '/pages/inbound-form/inbound-form'
    });
  },

  // 删除入库记录
  onDeleteRecord(e) {
    const recordId = e.currentTarget.dataset.id;
    const record = this.data.inboundRecords.find(r => r.id === recordId);
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除入库单 "${record.inboundNumber}" 吗？删除后相关的库存批次也会被移除。`,
      success: (res) => {
        if (res.confirm) {
          try {
            // 删除相关的库存批次
            const batches = StorageManager.getStockBatches();
            const filteredBatches = batches.filter(b => b.inboundRecordId !== recordId);
            StorageManager.saveStockBatches(filteredBatches);
            
            // 删除入库记录
            const records = StorageManager.getInboundRecords();
            const filteredRecords = records.filter(r => r.id !== recordId);
            StorageManager.saveInboundRecords(filteredRecords);
            
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });
            
            this.loadInboundRecords();
          } catch (error) {
            console.error('删除入库记录失败:', error);
            wx.showToast({
              title: '删除失败',
              icon: 'error'
            });
          }
        }
      }
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadInboundRecords();
    wx.stopPullDownRefresh();
  }
});
