# 工料管家 - 微信小程序库存管理系统

这是一个专为小型工程队、装修公司或个人作坊设计的库存管理微信小程序。采用本地存储技术，实现离线可用的库存管理功能。

## 核心特性

- **本地存储**: 所有数据存储在小程序本地，离线可用
- **FIFO成本核算**: 严格按照"先进先出"原则进行成本计算
- **库存预警**: 自动监控库存水平，及时提醒补货
- **完整的出入库管理**: 支持批次管理和成本追踪
- **数据报表**: 提供详细的库存报表和统计分析
- **数据导出**: 支持数据备份和迁移

## 主要功能模块

### 1. 仪表盘 (首页)
- 库存总价值实时显示
- 库存预警提醒
- 快捷操作入口
- 今日概览统计

### 2. 物料管理
- 物料信息的增删改查
- 实时库存数量和价值显示
- 库存预警设置
- 批次详情查看

### 3. 入库管理
- 入库单创建和管理
- 支持多物料批量入库
- 自动生成库存批次
- 供应商信息记录

### 4. 出库管理
- 出库单创建和管理
- 自动FIFO成本计算
- 实时成本预览
- 批次消耗明细

### 5. 数据报表
- 物料出入库汇总表
- 库存价值统计
- 数据导出功能
- 清空数据管理

## 技术特点

### 本地存储架构
- 使用微信小程序Storage API
- 数据结构化存储，支持复杂查询
- 自动ID生成，确保数据一致性
- 完整的数据备份和恢复机制

### FIFO算法实现
```javascript
// 核心FIFO出库算法
static executeOutboundFIFO(materialId, requiredQuantity) {
  // 获取所有可用批次，按入库日期排序
  const availableBatches = batches
    .filter(b => b.materialId === materialId && b.remainingQuantity > 0)
    .sort((a, b) => new Date(a.inboundDate) - new Date(b.inboundDate));
  
  // 按FIFO原则消耗库存
  for (let batch of availableBatches) {
    // 计算本批次消耗量
    const consumeFromThisBatch = Math.min(batch.remainingQuantity, remainingToConsume);
    // 更新批次剩余量
    batch.remainingQuantity -= consumeFromThisBatch;
    // 记录消耗明细...
  }
}
```

### 数据结构设计

#### 物料表结构
```javascript
{
  id: number,
  name: string,           // 物料名称
  specification: string,  // 规格型号
  unit: string,          // 单位
  category: string,      // 分类
  minStockAlert: number, // 最低库存预警
  supplier: string,      // 供应商
  remark: string,        // 备注
  createTime: string     // 创建时间
}
```

#### 库存批次表结构
```javascript
{
  id: number,
  materialId: number,        // 物料ID
  inboundRecordId: number,   // 入库记录ID
  inboundDate: string,       // 入库日期
  originalQuantity: number,  // 原始数量
  remainingQuantity: number, // 剩余数量
  unitPrice: number,         // 单价
  supplier: string,          // 供应商
  createTime: string         // 创建时间
}
```

## 使用指南

### 首次使用
1. 打开小程序，系统自动初始化存储结构
2. 在物料管理中添加第一个物料
3. 设置库存预警线（可选）
4. 进行首次入库操作

### 日常操作流程
1. **入库**: 选择物料 → 输入数量和单价 → 保存入库单
2. **出库**: 选择物料 → 输入数量 → 查看FIFO成本预览 → 确认出库
3. **查看报表**: 选择日期范围 → 生成库存报表 → 导出数据（可选）

### 库存预警设置
- 在物料管理中为每个物料设置最低库存预警数量
- 当库存低于预警线时，系统会在仪表盘显示预警信息
- 支持批量查看所有预警物料

### 数据备份与恢复
```javascript
// 导出所有数据
const exportData = StorageManager.exportData();

// 导入数据（恢复）
const success = StorageManager.importData(backupData);
```

## 开发部署

### 环境要求
- 微信开发者工具
- 小程序基础库版本 2.0+

### 部署步骤
1. 下载项目源码
2. 在微信开发者工具中打开项目
3. 配置小程序AppID（project.config.json）
4. 编译预览或上传发布

### 自定义配置
- 修改 `app.json` 中的页面配置
- 调整 `app.wxss` 中的全局样式
- 根据需求修改物料分类和单位选项

## 注意事项

### 数据安全
- 所有数据存储在设备本地，建议定期导出备份
- 卸载小程序会导致数据丢失，请提前备份
- 清空数据操作不可恢复，请谨慎使用

### 性能优化
- 大量数据时建议定期清理历史记录
- 批次数据过多时可能影响计算性能
- 建议单次操作的物料数量不超过100种

### 限制说明
- 受小程序存储限制，建议数据量控制在10MB以内
- FIFO计算复杂度与批次数量成正比
- 不支持多设备数据同步

## 版本更新

### v1.0.0 (当前版本)
- 实现核心的库存管理功能
- FIFO成本核算算法
- 完整的出入库管理
- 基础报表功能
- 数据导出备份

### 后续规划
- 批量操作优化
- 更多报表类型
- 数据云同步支持
- 条码扫描功能

## 技术支持

如有问题或建议，请通过以下方式联系：
- 在项目Issues中提交问题
- 发送邮件至开发团队
- 微信小程序内反馈功能

---

**工料管家** - 让库存管理更简单高效
