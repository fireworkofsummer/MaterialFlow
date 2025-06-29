// 物料表单页面
const StorageManager = require('../../utils/storage.js');

Page({
  data: {
    materialId: null,
    isEdit: false,
    form: {
      name: '',
      specification: '',
      unit: '',
      category: '',
      minStockAlert: '',
      supplier: '',
      remark: ''
    },
    units: ['个', '根', '米', '吨', '袋', '箱', '卷', '块', '套', '张'],
    categories: ['钢材', '水泥', '砂石', '木材', '管材', '电料', '五金', '其他']
  },

  onLoad(options) {
    if (options.id) {
      this.setData({
        materialId: parseInt(options.id),
        isEdit: true
      });
      this.loadMaterial();
    }
    
    // 设置页面标题
    wx.setNavigationBarTitle({
      title: this.data.isEdit ? '编辑物料' : '新增物料'
    });
  },

  // 加载物料数据（编辑模式）
  loadMaterial() {
    try {
      const materials = StorageManager.getMaterials();
      const material = materials.find(m => m.id === this.data.materialId);
      
      if (material) {
        this.setData({
          form: {
            name: material.name || '',
            specification: material.specification || '',
            unit: material.unit || '',
            category: material.category || '',
            minStockAlert: material.minStockAlert ? material.minStockAlert.toString() : '',
            supplier: material.supplier || '',
            remark: material.remark || ''
          }
        });
      }
    } catch (error) {
      console.error('加载物料数据失败:', error);
      wx.showToast({
        title: '数据加载失败',
        icon: 'error'
      });
    }
  },

  // 输入处理
  onInputChange(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({
      [`form.${field}`]: value
    });
  },

  // 选择单位
  onUnitChange(e) {
    const value = this.data.units[e.detail.value];
    this.setData({
      'form.unit': value
    });
  },

  // 选择分类
  onCategoryChange(e) {
    const value = this.data.categories[e.detail.value];
    this.setData({
      'form.category': value
    });
  },

  // 表单验证
  validateForm() {
    const { name, specification, unit } = this.data.form;
    
    if (!name.trim()) {
      wx.showToast({
        title: '请输入物料名称',
        icon: 'none'
      });
      return false;
    }
    
    if (!specification.trim()) {
      wx.showToast({
        title: '请输入规格型号',
        icon: 'none'
      });
      return false;
    }
    
    if (!unit.trim()) {
      wx.showToast({
        title: '请选择单位',
        icon: 'none'
      });
      return false;
    }
    
    // 验证预警数量
    if (this.data.form.minStockAlert) {
      const alertValue = parseFloat(this.data.form.minStockAlert);
      if (isNaN(alertValue) || alertValue < 0) {
        wx.showToast({
          title: '预警数量必须是非负数',
          icon: 'none'
        });
        return false;
      }
    }
    
    return true;
  },

  // 检查物料是否重复
  checkDuplicate() {
    const materials = StorageManager.getMaterials();
    const { name, specification } = this.data.form;
    
    return materials.some(material => {
      // 编辑模式下，排除当前物料
      if (this.data.isEdit && material.id === this.data.materialId) {
        return false;
      }
      return material.name === name.trim() && material.specification === specification.trim();
    });
  },

  // 保存物料
  onSave() {
    if (!this.validateForm()) {
      return;
    }
    
    if (this.checkDuplicate()) {
      wx.showToast({
        title: '物料名称和规格已存在',
        icon: 'none'
      });
      return;
    }
    
    try {
      const materialData = {
        name: this.data.form.name.trim(),
        specification: this.data.form.specification.trim(),
        unit: this.data.form.unit,
        category: this.data.form.category,
        supplier: this.data.form.supplier.trim(),
        remark: this.data.form.remark.trim()
      };
      
      // 处理预警数量
      if (this.data.form.minStockAlert) {
        materialData.minStockAlert = parseFloat(this.data.form.minStockAlert);
      }
      
      if (this.data.isEdit) {
        // 更新物料
        StorageManager.updateMaterial(this.data.materialId, materialData);
        wx.showToast({
          title: '更新成功',
          icon: 'success'
        });
      } else {
        // 新增物料
        StorageManager.addMaterial(materialData);
        wx.showToast({
          title: '添加成功',
          icon: 'success'
        });
      }
      
      // 延迟跳转，让用户看到成功提示
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      
    } catch (error) {
      console.error('保存物料失败:', error);
      wx.showToast({
        title: '保存失败',
        icon: 'error'
      });
    }
  },

  // 取消操作
  onCancel() {
    wx.navigateBack();
  },

  // 重置表单
  onReset() {
    wx.showModal({
      title: '确认重置',
      content: '确定要重置表单内容吗？',
      success: (res) => {
        if (res.confirm) {
          if (this.data.isEdit) {
            this.loadMaterial();
          } else {
            this.setData({
              form: {
                name: '',
                specification: '',
                unit: '',
                category: '',
                minStockAlert: '',
                supplier: '',
                remark: ''
              }
            });
          }
        }
      }
    });
  }
});
