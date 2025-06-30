// 物料管理页面
const StorageManager = require('../../utils/storage.js');
const InventoryManager = require('../../utils/inventory.js');

Page({
  data: {
    materials: [],
    searchKeyword: '',
    filteredMaterials: [],
    selectedCategory: 'all',
    categories: ['all', '钢材', '水泥', '砂石', '木材', '管材', '其他']
  },

  onLoad() {
    this.loadMaterials();
  },

  onShow() {
    this.loadMaterials();
  },

  // 加载物料数据
  loadMaterials() {
    try {
      const materials = StorageManager.getMaterials();
      
      // 为每个物料添加当前库存信息
      const materialsWithStock = materials.map(material => {
        const currentStock = InventoryManager.getCurrentStock(material.id);
        const currentValue = InventoryManager.getCurrentStockValue(material.id);
        const isLowStock = material.minStockAlert && currentStock < material.minStockAlert;
        
        return {
          ...material,
          currentStock,
          currentValue: parseFloat(currentValue) || 0,
          currentValueFormatted: (parseFloat(currentValue) || 0).toFixed(2),
          isLowStock
        };
      });
      
      this.setData({
        materials: materialsWithStock
      });
      
      this.filterMaterials();
    } catch (error) {
      console.error('加载物料数据失败:', error);
      wx.showToast({
        title: '数据加载失败',
        icon: 'error'
      });
    }
  },

  // 搜索物料
  onSearchInput(e) {
    this.setData({
      searchKeyword: e.detail.value
    });
    this.filterMaterials();
  },

  // 选择分类
  onCategoryChange(e) {
    this.setData({
      selectedCategory: this.data.categories[e.detail.value]
    });
    this.filterMaterials();
  },

  // 过滤物料
  filterMaterials() {
    let filtered = this.data.materials;
    
    // 按关键词过滤
    if (this.data.searchKeyword) {
      const keyword = this.data.searchKeyword.toLowerCase();
      filtered = filtered.filter(material => 
        material.name.toLowerCase().includes(keyword) ||
        material.specification.toLowerCase().includes(keyword) ||
        (material.category && material.category.toLowerCase().includes(keyword))
      );
    }
    
    // 按分类过滤
    if (this.data.selectedCategory !== 'all') {
      filtered = filtered.filter(material => 
        material.category === this.data.selectedCategory
      );
    }
    
    // 按库存状态排序（低库存在前）
    filtered.sort((a, b) => {
      if (a.isLowStock && !b.isLowStock) return -1;
      if (!a.isLowStock && b.isLowStock) return 1;
      return a.name.localeCompare(b.name);
    });
    
    this.setData({
      filteredMaterials: filtered
    });
  },

  // 查看物料详情
  onViewDetail(e) {
    const materialId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/material-detail/material-detail?id=${materialId}`
    });
  },

  // 编辑物料
  onEditMaterial(e) {
    const materialId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/material-form/material-form?id=${materialId}`
    });
  },

  // 删除物料
  onDeleteMaterial(e) {
    const materialId = e.currentTarget.dataset.id;
    const material = this.data.materials.find(m => m.id === materialId);
    
    if (!material) return;
    
    // 检查是否有库存
    const currentStock = InventoryManager.getCurrentStock(materialId);
    if (currentStock > 0) {
      wx.showModal({
        title: '无法删除',
        content: `物料 "${material.name}" 当前还有 ${currentStock}${material.unit} 库存，无法删除。请先清空库存后再删除。`,
        showCancel: false
      });
      return;
    }
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除物料 "${material.name}" 吗？此操作不可恢复。`,
      success: (res) => {
        if (res.confirm) {
          try {
            StorageManager.deleteMaterial(materialId);
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });
            this.loadMaterials();
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

  // 添加新物料
  onAddMaterial() {
    wx.navigateTo({
      url: '/pages/material-form/material-form'
    });
  },

  // 快速入库
  onQuickInbound(e) {
    const materialId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/inbound-form/inbound-form?materialId=${materialId}`
    });
  },

  // 快速出库
  onQuickOutbound(e) {
    const materialId = e.currentTarget.dataset.id;
    const currentStock = InventoryManager.getCurrentStock(materialId);
    
    if (currentStock <= 0) {
      wx.showToast({
        title: '暂无库存',
        icon: 'none'
      });
      return;
    }
    
    wx.navigateTo({
      url: `/pages/outbound-form/outbound-form?materialId=${materialId}`
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadMaterials();
    wx.stopPullDownRefresh();
  }
});
