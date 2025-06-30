// 库存管理业务逻辑类
const StorageManager = require('./storage.js');

class InventoryManager {
  // 获取物料的当前总库存数量
  static getCurrentStock(materialId) {
    const batches = StorageManager.getStockBatches();
    const materialBatches = batches.filter(b => 
      b.materialId === materialId && b.remainingQuantity > 0
    );
    return materialBatches.reduce((total, batch) => total + batch.remainingQuantity, 0);
  }

  // 获取物料的当前库存价值
  static getCurrentStockValue(materialId) {
    const batches = StorageManager.getStockBatches();
    const materialBatches = batches.filter(b => 
      b.materialId === materialId && b.remainingQuantity > 0
    );
    return materialBatches.reduce((total, batch) => 
      total + (batch.remainingQuantity * batch.unitPrice), 0
    );
  }

  // 获取所有库存总价值
  static getTotalStockValue() {
    const materials = StorageManager.getMaterials();
    return materials.reduce((total, material) => 
      total + this.getCurrentStockValue(material.id), 0
    );
  }

  // 获取库存预警列表
  static getStockWarnings() {
    const materials = StorageManager.getMaterials();
    const warnings = [];
    
    materials.forEach(material => {
      const currentStock = this.getCurrentStock(material.id);
      if (material.minStockAlert && currentStock < material.minStockAlert) {
        warnings.push({
          materialId: material.id,
          materialName: material.name,
          specification: material.specification,
          unit: material.unit,
          currentStock: currentStock,
          minStockAlert: material.minStockAlert,
          shortage: material.minStockAlert - currentStock
        });
      }
    });
    
    return warnings;
  }

  // 入库操作
  static processInbound(inboundData) {
    try {
      // 保存入库记录
      const inboundRecord = StorageManager.addInboundRecord(inboundData);
      
      // 为每个入库明细创建库存批次
      inboundData.items.forEach(item => {
        const batch = {
          materialId: item.materialId,
          inboundRecordId: inboundRecord.id,
          inboundDate: inboundData.inboundDate,
          originalQuantity: item.quantity,
          remainingQuantity: item.quantity,
          unitPrice: item.unitPrice,
          supplier: inboundData.supplier || '',
          operator: inboundData.operator || ''
        };
        StorageManager.addStockBatch(batch);
      });
      
      return { success: true, record: inboundRecord };
    } catch (error) {
      console.error('入库处理失败:', error);
      return { success: false, error: error.message };
    }
  }

  // FIFO出库操作 - 核心算法
  static processOutbound(outboundData) {
    try {
      const outboundDetails = [];
      let totalCost = 0;
      
      // 验证每个出库项目是否有足够库存
      for (let item of outboundData.items) {
        const currentStock = this.getCurrentStock(item.materialId);
        if (currentStock < item.quantity) {
          const material = StorageManager.getMaterials().find(m => m.id === item.materialId);
          return {
            success: false,
            error: `物料 ${material.name} 库存不足，当前库存：${currentStock}${material.unit}，需要：${item.quantity}${material.unit}`
          };
        }
      }
      
      // 执行FIFO出库
      for (let item of outboundData.items) {
        const fifoResult = this.executeOutboundFIFO(item.materialId, item.quantity);
        if (!fifoResult.success) {
          return fifoResult;
        }
        
        outboundDetails.push({
          materialId: item.materialId,
          quantity: item.quantity,
          batchConsumptions: fifoResult.batchConsumptions,
          totalCost: fifoResult.totalCost
        });
        
        totalCost += fifoResult.totalCost;
      }
      
      // 保存出库记录
      const outboundRecord = {
        ...outboundData,
        items: outboundDetails,
        totalCost: totalCost
      };
      
      const savedRecord = StorageManager.addOutboundRecord(outboundRecord);
      
      return { 
        success: true, 
        record: savedRecord,
        totalCost: totalCost,
        details: outboundDetails
      };
    } catch (error) {
      console.error('出库处理失败:', error);
      return { success: false, error: error.message };
    }
  }

  // 执行FIFO出库算法
  static executeOutboundFIFO(materialId, requiredQuantity) {
    try {
      const batches = StorageManager.getStockBatches();
      // 获取该物料的所有可用批次，按入库日期排序（先进先出）
      const availableBatches = batches
        .filter(b => b.materialId === materialId && b.remainingQuantity > 0)
        .sort((a, b) => new Date(a.inboundDate) - new Date(b.inboundDate));
      
      const batchConsumptions = [];
      let remainingToConsume = requiredQuantity;
      let totalCost = 0;
      
      for (let batch of availableBatches) {
        if (remainingToConsume <= 0) break;
        
        const consumeFromThisBatch = Math.min(batch.remainingQuantity, remainingToConsume);
        const costFromThisBatch = consumeFromThisBatch * batch.unitPrice;
        
        // 记录消耗详情
        batchConsumptions.push({
          batchId: batch.id,
          inboundDate: batch.inboundDate,
          unitPrice: batch.unitPrice,
          consumedQuantity: consumeFromThisBatch,
          cost: costFromThisBatch
        });
        
        // 更新批次剩余数量
        batch.remainingQuantity -= consumeFromThisBatch;
        StorageManager.updateStockBatch(batch.id, { 
          remainingQuantity: batch.remainingQuantity 
        });
        
        totalCost += costFromThisBatch;
        remainingToConsume -= consumeFromThisBatch;
      }
      
      if (remainingToConsume > 0) {
        return {
          success: false,
          error: `库存不足，还需要 ${remainingToConsume} 单位`
        };
      }
      
      return {
        success: true,
        batchConsumptions: batchConsumptions,
        totalCost: totalCost
      };
    } catch (error) {
      console.error('FIFO出库执行失败:', error);
      return { success: false, error: error.message };
    }
  }

  // 模拟FIFO出库计算（不实际扣减库存）
  static simulateOutboundFIFO(materialId, quantity) {
    try {
      if (!materialId || !quantity || quantity <= 0) {
        return {
          success: false,
          error: '参数无效'
        };
      }
      
      const batches = StorageManager.getStockBatches()
        .filter(batch => batch.materialId === materialId && batch.remainingQuantity > 0)
        .sort((a, b) => new Date(a.inboundDate) - new Date(b.inboundDate));
      
      if (batches.length === 0) {
        return {
          success: false,
          error: '无可用库存'
        };
      }
      
      // 计算当前库存
      const currentStock = batches.reduce((sum, batch) => sum + batch.remainingQuantity, 0);
      
      if (quantity > currentStock) {
        return {
          success: false,
          error: `库存不足，当前库存：${currentStock}`
        };
      }
      
      // 模拟FIFO分配（不修改原始数据）
      let remainingQuantity = quantity;
      let totalCost = 0;
      const batchConsumptions = [];
      
      for (const batch of batches) {
        if (remainingQuantity <= 0) break;
        
        const consumedQuantity = Math.min(remainingQuantity, batch.remainingQuantity);
        const cost = consumedQuantity * batch.unitPrice;
        
        batchConsumptions.push({
          batchId: batch.id,
          inboundDate: batch.inboundDate,
          consumedQuantity: consumedQuantity,
          unitPrice: batch.unitPrice,
          cost: cost
        });
        
        totalCost += cost;
        remainingQuantity -= consumedQuantity;
      }
      
      return {
        success: true,
        totalCost: totalCost,
        batchConsumptions: batchConsumptions
      };
      
    } catch (error) {
      console.error('模拟FIFO计算失败:', error);
      return {
        success: false,
        error: '计算失败'
      };
    }
  }

  // 获取物料的库存批次详情
  static getMaterialBatches(materialId) {
    const batches = StorageManager.getStockBatches();
    return batches
      .filter(b => b.materialId === materialId && b.remainingQuantity > 0)
      .sort((a, b) => new Date(a.inboundDate) - new Date(b.inboundDate));
  }

  // 生成库存报表
  static generateStockReport(startDate, endDate) {
    try {
      const materials = StorageManager.getMaterials();
      const inboundRecords = StorageManager.getInboundRecords();
      const outboundRecords = StorageManager.getOutboundRecords();
      const stockBatches = StorageManager.getStockBatches();
      
      const reportData = materials.map(material => {
        // 计算期初库存（开始日期之前的净库存）
        let beginningStock = 0;
        let beginningValue = 0;
        
        // 期初 = 开始日期前的入库 - 开始日期前的出库
        const beforeStartInbound = inboundRecords.filter(record => {
          const recordDate = record.inboundDate.split('T')[0];
          return recordDate < startDate;
        });
        
        const beforeStartOutbound = outboundRecords.filter(record => {
          const recordDate = record.outboundDate.split('T')[0];
          return recordDate < startDate;
        });
        
        // 计算期初入库
        beforeStartInbound.forEach(record => {
          record.items.forEach(item => {
            if (item.materialId === material.id) {
              beginningStock += parseFloat(item.quantity) || 0;
              beginningValue += parseFloat(item.totalPrice) || (item.quantity * item.unitPrice) || 0;
            }
          });
        });
        
        // 减去期初出库
        beforeStartOutbound.forEach(record => {
          record.items.forEach(item => {
            if (item.materialId === material.id) {
              beginningStock -= parseFloat(item.quantity) || 0;
              beginningValue -= parseFloat(item.totalCost) || 0;
            }
          });
        });
        
        // 确保期初库存不为负数
        beginningStock = Math.max(0, beginningStock);
        beginningValue = Math.max(0, beginningValue);
        
        // 计算期间入库
        let periodInbound = 0;
        let periodInboundValue = 0;
        
        const periodInboundRecords = inboundRecords.filter(record => {
          const recordDate = record.inboundDate.split('T')[0];
          return recordDate >= startDate && recordDate <= endDate;
        });
        
        periodInboundRecords.forEach(record => {
          record.items.forEach(item => {
            if (item.materialId === material.id) {
              periodInbound += parseFloat(item.quantity) || 0;
              periodInboundValue += parseFloat(item.totalPrice) || (item.quantity * item.unitPrice) || 0;
            }
          });
        });
        
        // 计算期间出库
        let periodOutbound = 0;
        let periodOutboundValue = 0;
        
        const periodOutboundRecords = outboundRecords.filter(record => {
          const recordDate = record.outboundDate.split('T')[0];
          return recordDate >= startDate && recordDate <= endDate;
        });
        
        periodOutboundRecords.forEach(record => {
          record.items.forEach(item => {
            if (item.materialId === material.id) {
              periodOutbound += parseFloat(item.quantity) || 0;
              periodOutboundValue += parseFloat(item.totalCost) || 0;
            }
          });
        });
        
        // 计算期末库存
        const endingStock = beginningStock + periodInbound - periodOutbound;
        const endingValue = this.getCurrentStockValue(material.id);
        
        return {
          materialId: material.id,
          materialName: material.name,
          specification: material.specification || '',
          unit: material.unit,
          beginningStock: parseFloat(beginningStock.toFixed(3)),
          beginningValue: parseFloat(beginningValue.toFixed(2)),
          periodInbound: parseFloat(periodInbound.toFixed(3)),
          periodInboundValue: parseFloat(periodInboundValue.toFixed(2)),
          periodOutbound: parseFloat(periodOutbound.toFixed(3)),
          periodOutboundValue: parseFloat(periodOutboundValue.toFixed(2)),
          endingStock: parseFloat(endingStock.toFixed(3)),
          endingValue: parseFloat(endingValue) || 0
        };
      });
      
      // 过滤掉所有数据都为0的物料
      return reportData.filter(item => 
        item.beginningStock > 0 || 
        item.periodInbound > 0 || 
        item.periodOutbound > 0 || 
        item.endingStock > 0
      );
      
    } catch (error) {
      console.error('生成库存报表失败:', error);
      return [];
    }
  }

  // 计算指定日期的库存
  static calculateStockAtDate(materialId, date, includeDate = true) {
    const inboundRecords = StorageManager.getInboundRecords();
    const outboundRecords = StorageManager.getOutboundRecords();
    
    const targetDate = new Date(date);
    
    let quantity = 0;
    let value = 0;
    
    // 计算入库
    inboundRecords.forEach(record => {
      const recordDate = new Date(record.inboundDate);
      const shouldInclude = includeDate ? recordDate <= targetDate : recordDate < targetDate;
      
      if (shouldInclude) {
        const item = record.items.find(item => item.materialId === materialId);
        if (item) {
          quantity += item.quantity;
          value += item.quantity * item.unitPrice;
        }
      }
    });
    
    // 计算出库
    outboundRecords.forEach(record => {
      const recordDate = new Date(record.outboundDate);
      const shouldInclude = includeDate ? recordDate <= targetDate : recordDate < targetDate;
      
      if (shouldInclude) {
        const item = record.items.find(item => item.materialId === materialId);
        if (item) {
          quantity -= item.quantity;
          value -= item.totalCost;
        }
      }
    });
    
    return { quantity: Math.max(0, quantity), value: Math.max(0, value) };
  }

  // 计算期间入库
  static calculatePeriodInbound(materialId, startDate, endDate) {
    const inboundRecords = StorageManager.getInboundRecords();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    let quantity = 0;
    let value = 0;
    
    inboundRecords.forEach(record => {
      const recordDate = new Date(record.inboundDate);
      if (recordDate >= start && recordDate <= end) {
        const item = record.items.find(item => item.materialId === materialId);
        if (item) {
          quantity += item.quantity;
          value += item.quantity * item.unitPrice;
        }
      }
    });
    
    return { quantity, value };
  }

  // 计算期间出库
  static calculatePeriodOutbound(materialId, startDate, endDate) {
    const outboundRecords = StorageManager.getOutboundRecords();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    let quantity = 0;
    let value = 0;
    
    outboundRecords.forEach(record => {
      const recordDate = new Date(record.outboundDate);
      if (recordDate >= start && recordDate <= end) {
        const item = record.items.find(item => item.materialId === materialId);
        if (item) {
          quantity += item.quantity;
          value += item.totalCost;
        }
      }
    });
    
    return { quantity, value };
  }
}

module.exports = InventoryManager;
