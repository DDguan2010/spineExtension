# ✨Spine Extension For Gandi✨

![rate][rate]

- 🟢为**Gandi**编辑器量身定做的Spine运行时扩展
- ☑️类型安全，功能可扩展
- 在 Gandi 中加载并控制 Spine 骨骼动画，支持本地/云端资源加载、动画播放、骨骼控制、IK、换装与附件切换。

### ✨亮点

---

1. 特殊的数据存储方式  
   通过[HTMLReport](src/util/htmlReport.ts)存储数据，更便于观察！
2. 扩展Gandi原版的Spine实现  
   修改Gandi的部分官方功能，渲染更加快捷

### 🕑开发进展

---

#### ⚡︎底层utils

- [x] spineSkin
- [x] spineManager
- [x] htmlReport
- [x] spineSkinReport
- [x] spineSkeletonReport
- [x] spineBoneReport
- [x] animationStateReport

#### 🗯️扩展功能

- [x] 加载骨架文件
- [x] 文件上传
    - [x] 允许用户使用data url替换骨架文件
    - [x] 直接通过api上传文件
- [x] 显示骨架skin
- [x] 根据drawable状态调整骨架**坐标**变换
- [x] 根据drawable状态调整骨家**缩放**变换
- [x] 根据drawable状态调整骨架**旋转**变换
- [x] relative pos
- [x] 从skin中获取骨架数据
- [x] 修改、读取骨骼数据
- [x] IK target 控制
- [x] skin / slot / attachment 操作
- [x] 应用动画
- [x] 动画混合、暂停、继续、停止 track

#### 💬扩展信息

- [x] 大图标 by [乌龙茶速递@ccw][1]
- [x] 小图标
- [x] 配色方案 by [乌龙茶速递@ccw][1]
- [x] 扩展介绍的i18n

#### ♥️鸣谢

- EsotericSoftware的[Spine WebGl runtime](https://zh.esotericsoftware.com/git/spine-runtimes/tree/spine-ts)

- UI设计、测试、配色方案、部分i18n、用户体验优化、部分异常的修复：[乌龙茶速递@ccw ![乌龙茶速递][2]][1]

- 项目灵感，renderer部分的原版支持：HCN

### 📌快速使用

---

1. 上传资源：选择同一套 Spine 导出的 `.skel` 或 `.json`、`.atlas`、所有 `.png`，版本优先按提示选择。
2. 加载骨架：用“加载配置为[CONFIG]的spine骨骼并命名为[NAME]”得到 Spine Skin。
3. 显示到角色：用“将角色[TARGET_NAME]的skin设为Skin[SKELETON]”。
4. 本地 dataURL：用“选择本地Spine文件创建dataURL配置”生成配置，可直接传给加载积木。

### 🎬常用示例

---

- 动画播放：获取 Skin 的 AnimationState，立即播放 idle / walk / attack，可设置 mix、delay、暂停、继续、停止 track。
- 骨骼控制：获取骨架中的 bone，设置世界坐标、旋转、缩放，或让骨骼指向舞台坐标。
- IK 控制：对已配置 IK 的资源，设置 IK target 的世界坐标。
- 换装附件：切换 skin、组合多个 skin、设置/隐藏 slot attachment、查询可用 attachment。
- 动画事件：先开始监听 AnimationState 事件，再取出缓存事件，支持 start、complete、end、interrupt、dispose 和 Spine Event 参数。

### 🧯常见问题

---

- `SkeletonData is not defined`：通常来自旧 3.8 runtime 变量问题，当前已做局部修复；仍建议确认 runtime 版本和资源导出版本一致。
- Skin id 变 `-1`：项目停止后扩展会清理 skin，这是当前设计行为；重新运行后需要重新加载骨架。
- 类型错误：注意区分 Skin、Skeleton、AnimationState、Bone，先用“获取[...]的”拿到正确对象再传入对应积木。
- 版本不匹配：3.8 / 4.0 / 4.2 的 Spine 文件要选择对应 runtime，否则可能加载或解析失败。

### 😏杂谈（Q&A）

- **为什么要对高级数据结构专门patch?**
  **Arkos**大佬的高级数据结构中读取数据的功能有一些问题，  
  造成对象**原型**被修改，虽然有助于防止原型链污染，但会造成**数据处理错误**，有时甚至导致**编辑器崩溃**，  
  读取到危险**function**，  
  因此我通过套proxy等方法进行了patch。
- **关于特殊的块：**
  为了更加便于编辑的功能~~炫技~~，我通过设置getter setter的方式patch了blockly，并实现了很多有趣的功能，
  具体可见[customBlocks](src/util/customBlocks)。

[rate]: https://img.shields.io/badge/dynamic/json?url=https://bfs-web.ccw.site/extensions/spinePro&query=$.body.stats.averageRating&label=%E2%AD%90%EF%B8%8F%E6%89%A9%E5%B1%95%E8%AF%84%E5%88%86
[1]: https://www.ccw.site/student/68dd004586bbc77f84e309ac
[2]: https://m.ccw.site/user_projects_assets/dc5394d2-c5c5-4d69-b924-effaae5c4543.png
