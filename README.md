# 账单通 BillHub - 微信记账小程序

## 项目概述

账单通（BillHub）是一款基于微信小程序原生框架开发的个人记账工具，支持微信支付/支付宝账单自动同步、自定义分类管理、收支统计分析等核心功能。

## 项目结构

```
BillHub/
├── app.js                          # 应用入口，初始化系统数据
├── app.json                        # 应用配置，注册页面/组件/导航
├── app.wxss                        # 全局样式
├── project.config.json             # 项目配置
├── sitemap.json                    # 小程序 sitemap
├── images/                         # 图标资源（占位）
├── utils/
│   ├── storage.js                  # 本地存储模块（账单/分类数据读写）
│   ├── util.js                     # 通用工具函数
│   ├── api.js                      # API接口对接（微信/支付宝账单同步）
│   └── mock.js                     # 模拟数据生成（开发阶段使用）
├── components/
│   ├── bill-card/                  # 账单卡片组件
│   ├── stat-card/                  # 统计概览组件
│   └── empty-state/               # 空状态占位组件
└── pages/
    ├── index/                      # 首页（数据概览、同步入口、近期账单）
    ├── bills/                      # 账单列表页（筛选、批量操作）
    ├── categories/                 # 分类管理页（系统/自定义分类编辑）
    ├── profile/                    # 个人中心（授权管理、数据设置）
    └── bill-edit/                  # 账单编辑页（新增/编辑单笔账单）
```

## 部署步骤

### 1. 导入项目

1. 打开微信开发者工具
2. 点击"导入项目" -> 选择本项目根目录
3. 填入 AppID（可使用测试号 `wx0000000000000000` 或替换为正式 AppID）
4. 点击"导入"

### 2. 配置 AppID

修改 `project.config.json` 中的 `appid` 为你的微信小程序 AppID：

```json
{
  "appid": "wx你的AppID"
}
```

### 3. 替换图标（可选）

`images/` 目录下为占位 PNG 图标，建议替换为实际设计稿图标：
- `home.png` / `home-active.png`
- `bill.png` / `bill-active.png`
- `category.png` / `category-active.png`
- `profile.png` / `profile-active.png`

### 4. 配置后端 API（正式环境）

修改 `utils/api.js` 中的 `CONFIG.BASE_URL` 为实际后端服务地址：

```js
const CONFIG = {
  BASE_URL: 'https://your-api-domain.com/v1',
  WECHAT_APPID: 'wx你的AppID',
  TIMEOUT: 10000
}
```

### 5. 预览/调试

- 使用微信开发者工具的"预览"功能扫码在手机上体验
- 首次启动会自动初始化系统分类并生成 60 条模拟账单数据

## 功能使用说明

### 首页（pages/index/）
- **数据概览**：今日/本周/本月收支统计，月度趋势图
- **同步账单**：点击"同步"按钮，选择微信或支付宝同步账单记录
- **记一笔**：点击右上角"+ 记一笔"手动添加账单
- **近期账单**：最近 5 条账单预览，点击可编辑

### 账单页（pages/bills/）
- **筛选**：按支出/收入类型、分类、日期筛选账单
- **批量操作**：进入批量模式，可批量修改分类或删除
- **长按操作**：长按账单可编辑或删除
- **排序**：按时间倒序排列

### 分类管理页（pages/categories/）
- **系统分类**：预置 11 个支出分类 + 5 个收入分类，仅可调整排序
- **自定义分类**：新增、编辑名称、删除、调整排序
- 删除自定义分类后，已使用该分类的账单自动变为"未分类"

### 个人中心（pages/profile/）
- **授权管理**：微信支付/支付宝授权绑定
- **数据设置**：自动同步开关、同步间隔配置、立即同步、导出数据
- **清除数据**：恢复出厂设置

### 记账（pages/bill-edit/）
- 选择类型：支出/收入/转账
- 输入金额、选择分类、设置日期时间
- 支持选择来源（手动/微信/支付宝）
- 支持备注输入

## 接口对接注意事项

### 微信支付账单同步

`utils/api.js` - `syncWechatBills(cursor)`

对接流程：
1. 前端调用 `wx.login()` 获取临时 code
2. 后端使用 code + session_key 获取 openid
3. 后端调用微信支付"交易账单"API（`https://api.mch.weixin.qq.com/v3/bill/tradebill`）
4. 根据 cursor（时间戳游标）增量拉取账单
5. 解析返回的账单文件，组装为统一数据结构

### 支付宝账单同步

`utils/api.js` - `syncAlipayBills(cursor)`

对接流程：
1. 前端调用支付宝 `my.getAuthCode()` 获取授权码
2. 后端使用支付宝"账单查询"接口（`alipay.data.bill.detail.query`）
3. 根据 cursor 增量拉取交易记录
4. 注意支付宝账单接口需要企业版支付宝账号权限

### 本地缓存策略

`utils/storage.js` - 数据持久化逻辑：

- **账单存储**：以数组形式存储于 `wx.getStorageSync('billhub_bills')`
- **分类存储**：以对象 `{ expense: [], income: [] }` 存储
- **同步游标**：每次同步成功后更新 `billhub_sync_cursor`（时间戳）
- **缓存去重**：根据 `id` 字段去重，自动同步的账单 id 前缀为 `sync_`

### 关键数据结构

```js
// 账单
{
  id: 'bill_1689000000000_xxxxx',
  type: 'expense' | 'income' | 'transfer',
  amount: -128.50,          // 负数为支出，正数为收入
  category: 'sys_exp_01',   // 分类ID
  categoryName: '餐饮',
  categoryIcon: '🍜',
  date: '2026-06-09T12:00:00.000Z',
  source: 'wechat' | 'alipay' | 'manual',
  remark: '午餐',
  syncSource: 'wechat',      // 同步来源（手动记账为 null）
  createdAt: '...',
  updatedAt: '...'
}

// 分类
{
  id: 'sys_exp_01' | 'cus_exp_1689000000000',
  name: '餐饮',
  icon: '🍜',
  type: 'expense' | 'income',
  isSystem: true,            // 系统预置 vs 自定义
  sortOrder: 1
}
```

## 开发环境

- 微信开发者工具稳定版
- 基础库版本 >= 3.3.0
- 无需额外 npm 依赖

## 注意事项

1. 当前版本使用模拟数据（`utils/mock.js`），接入真实后端后需替换 `utils/api.js` 中的请求实现
2. 微信支付/支付宝账单同步需要相应的商户平台权限
3. 所有数据存储在用户本地，清除微信缓存会导致数据丢失
4. 建议定期导出数据备份
