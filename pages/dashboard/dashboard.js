// 仪表盘页面
const StorageManager = require('../../utils/storage.js');
const InventoryManager = require('../../utils/inventory.js');

Page({
  data: {
    totalStockValue: 0,
    totalMaterials: 0,
    totalWarnings: 0,
    warnings: [],
    quickStats: {
      todayInbound: 0,
      todayOutbound: 0,
      lowStockCount: 0
    }
  },

  onLoad() {
    this.loadDashboardData();
  },

  onShow() {
    // 每次显示页面都刷新数据
    this.loadDashboardData();
  },

  // 加载仪表盘数据
  loadDashboardData() {
    try {
      // 获取库存总价值
      const totalStockValue = InventoryManager.getTotalStockValue();
      
      // 获取物料总数
      const materials = StorageManager.getMaterials();
      const totalMaterials = materials.length;
      
      // 获取库存预警
      const warnings = InventoryManager.getStockWarnings();
      const totalWarnings = warnings.length;
      
      // 获取今日统计
      const today = new Date().toISOString().split('T')[0];
      const quickStats = this.calculateQuickStats(today);
      
      this.setData({
        totalStockValue: (parseFloat(totalStockValue) || 0).toFixed(2),
        totalMaterials,
        totalWarnings,
        warnings: warnings.slice(0, 5), // 只显示前5个预警
        quickStats
      });
    } catch (error) {
      console.error('加载仪表盘数据失败:', error);
      wx.showToast({
        title: '数据加载失败',
        icon: 'error'
      });
    }
  },

  // 计算快速统计数据
  calculateQuickStats(date) {
    const inboundRecords = StorageManager.getInboundRecords();
    const outboundRecords = StorageManager.getOutboundRecords();
    
    const todayInbound = inboundRecords.filter(record => 
      record.inboundDate.startsWith(date)
    ).length;
    
    const todayOutbound = outboundRecords.filter(record => 
      record.outboundDate.startsWith(date)
    ).length;
    
    const warnings = InventoryManager.getStockWarnings();
    const lowStockCount = warnings.length;
    
    return {
      todayInbound,
      todayOutbound,
      lowStockCount
    };
  },

  // 快速入库
  onQuickInbound() {
    wx.navigateTo({
      url: '/pages/inbound-form/inbound-form'
    });
  },

  // 快速出库
  onQuickOutbound() {
    wx.navigateTo({
      url: '/pages/outbound-form/outbound-form'
    });
  },

  // 查看所有预警
  onViewAllWarnings() {
    if (this.data.warnings.length === 0) {
      wx.showToast({
        title: '暂无库存预警',
        icon: 'none'
      });
      return;
    }
    
    wx.showModal({
      title: '库存预警列表',
      content: this.data.warnings.map(w => 
        `${w.materialName}: 剩余${w.currentStock}${w.unit}, 预警线${w.minStockAlert}${w.unit}`
      ).join('\n'),
      showCancel: false
    });
  },

  // 查看物料详情
  onViewMaterial(e) {
    const materialId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/material-detail/material-detail?id=${materialId}`
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadDashboardData();
    wx.stopPullDownRefresh();
  }
});
