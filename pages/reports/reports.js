// 报表页面
const StorageManager = require('../../utils/storage.js');
const InventoryManager = require('../../utils/inventory.js');

Page({
  data: {
    dateRange: {
      start: '',
      end: ''
    },
    reportData: [],
    summary: {
      totalMaterials: 0,
      totalBeginningValue: 0,
      totalInboundValue: 0,
      totalOutboundValue: 0,
      totalEndingValue: 0
    },
    showDetail: false
  },

  onLoad() {
    this.setDefaultDateRange();
  },

  // 设置默认日期范围（当前月）
  setDefaultDateRange() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    this.setData({
      dateRange: {
        start: firstDay.toISOString().split('T')[0],
        end: lastDay.toISOString().split('T')[0]
      }
    });
    
    this.generateReport();
  },

  // 选择开始日期
  onStartDateChange(e) {
    this.setData({
      'dateRange.start': e.detail.value
    });
    this.generateReport();
  },

  // 选择结束日期
  onEndDateChange(e) {
    this.setData({
      'dateRange.end': e.detail.value
    });
    this.generateReport();
  },

  // 生成报表
  generateReport() {
    const { start, end } = this.data.dateRange;
    
    if (!start || !end) {
      wx.showToast({
        title: '请选择日期范围',
        icon: 'none'
      });
      return;
    }
    
    if (start > end) {
      wx.showToast({
        title: '开始日期不能晚于结束日期',
        icon: 'none'
      });
      return;
    }
    
    wx.showLoading({
      title: '生成报表中...'
    });
    
    try {
      const reportData = InventoryManager.generateStockReport(start, end);
      
      // 为每个物料添加格式化字段
      const formattedReportData = reportData.map(item => ({
        ...item,
        beginningValueFormatted: (parseFloat(item.beginningValue) || 0).toFixed(2),
        periodInboundValueFormatted: (parseFloat(item.periodInboundValue) || 0).toFixed(2),
        periodOutboundValueFormatted: (parseFloat(item.periodOutboundValue) || 0).toFixed(2),
        endingValueFormatted: (parseFloat(item.endingValue) || 0).toFixed(2)
      }));
      
      // 计算汇总数据，确保数值格式正确
      const summary = {
        totalMaterials: formattedReportData.length,
        totalBeginningValue: formattedReportData.reduce((sum, item) => {
          return sum + (parseFloat(item.beginningValue) || 0);
        }, 0),
        totalInboundValue: formattedReportData.reduce((sum, item) => {
          return sum + (parseFloat(item.periodInboundValue) || 0);
        }, 0),
        totalOutboundValue: formattedReportData.reduce((sum, item) => {
          return sum + (parseFloat(item.periodOutboundValue) || 0);
        }, 0),
        totalEndingValue: formattedReportData.reduce((sum, item) => {
          return sum + (parseFloat(item.endingValue) || 0);
        }, 0)
      };
      
      // 添加格式化字段
      const summaryFormatted = {
        ...summary,
        totalBeginningValueFormatted: summary.totalBeginningValue.toFixed(2),
        totalInboundValueFormatted: summary.totalInboundValue.toFixed(2),
        totalOutboundValueFormatted: summary.totalOutboundValue.toFixed(2),
        totalEndingValueFormatted: summary.totalEndingValue.toFixed(2)
      };
      
      console.log('报表数据:', formattedReportData);
      console.log('汇总数据:', summaryFormatted);
      
      this.setData({
        reportData: formattedReportData,
        summary: summaryFormatted
      });
      
      wx.hideLoading();
    } catch (error) {
      wx.hideLoading();
      console.error('生成报表失败:', error);
      wx.showToast({
        title: '生成报表失败',
        icon: 'error'
      });
    }
  },

  // 切换详细显示
  onToggleDetail() {
    this.setData({
      showDetail: !this.data.showDetail
    });
  },

  // 导出报表数据
  onExportReport() {
    try {
      const exportData = {
        reportDate: new Date().toISOString().split('T')[0],
        dateRange: this.data.dateRange,
        summary: this.data.summary,
        details: this.data.reportData,
        allData: StorageManager.exportData()
      };
      
      // 在实际小程序中，这里可以调用文件系统API保存数据
      // 或者通过其他方式分享数据
      const dataString = JSON.stringify(exportData, null, 2);
      
      wx.showModal({
        title: '导出数据',
        content: '数据已准备就绪。在实际应用中，这里会保存为文件或分享数据。',
        confirmText: '查看数据',
        success: (res) => {
          if (res.confirm) {
            // 在开发环境中显示数据预览
            console.log('导出数据:', exportData);
            wx.showToast({
              title: '数据已输出到控制台',
              icon: 'success'
            });
          }
        }
      });
    } catch (error) {
      console.error('导出数据失败:', error);
      wx.showToast({
        title: '导出失败',
        icon: 'error'
      });
    }
  },

  // 清空所有数据
  onClearAllData() {
    wx.showModal({
      title: '危险操作',
      content: '确定要清空所有数据吗？此操作不可恢复！建议先导出数据备份。',
      confirmText: '确定清空',
      confirmColor: '#f44336',
      success: (res) => {
        if (res.confirm) {
          wx.showModal({
            title: '最后确认',
            content: '所有物料、库存、出入库记录都将被删除，确定继续吗？',
            confirmText: '确定',
            confirmColor: '#f44336',
            success: (res2) => {
              if (res2.confirm) {
                try {
                  StorageManager.clearAllData();
                  wx.showToast({
                    title: '数据已清空',
                    icon: 'success'
                  });
                  // 重新初始化
                  getApp().initStorage();
                  this.generateReport();
                } catch (error) {
                  console.error('清空数据失败:', error);
                  wx.showToast({
                    title: '清空失败',
                    icon: 'error'
                  });
                }
              }
            }
          });
        }
      }
    });
  },

  // 查看物料详情
  onViewMaterialDetail(e) {
    const item = e.currentTarget.dataset.item;
    
    // 确保数值格式化正确
    const beginningValue = parseFloat(item.beginningValue) || 0;
    const periodInboundValue = parseFloat(item.periodInboundValue) || 0;
    const periodOutboundValue = parseFloat(item.periodOutboundValue) || 0;
    const endingValue = parseFloat(item.endingValue) || 0;
    
    let content = `物料: ${item.materialName}\n`;
    content += `规格: ${item.specification}\n`;
    content += `单位: ${item.unit}\n\n`;
    content += `期初库存: ${item.beginningStock || 0}${item.unit} (¥${beginningValue.toFixed(2)})\n`;
    content += `期间入库: ${item.periodInbound || 0}${item.unit} (¥${periodInboundValue.toFixed(2)})\n`;
    content += `期间出库: ${item.periodOutbound || 0}${item.unit} (¥${periodOutboundValue.toFixed(2)})\n`;
    content += `期末库存: ${item.endingStock || 0}${item.unit} (¥${endingValue.toFixed(2)})`;
    
    wx.showModal({
      title: '物料明细',
      content: content,
      showCancel: false
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.generateReport();
    wx.stopPullDownRefresh();
  }
});
