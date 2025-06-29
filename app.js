// 工料管家 - 库存管理小程序
// app.js
App({
  onLaunch() {
    // 初始化本地存储
    this.initStorage();
    console.log('工料管家启动');
  },

  // 初始化本地存储
  initStorage() {
    // 检查是否首次启动，初始化基础数据结构
    const materials = wx.getStorageSync('materials') || [];
    const inboundRecords = wx.getStorageSync('inboundRecords') || [];
    const outboundRecords = wx.getStorageSync('outboundRecords') || [];
    const stockBatches = wx.getStorageSync('stockBatches') || [];
    
    // 如果是首次启动，设置默认数据
    if (materials.length === 0) {
      wx.setStorageSync('materials', []);
      wx.setStorageSync('inboundRecords', []);
      wx.setStorageSync('outboundRecords', []);
      wx.setStorageSync('stockBatches', []);
      wx.setStorageSync('nextMaterialId', 1);
      wx.setStorageSync('nextInboundId', 1);
      wx.setStorageSync('nextOutboundId', 1);
      wx.setStorageSync('nextBatchId', 1);
    }
  },

  // 全局数据
  globalData: {
    userInfo: null
  }
})
