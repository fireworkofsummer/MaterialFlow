<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# 工料管家 - 微信小程序开发指南

这是一个微信小程序项目，专为库存管理设计。在开发时请遵循以下指导原则：

## 项目架构
- **框架**: 微信小程序原生框架
- **数据存储**: 使用wx.getStorageSync/wx.setStorageSync进行本地存储
- **业务逻辑**: 模块化设计，核心逻辑在utils目录
- **样式规范**: 使用rpx单位，支持响应式设计

## 核心业务逻辑
- **FIFO算法**: 所有出库操作必须严格按照先进先出原则
- **库存批次管理**: 每次入库创建独立批次，支持精确的成本追踪
- **库存预警**: 实时监控库存水平，自动触发预警提醒
- **数据一致性**: 确保所有操作的数据完整性和一致性

## 代码规范
- 使用ES6+语法特性
- 函数命名采用驼峰式，事件处理函数以"on"开头
- 组件样式使用BEM命名规范
- 工具类函数必须添加错误处理和参数验证

## 关键文件说明
- `utils/storage.js`: 数据存储管理工具类
- `utils/inventory.js`: 库存业务逻辑类，包含FIFO算法
- `app.js`: 应用入口，负责初始化存储结构
- 各页面文件夹包含完整的页面逻辑、样式和配置

## 开发注意事项
- 所有数据操作必须通过StorageManager类进行
- FIFO计算使用InventoryManager.executeOutboundFIFO方法
- 表单验证要完整，避免无效数据入库
- 重要操作需要用户确认，防止误操作
- 定期测试数据导出和清空功能

## 性能优化建议
- 大数据量时使用分页或虚拟滚动
- 复杂计算考虑使用Web Worker
- 图片资源使用合适的格式和尺寸
- 避免频繁的存储读写操作
