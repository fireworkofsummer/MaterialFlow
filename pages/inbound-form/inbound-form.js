// 入库表单页面
const StorageManager = require('../../utils/storage.js');
const InventoryManager = require('../../utils/inventory.js');

Page({
  data: {
    form: {
      inboundDate: '',
      supplier: '',
      operator: '',
      remark: '',
      items: []
    },
    materials: [],
    selectedMaterialId: null,
    newItem: {
      materialId: null,
      quantity: '',
      unitPrice: ''
    },
    totalAmount: 0
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
      'form.inboundDate': dateString,
      'form.inboundNumber': this.generateInboundNumber()
    });
  },

  // 生成入库单号
  generateInboundNumber() {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    const timeStr = today.getHours().toString().padStart(2, '0') + 
                   today.getMinutes().toString().padStart(2, '0');
    return `IN${dateStr}${timeStr}`;
  },

  // 加载物料列表
  loadMaterials() {
    try {
      const materials = StorageManager.getMaterials();
      this.setData({ materials });
      
      // 如果有预设的物料ID，设置为默认选择
      if (this.data.selectedMaterialId) {
        this.setData({
          'newItem.materialId': this.data.selectedMaterialId
        });
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
  },

  // 选择物料
  onMaterialChange(e) {
    const materialId = parseInt(this.data.materials[e.detail.value].id);
    this.setData({
      'newItem.materialId': materialId
    });
  },

  // 添加入库明细
  onAddItem() {
    const { materialId, quantity, unitPrice } = this.data.newItem;
    
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
    
    if (!unitPrice || parseFloat(unitPrice) <= 0) {
      wx.showToast({
        title: '请输入有效单价',
        icon: 'none'
      });
      return;
    }
    
    // 检查是否已添加相同物料
    const existingIndex = this.data.form.items.findIndex(item => item.materialId === materialId);
    const material = this.data.materials.find(m => m.id === materialId);
    const quantityNum = parseFloat(quantity);
    const unitPriceNum = parseFloat(unitPrice);
    
    const newItemData = {
      materialId,
      materialName: material.name,
      specification: material.specification,
      unit: material.unit,
      quantity: quantityNum,
      unitPrice: unitPriceNum,
      totalPrice: quantityNum * unitPriceNum
    };
    
    if (existingIndex >= 0) {
      // 累加数量
      wx.showModal({
        title: '物料已存在',
        content: '该物料已在列表中，是否累加数量？',
        success: (res) => {
          if (res.confirm) {
            const items = [...this.data.form.items];
            items[existingIndex].quantity += quantityNum;
            items[existingIndex].totalPrice = items[existingIndex].quantity * items[existingIndex].unitPrice;
            
            this.setData({
              'form.items': items
            });
            this.calculateTotal();
            this.resetNewItem();
          }
        }
      });
    } else {
      // 添加新项目
      const items = [...this.data.form.items, newItemData];
      this.setData({
        'form.items': items
      });
      this.calculateTotal();
      this.resetNewItem();
    }
  },

  // 删除入库明细
  onDeleteItem(e) {
    const index = e.currentTarget.dataset.index;
    const items = this.data.form.items.filter((_, i) => i !== index);
    this.setData({
      'form.items': items
    });
    this.calculateTotal();
  },

  // 重置新增项目表单
  resetNewItem() {
    this.setData({
      newItem: {
        materialId: this.data.selectedMaterialId || null,
        quantity: '',
        unitPrice: ''
      }
    });
  },

  // 计算总金额
  calculateTotal() {
    const total = this.data.form.items.reduce((sum, item) => sum + item.totalPrice, 0);
    this.setData({ totalAmount: total });
  },

  // 表单验证
  validateForm() {
    const { inboundDate, items } = this.data.form;
    
    if (!inboundDate) {
      wx.showToast({
        title: '请选择入库日期',
        icon: 'none'
      });
      return false;
    }
    
    if (items.length === 0) {
      wx.showToast({
        title: '请添加入库明细',
        icon: 'none'
      });
      return false;
    }
    
    return true;
  },

  // 保存入库单
  onSave() {
    if (!this.validateForm()) {
      return;
    }
    
    wx.showLoading({
      title: '保存中...'
    });
    
    try {
      const inboundData = {
        ...this.data.form,
        inboundNumber: this.data.form.inboundNumber || this.generateInboundNumber(),
        totalAmount: this.data.totalAmount
      };
      
      // 处理入库
      const result = InventoryManager.processInbound(inboundData);
      
      wx.hideLoading();
      
      if (result.success) {
        wx.showToast({
          title: '入库成功',
          icon: 'success'
        });
        
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({
          title: result.error || '入库失败',
          icon: 'error'
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('保存入库单失败:', error);
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
