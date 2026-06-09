# 账单通 BillHub - 微信记账小程序 + 后端服务

## 项目概述

账单通（BillHub）是一款基于微信小程序原生框架开发的个人记账工具，支持微信支付/支付宝账单自动同步、自定义分类管理、收支统计分析等核心功能。配套 Node.js 后端服务提供用户认证、数据持久化和账单同步 API。

## 项目结构

```
BillHub/
├── client/                         # 微信小程序前端
│   ├── app.js / app.json / app.wxss
│   ├── pages/
│   │   ├── index/                  # 首页（数据概览、同步入口、近期账单）
│   │   ├── bills/                  # 账单列表页（筛选、批量操作、个人/家庭切换）
│   │   ├── categories/             # 分类管理页（系统/自定义分类编辑）
│   │   ├── profile/                # 个人中心（授权管理、数据设置、家庭管理）
│   │   ├── bill-edit/              # 账单编辑页（新增/编辑单笔账单）
│   │   └── family/                 # 家庭管理页（创建/加入/成员管理）
│   ├── components/                 # 公共组件
│   ├── utils/                      # 工具函数 + API 对接
│   └── images/                     # 图标资源
├── server/                         # Node.js 后端服务
│   ├── app.js                      # Express 入口
│   ├── config.js                   # 配置
│   ├── routes/                     # API 路由
│   ├── models/                     # 数据模型（JSON 文件数据库）
│   ├── services/                   # 微信/支付宝 SDK 对接
│   └── middleware/                 # JWT 认证
├── project.config.json             # 小程序项目配置（miniprogramRoot: client/）
└── README.md
```

## 部署步骤

## 前端部署（微信小程序）

### 1. 导入项目

打开微信开发者工具 -> 导入项目 -> 选择本项目根目录，填入 AppID（可使用测试号 `wx0000000000000000`），点击导入。

### 2. 配置 AppID

修改 `project.config.json` 中的 `appid` 为你的微信小程序 AppID。

### 3. 预览/调试

- 首次启动会自动初始化系统分类并生成 60 条模拟账单数据
- `client/utils/api.js` 中的 `CONFIG.BASE_URL` 指向后端地址（默认 `http://localhost:3000/api`）

## 后端部署

### 1. 安装依赖

```bash
cd server
npm install
```

### 2. 配置

修改 `server/config.js` 中的微信 AppID/Secret 等配置，或通过环境变量注入。

### 3. 启动

```bash
npm start
```

服务默认监听 `http://localhost:3000`，数据文件存储在 `server/data/billhub.db`（JSON 文件）。

### API 列表

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/login | 微信 code 登录，返回 JWT |
| POST | /api/auth/update-profile | 更新用户资料 |
| GET  | /api/bills | 账单列表（分页、筛选、scope=personal\|family、ownerId） |
| POST | /api/bills | 新增账单 |
| PUT  | /api/bills/:id | 更新账单 |
| DELETE | /api/bills/:id | 删除账单 |
| POST | /api/bills/batch | 批量操作（最多 100 条） |
| POST | /api/bills/sync | 同步微信/支付宝账单 |
| GET  | /api/categories | 获取分类列表 |
| POST | /api/categories | 新增分类 |
| PUT  | /api/categories/:id | 修改分类 |
| DELETE | /api/categories/:id | 删除分类 |
| PUT  | /api/categories/reorder/batch | 批量排序 |
| GET  | /api/family | 获取家庭信息及成员列表 |
| POST | /api/family/create | 创建家庭（返回6位邀请码） |
| POST | /api/family/join | 通过邀请码加入家庭 |
| POST | /api/family/leave | 离开家庭 |
| POST | /api/family/remove/:targetId | 管理员移除成员 |
| GET  | /api/health | 健康检查 |

## 功能使用说明

### 首页（pages/index/）
- **数据概览**：今日/本周/本月收支统计，月度趋势图
- **同步账单**：点击"同步"按钮，选择微信或支付宝同步账单记录
- **记一笔**：点击右上角"+ 记一笔"手动添加账单
- **近期账单**：最近 5 条账单预览，点击可编辑
- **家庭模式**：已加入家庭的用户可在顶部切换"个人/家庭"范围，家庭维度显示全家人汇总

### 账单页（pages/bills/）
- **筛选**：按支出/收入类型、分类、日期筛选账单
- **批量操作**：进入批量模式，可批量修改分类或删除
- **长按操作**：长按账单可编辑或删除
- **排序**：按时间倒序排列
- **个人/家庭切换**：顶部切换器可查看个人账单或全家人账单（含 ownerName）

### 分类管理页（pages/categories/）
- **系统分类**：预置 11 个支出分类 + 5 个收入分类，仅可调整排序
- **自定义分类**：新增、编辑名称、删除、调整排序
- 删除自定义分类后，已使用该分类的账单自动变为"未分类"

### 个人中心（pages/profile/）
- **授权管理**：微信支付/支付宝授权绑定
- **家庭管理**：创建家庭（生成6位邀请码）、加入家庭（输入邀请码）、查看成员、管理员可移除成员、离开家庭
- **数据设置**：自动同步开关、同步间隔配置、立即同步、导出数据
- **清除数据**：恢复出厂设置

### 家庭管理（pages/family/）
- **创建家庭**：输入家庭名称，生成唯一6位字母数字邀请码，创建者自动成为管理员
- **加入家庭**：输入邀请码加入已有家庭
- **成员列表**：显示所有成员昵称、账单数、角色（管理员/成员）
- **邀请码复制**：点击邀请码区域复制到剪贴板，分享给家人
- **权限控制**：仅管理员可移除成员；成员可自行离开家庭；最后一人离开时家庭自动解散
- **记账范围**：加入家庭后，首页和账单页顶部出现"个人/家庭"切换器；家庭模式下查看所有成员账单汇总，支持按成员筛选（ownerId）

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

// 家庭
{
  id: 'fam_1689000000000',
  name: '我的家',
  code: 'A3X9K2',            // 6位邀请码（大写字母+数字）
  createdAt: '...'
}

// 用户（含家庭关联）
{
  id: 1,
  openid: 'mock_xxx',
  nickname: '小明',
  familyId: 'fam_1689000000000',
  familyRole: 'admin' | 'member',
  // ...
}

// 家庭账单（scope=family 时返回附加字段）
{
  // ...普通账单字段
  ownerName: '小明',          // 账单创建者的昵称
}
```

## 测试

```bash
cd server
npm test              # 运行所有测试（Jest + supertest）
npm run test:watch    # 监听模式
```

当前共 **90 个测试用例**，覆盖：

| 测试文件 | 用例数 | 覆盖内容 |
|---------|--------|---------|
| auth.test.js | 7 | 登录/注册、token 签发、资料更新、异常处理 |
| bills.test.js | 21 | CRUD、批量操作、分页筛选、同步去重、输入验证 |
| categories.test.js | 14 | CRUD、排序、系统分类保护、级联删除 |
| family.test.js | 17 | 创建/加入/离开家庭、成员管理、权限控制、家庭账单范围、ownerName |
| db.test.js | 12 | 初始化、CRUD、写队列、边界条件 |
| middleware.test.js | 6 | JWT 验证、token 过期、缺少 token |
| services.test.js | 6 | 微信/支付宝 code2session 和 sync |

## 开发环境

- 微信开发者工具稳定版
- 基础库版本 >= 3.3.0
- 无需额外 npm 依赖

## 注意事项

1. 当前版本使用模拟数据（`utils/mock.js`），接入真实后端后需替换 `utils/api.js` 中的请求实现
2. 微信支付/支付宝账单同步需要相应的商户平台权限
3. 所有数据存储在用户本地，清除微信缓存会导致数据丢失
4. 建议定期导出数据备份
