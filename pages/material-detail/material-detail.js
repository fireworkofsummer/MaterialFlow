// 物料详情页面
const StorageManager = require('../../utils/storage.js');
const InventoryManager = require('../../utils/inventory.js');

Page({
  data: {
    materialId: null,
    material: null,
    currentStock: 0,
    currentValue: 0,
    stockBatches: [],
    isLowStock: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({
        materialId: parseInt(options.id)
      });
      this.loadMaterialDetail();
    }
  },

  // 加载物料详情
  loadMaterialDetail() {
    try {
      const materials = StorageManager.getMaterials();
      const material = materials.find(m => m.id === this.data.materialId);
      
      if (!material) {
        wx.showToast({
          title: '物料不存在',
          icon: 'error'
        });
        wx.navigateBack();
        return;
      }
      
      // 获取当前库存信息
      const currentStock = InventoryManager.getCurrentStock(material.id);
      const currentValue = InventoryManager.getCurrentStockValue(material.id);
      const isLowStock = material.minStockAlert && currentStock < material.minStockAlert;
      
      // 获取库存批次信息
      const stockBatches = InventoryManager.getMaterialBatches(material.id);
      
      this.setData({
        material,
        currentStock,
        currentValue,
        stockBatches,
        isLowStock
      });
    } catch (error) {
      console.error('加载物料详情失败:', error);
      wx.showToast({
        title: '数据加载失败',
        icon: 'error'
      });
    }
  },

  // 编辑物料
  onEditMaterial() {
    wx.navigateTo({
      url: `/pages/material-form/material-form?id=${this.data.materialId}`
    });
  },

  // 删除物料
  onDeleteMaterial() {
    if (this.data.currentStock > 0) {
      wx.showModal({
        title: '无法删除',
        content: `当前还有 ${this.data.currentStock}${this.data.material.unit} 库存，无法删除。请先清空库存后再删除。`,
        showCancel: false
      });
      return;
    }
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除物料 "${this.data.material.name}" 吗？此操作不可恢复。`,
      success: (res) => {
        if (res.confirm) {
          try {
            StorageManager.deleteMaterial(this.data.materialId);
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });
            wx.navigateBack();
          } catch (error) {
            console.error('删除物料失败:', error);
            wx.showToast({
              title: '删除失败',
              icon: 'error'
            });
          }
        }
      }
    });
  },

  // 入库
  onInbound() {
    wx.navigateTo({
      url: `/pages/inbound-form/inbound-form?materialId=${this.data.materialId}`
    });
  },

  // 出库
  onOutbound() {
    if (this.data.currentStock <= 0) {
      wx.showToast({
        title: '暂无库存',
        icon: 'none'
      });
      return;
    }
    
    wx.navigateTo({
      url: `/pages/outbound-form/outbound-form?materialId=${this.data.materialId}`
    });
  },

  // 查看批次详情
  onViewBatch(e) {
    const batch = e.currentTarget.dataset.batch;
    wx.showModal({
      title: '批次详情',
      content: `入库日期: ${batch.inboundDate.split('T')[0]}\n原始数量: ${batch.originalQuantity}${this.data.material.unit}\n剩余数量: ${batch.remainingQuantity}${this.data.material.unit}\n单价: ¥${batch.unitPrice}\n供应商: ${batch.supplier || '未填写'}`,
      showCancel: false
    });
  },

  onShow() {
    // 页面显示时刷新数据
    if (this.data.materialId) {
      this.loadMaterialDetail();
    }
  }
});
