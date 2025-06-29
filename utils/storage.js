// 数据存储管理工具类
class StorageManager {
  // 物料相关
  static getMaterials() {
    return wx.getStorageSync('materials') || [];
  }

  static saveMaterials(materials) {
    wx.setStorageSync('materials', materials);
  }

  static addMaterial(material) {
    const materials = this.getMaterials();
    const nextId = wx.getStorageSync('nextMaterialId') || 1;
    material.id = nextId;
    material.createTime = new Date().toISOString();
    materials.push(material);
    this.saveMaterials(materials);
    wx.setStorageSync('nextMaterialId', nextId + 1);
    return material;
  }

  static updateMaterial(materialId, updates) {
    const materials = this.getMaterials();
    const index = materials.findIndex(m => m.id === materialId);
    if (index !== -1) {
      materials[index] = { ...materials[index], ...updates };
      this.saveMaterials(materials);
      return materials[index];
    }
    return null;
  }

  static deleteMaterial(materialId) {
    const materials = this.getMaterials();
    const filtered = materials.filter(m => m.id !== materialId);
    this.saveMaterials(filtered);
    // 同时删除相关的库存批次
    this.deleteStockBatchesByMaterial(materialId);
  }

  // 库存批次相关
  static getStockBatches() {
    return wx.getStorageSync('stockBatches') || [];
  }

  static saveStockBatches(batches) {
    wx.setStorageSync('stockBatches', batches);
  }

  static addStockBatch(batch) {
    const batches = this.getStockBatches();
    const nextId = wx.getStorageSync('nextBatchId') || 1;
    batch.id = nextId;
    batch.createTime = new Date().toISOString();
    batches.push(batch);
    this.saveStockBatches(batches);
    wx.setStorageSync('nextBatchId', nextId + 1);
    return batch;
  }

  static updateStockBatch(batchId, updates) {
    const batches = this.getStockBatches();
    const index = batches.findIndex(b => b.id === batchId);
    if (index !== -1) {
      batches[index] = { ...batches[index], ...updates };
      this.saveStockBatches(batches);
      return batches[index];
    }
    return null;
  }

  static deleteStockBatchesByMaterial(materialId) {
    const batches = this.getStockBatches();
    const filtered = batches.filter(b => b.materialId !== materialId);
    this.saveStockBatches(filtered);
  }

  // 入库记录相关
  static getInboundRecords() {
    return wx.getStorageSync('inboundRecords') || [];
  }

  static saveInboundRecords(records) {
    wx.setStorageSync('inboundRecords', records);
  }

  static addInboundRecord(record) {
    const records = this.getInboundRecords();
    const nextId = wx.getStorageSync('nextInboundId') || 1;
    record.id = nextId;
    record.createTime = new Date().toISOString();
    records.push(record);
    this.saveInboundRecords(records);
    wx.setStorageSync('nextInboundId', nextId + 1);
    return record;
  }

  // 出库记录相关
  static getOutboundRecords() {
    return wx.getStorageSync('outboundRecords') || [];
  }

  static saveOutboundRecords(records) {
    wx.setStorageSync('outboundRecords', records);
  }

  static addOutboundRecord(record) {
    const records = this.getOutboundRecords();
    const nextId = wx.getStorageSync('nextOutboundId') || 1;
    record.id = nextId;
    record.createTime = new Date().toISOString();
    records.push(record);
    this.saveOutboundRecords(records);
    wx.setStorageSync('nextOutboundId', nextId + 1);
    return record;
  }

  // 数据导出
  static exportData() {
    return {
      materials: this.getMaterials(),
      stockBatches: this.getStockBatches(),
      inboundRecords: this.getInboundRecords(),
      outboundRecords: this.getOutboundRecords(),
      exportTime: new Date().toISOString()
    };
  }

  // 数据导入
  static importData(data) {
    try {
      if (data.materials) this.saveMaterials(data.materials);
      if (data.stockBatches) this.saveStockBatches(data.stockBatches);
      if (data.inboundRecords) this.saveInboundRecords(data.inboundRecords);
      if (data.outboundRecords) this.saveOutboundRecords(data.outboundRecords);
      return true;
    } catch (error) {
      console.error('数据导入失败:', error);
      return false;
    }
  }

  // 清空所有数据
  static clearAllData() {
    wx.removeStorageSync('materials');
    wx.removeStorageSync('stockBatches');
    wx.removeStorageSync('inboundRecords');
    wx.removeStorageSync('outboundRecords');
    wx.removeStorageSync('nextMaterialId');
    wx.removeStorageSync('nextInboundId');
    wx.removeStorageSync('nextOutboundId');
    wx.removeStorageSync('nextBatchId');
  }
}

module.exports = StorageManager;
