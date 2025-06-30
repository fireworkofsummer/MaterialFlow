// 出库表单页面 - 包含FIFO成本核算
const StorageManager = require('../../utils/storage.js');
const InventoryManager = require('../../utils/inventory.js');

Page({
  data: {
    form: {
      outboundDate: '',
      recipient: '',
      operator: '',
      remark: '',
      items: []
    },
    materials: [],
    availableMaterials: [],
    availableMaterialOptions: [], // 用于选择器的选项数组
    selectedMaterialId: null,
    selectedMaterialIndex: -1,
    selectedMaterialName: '',
    selectedMaterialStock: 0,
    selectedMaterialUnit: '',
    newItem: {
      materialId: null,
      quantity: ''
    },
    totalCost: 0,
    showCostPreview: false,
    costPreview: null
  },

  onLoad(options) {
    // 如果从其他页面传入了物料ID，预设选择该物料
    if (options.materialId) {
      this.setData({
        selectedMaterialId: parseInt(options.materialId)
      });
    }
    
    this.initForm();
    this.loadMaterials();
  },

  // 初始化表单
  initForm() {
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    
    this.setData({
      'form.outboundDate': dateString,
      'form.outboundNumber': this.generateOutboundNumber()
    });
  },

  // 生成出库单号
  generateOutboundNumber() {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    const timeStr = today.getHours().toString().padStart(2, '0') + 
                   today.getMinutes().toString().padStart(2, '0');
    return `OUT${dateStr}${timeStr}`;
  },

  // 选择物料
  onMaterialChange(e) {
    const materialIndex = parseInt(e.detail.value) - 1; // 减1是因为第一项是"请选择物料"
    
    // 如果选择的是"请选择物料"，则重置状态
    if (materialIndex === -1) {
      this.setData({
        selectedMaterialIndex: -1,
        selectedMaterialName: '',
        selectedMaterialStock: 0,
        selectedMaterialUnit: '',
        'newItem.materialId': null,
        'newItem.quantity': '',
        showCostPreview: false,
        costPreview: null
      });
      return;
    }
    
    const material = this.data.availableMaterials[materialIndex];
    if (material) {
      this.setData({
        selectedMaterialIndex: materialIndex,
        selectedMaterialName: material.name,
        selectedMaterialStock: material.currentStock,
        selectedMaterialUnit: material.unit,
        'newItem.materialId': parseInt(material.id),
        'newItem.quantity': '',
        showCostPreview: false,
        costPreview: null
      });
    }
  },

  // 加载物料列表
  loadMaterials() {
    try {
      const materials = StorageManager.getMaterials();
      
      // 筛选有库存的物料
      const availableMaterials = materials.filter(material => {
        const currentStock = InventoryManager.getCurrentStock(material.id);
        return currentStock > 0;
      }).map(material => {
        const currentStock = InventoryManager.getCurrentStock(material.id);
        return {
          ...material,
          currentStock
        };
      });
      
      // 创建选择器选项数组
      const availableMaterialOptions = ['请选择物料'].concat(availableMaterials.map(m => m.name));
      
      this.setData({ 
        materials,
        availableMaterials,
        availableMaterialOptions
      });
      
      // 如果有预设的物料ID，设置为默认选择
      if (this.data.selectedMaterialId) {
        const materialIndex = availableMaterials.findIndex(m => m.id === this.data.selectedMaterialId);
        if (materialIndex >= 0) {
          const material = availableMaterials[materialIndex];
          this.setData({
            selectedMaterialIndex: materialIndex,
            selectedMaterialName: material.name,
            selectedMaterialStock: material.currentStock,
            selectedMaterialUnit: material.unit,
            'newItem.materialId': this.data.selectedMaterialId
          });
        }
      }
    } catch (error) {
      console.error('加载物料列表失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    }
  },

  // 表单输入处理
  onFormInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [`form.${field}`]: e.detail.value
    });
  },

  // 新增项目输入处理
  onItemInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [`newItem.${field}`]: e.detail.value
    });
    
    // 如果修改了数量，实时计算成本预览
    if (field === 'quantity' && this.data.newItem.materialId) {
      this.previewFIFOCost();
    }
  },

  // 预览FIFO成本计算（仅模拟，不实际出库）
  previewFIFOCost() {
    const { materialId, quantity } = this.data.newItem;
    
    if (!materialId || !quantity || parseFloat(quantity) <= 0) {
      this.setData({
        showCostPreview: false,
        costPreview: null
      });
      return;
    }
    
    const quantityNum = parseFloat(quantity);
    const currentStock = InventoryManager.getCurrentStock(materialId);
    
    if (quantityNum > currentStock) {
      this.setData({
        showCostPreview: false,
        costPreview: {
          error: `库存不足，当前库存：${currentStock}`
        }
      });
      return;
    }
    
    // 仅模拟FIFO计算，不实际扣减库存
    const result = InventoryManager.simulateOutboundFIFO(materialId, quantityNum);
    
    if (result.success) {
      const material = this.data.materials.find(m => m.id === materialId);
      const averagePrice = result.totalCost / quantityNum;
      
      // 处理批次详情格式化
      const batchDetails = result.batchConsumptions.map(batch => ({
        ...batch,
        displayDate: batch.inboundDate.split('T')[0],
        costFormatted: batch.cost.toFixed(2)
      }));
      
      this.setData({
        showCostPreview: true,
        costPreview: {
          materialName: material.name,
          unit: material.unit,
          quantity: quantityNum,
          totalCost: result.totalCost,
          totalCostFormatted: result.totalCost.toFixed(2),
          averagePrice: averagePrice,
          averagePriceFormatted: averagePrice.toFixed(2),
          batchDetails: batchDetails
        }
      });
    } else {
      this.setData({
        showCostPreview: false,
        costPreview: {
          error: result.error
        }
      });
    }
  },

  // 添加出库明细（仅添加到界面列表，不实际出库）
  onAddItem() {
    const { materialId, quantity } = this.data.newItem;
    
    // 验证
    if (!materialId) {
      wx.showToast({
        title: '请选择物料',
        icon: 'none'
      });
      return;
    }
    
    if (!quantity || parseFloat(quantity) <= 0) {
      wx.showToast({
        title: '请输入有效数量',
        icon: 'none'
      });
      return;
    }
    
    const quantityNum = parseFloat(quantity);
    
    // 检查库存是否足够（包括已添加到列表的数量）
    const currentStock = InventoryManager.getCurrentStock(materialId);
    const existingQuantity = this.data.form.items
      .filter(item => item.materialId === materialId)
      .reduce((sum, item) => sum + item.quantity, 0);
    const totalRequiredQuantity = existingQuantity + quantityNum;
    
    if (totalRequiredQuantity > currentStock) {
      wx.showToast({
        title: `库存不足，当前库存：${currentStock}，已选择：${existingQuantity}`,
        icon: 'none'
      });
      return;
    }
    
    // 检查是否已添加相同物料
    const existingIndex = this.data.form.items.findIndex(item => item.materialId === materialId);
    
    if (existingIndex >= 0) {
      wx.showModal({
        title: '物料已存在',
        content: '该物料已在列表中，是否累加数量？',
        success: (res) => {
          if (res.confirm) {
            const items = [...this.data.form.items];
            const newQuantity = items[existingIndex].quantity + quantityNum;
            
            // 仅模拟计算成本，不实际出库
            const result = InventoryManager.simulateOutboundFIFO(materialId, newQuantity);
            if (result.success) {
              items[existingIndex].quantity = newQuantity;
              items[existingIndex].totalCost = result.totalCost;
              items[existingIndex].totalCostFormatted = result.totalCost.toFixed(2);
              items[existingIndex].averageCostFormatted = (result.totalCost / newQuantity).toFixed(2);
              items[existingIndex].batchConsumptions = result.batchConsumptions;
              
              this.setData({
                'form.items': items
              });
              this.calculateTotalCost();
              this.resetNewItem();
            }
          }
        }
      });
    } else {
      // 添加新项目
      const material = this.data.materials.find(m => m.id === materialId);
      
      // 仅模拟计算成本，不实际出库
      const result = InventoryManager.simulateOutboundFIFO(materialId, quantityNum);
      
      if (result.success) {
        const newItemData = {
          materialId,
          materialName: material.name,
          specification: material.specification,
          unit: material.unit,
          quantity: quantityNum,
          totalCost: result.totalCost,
          totalCostFormatted: result.totalCost.toFixed(2),
          averageCostFormatted: (result.totalCost / quantityNum).toFixed(2),
          batchConsumptions: result.batchConsumptions
        };
        
        const items = [...this.data.form.items, newItemData];
        this.setData({
          'form.items': items
        });
        this.calculateTotalCost();
        this.resetNewItem();
      } else {
        wx.showToast({
          title: result.error,
          icon: 'none'
        });
      }
    }
  },

  // 删除出库明细
  onDeleteItem(e) {
    const index = e.currentTarget.dataset.index;
    const items = this.data.form.items.filter((_, i) => i !== index);
    this.setData({
      'form.items': items
    });
    this.calculateTotalCost();
  },

  // 查看项目成本详情
  onViewItemDetail(e) {
    const item = e.currentTarget.dataset.item;
    let content = `物料: ${item.materialName}\n`;
    content += `数量: ${item.quantity}${item.unit}\n`;
    content += `总成本: ¥${item.totalCost.toFixed(2)}\n`;
    content += `平均成本: ¥${(item.totalCost / item.quantity).toFixed(2)}/${item.unit}\n\n`;
    content += `FIFO批次消耗明细:\n`;
    
    item.batchConsumptions.forEach((batch, index) => {
      content += `${index + 1}. ${batch.inboundDate.split('T')[0]}\n`;
      content += `   数量: ${batch.consumedQuantity}${item.unit}\n`;
      content += `   单价: ¥${batch.unitPrice}\n`;
      content += `   成本: ¥${batch.cost.toFixed(2)}\n`;
    });
    
    wx.showModal({
      title: '成本明细',
      content: content,
      showCancel: false
    });
  },

  // 重置新增项目表单
  resetNewItem() {
    this.setData({
      newItem: {
        materialId: this.data.selectedMaterialId || null,
        quantity: ''
      },
      showCostPreview: false,
      costPreview: null
    });
  },

  // 计算总成本
  calculateTotalCost() {
    const totalCost = this.data.form.items.reduce((sum, item) => {
      const itemCost = parseFloat(item.totalCost) || 0;
      return sum + itemCost;
    }, 0);
    
    this.setData({ 
      totalCost: totalCost,
      totalCostFormatted: totalCost.toFixed(2)
    });
  },

  // 表单验证
  validateForm() {
    const { outboundDate, items } = this.data.form;
    
    if (!outboundDate) {
      wx.showToast({
        title: '请选择出库日期',
        icon: 'none'
      });
      return false;
    }
    
    if (items.length === 0) {
      wx.showToast({
        title: '请添加出库明细',
        icon: 'none'
      });
      return false;
    }
    
    return true;
  },

  // 保存出库单（只有在这里才真正执行出库操作）
  onSave() {
    if (!this.validateForm()) {
      return;
    }
    
    wx.showLoading({
      title: '保存中...'
    });
    
    try {
      // 再次验证库存是否足够
      let stockValid = true;
      for (const item of this.data.form.items) {
        const currentStock = InventoryManager.getCurrentStock(item.materialId);
        if (item.quantity > currentStock) {
          stockValid = false;
          wx.hideLoading();
          wx.showToast({
            title: `${item.materialName}库存不足`,
            icon: 'none'
          });
          return;
        }
      }
      
      if (!stockValid) {
        return;
      }
      
      const outboundData = {
        ...this.data.form,
        outboundNumber: this.data.form.outboundNumber || this.generateOutboundNumber(),
        totalCost: this.data.totalCost
      };
      
      // 真正执行出库操作
      const result = InventoryManager.processOutbound(outboundData);
      
      wx.hideLoading();
      
      if (result.success) {
        wx.showToast({
          title: '出库成功',
          icon: 'success'
        });
        
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({
          title: result.error || '出库失败',
          icon: 'error'
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('保存出库单失败:', error);
      wx.showToast({
        title: '保存失败',
        icon: 'error'
      });
    }
  },

  // 取消操作
  onCancel() {
    if (this.data.form.items.length > 0) {
      wx.showModal({
        title: '确认取消',
        content: '已填写的内容将丢失，确定要取消吗？',
        success: (res) => {
          if (res.confirm) {
            wx.navigateBack();
          }
        }
      });
    } else {
      wx.navigateBack();
    }
  }
});
