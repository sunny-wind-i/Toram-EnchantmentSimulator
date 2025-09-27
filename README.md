# 托拉姆物语 - 附魔模拟器

这是一个为《托拉姆物语》(Toram Online) 游戏玩家设计的附魔模拟器。

## 目录

- [功能特性](#功能特性)
- [项目说明](#项目说明)
- [使用说明](#使用说明)
- [本地构建](#本地构建)
  - [准备工作](#准备工作)
  - [安装依赖](#安装依赖)
  - [开发模式](#开发模式)
  - [生产构建](#生产构建)
- [项目结构](#项目结构)
- [技术栈](#技术栈)
- [贡献](#贡献)
- [许可证](#许可证)

## 功能特性

- **附魔模拟**: 模拟不同装备类型下的附魔过程
- **成功率计算**: 根据玩家等级、装备潜力和材料计算附魔成功率
- **材料消耗统计**: 自动计算附魔所需的材料数量
- **表格视图**:使用了表格视图来操作附魔步骤，使得用户更轻松地总览与操作各步骤。
- **记录追踪**: 保存历史附魔记录供参考
- **响应式设计**: 支持桌面端、平板和手机设备（但是手机因为屏幕小可能会需要左右滑动表格）
- **导出/导入**: 支持导出附魔方案代码，方便分享和备份

## 项目说明
- 本附魔模拟器在B站BWiki有部署，可以前往 https://wiki.biligame.com/toramonline/Enchantsimulation 使用
- 本附魔模拟器基于小游代理的国服数据开发，国服版本是适配的（目前文档编写时国服版本为290版本），理论上也适配国际服版本，但未测试。如果A社不改动附魔，理论上也可以用于今后的版本。
- 国际服实装了铁砧等级会影响素材消耗的机制（2025年夏），但国服尚未实装，我没有条件测试，因此素材消耗计算部分没有对铁砧等级做处理。等以后国服实装，再测试更新。
- 本附魔模拟器仅有模拟功能，不能进行自动计算


## 使用说明

1. 选择或创建一个附魔方案
2. 设置装备类型、玩家等级、装备潜力等基础信息
3. 选择需要附魔的属性（最多8项）
4. 在表格中添加附魔步骤，调整属性值。单击可以选中单元格，双击可以编辑单元格内容，电脑端右击/移动端长按可以呼出操作菜单，菜单内可以添加、删除、复制、粘贴步骤。
5. 查看成功率和材料消耗
6. 导出方案代码以便后续使用或分享

## 本地构建

### 准备工作

确保你的系统已安装以下软件：

- [Node.js](https://nodejs.org/) (推荐使用 LTS 版本)
- npm (通常随 Node.js 一起安装)

### 安装依赖

克隆项目后，在项目根目录下运行：

```bash
npm install
```

### 开发模式

在开发模式下运行项目，支持热重载：

```bash
npm run dev
```

默认情况下，开发服务器将在 `http://localhost:9000` 启动。

### 生产构建

构建生产环境版本：

```bash
npm run build
```

构建后的文件将输出到 `dist` 目录，包含一个 HTML 文件、一个 CSS 文件和一个 JS 文件。

## 项目结构

```
Toram-EnchantmentSimulator/
├── config/                 # webpack 配置文件
├── dist/                   # 生产构建输出目录
├── public/                 # 静态资源文件
├── src/                    # 源代码目录
│   ├── css/                # 样式文件
│   └── js/                 # JavaScript 文件
│       ├── modules/        # 功能模块
│       ├── EnchantmentSimulator.js  # 主入口文件
│       └── propertyDisplay.js       # 属性显示模块
├── .gitignore              # Git 忽略文件配置
├── LICENSE                 # 许可证文件
├── package.json            # 项目配置和依赖
└── README.md               # 项目说明文件
```

### 核心模块
- `EnchantmentSimulator.js`: 主入口，定义大部分UI操作
- `EnchantProperties.js`: 定义附魔属性和相关配置
- `PropertyManager.js`: 定义了对EnchantProperties的操作
- `EnchantRecord.js`: 附魔对象，实现附魔步骤各属性的计算
- `MaterialCalculator.js`: 计算附魔所需材料
- `PotentialCalculator.js`: 计算附魔潜力值
- `SuccessCalculator.js`: 计算附魔成功率

## 技术栈

- **核心语言**: JavaScript (ES6+)
- **样式**: CSS3
- **构建工具**: Webpack 5
- **开发工具**: 
  - Babel (ES6+ 转译)
  - PostCSS (CSS 处理)
  - Autoprefixer (CSS 前缀添加)
- **依赖管理**: npm
- **开发服务器**: webpack-dev-server

## BUG报告

如果遇到BUG，可以提交 Issue ，或者 在 B站/TapTap 找我反馈，用户名：晴风烟云

bilibili：https://space.bilibili.com/291032863

taptap：https://www.taptap.cn/user/25824488

## 许可证

本项目采用 MIT 许可证，详情请见 [LICENSE](./LICENSE) 文件。