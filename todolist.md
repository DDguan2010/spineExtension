# Spine Extension Todo List

> 基于当前仓库源码复查后的完整待办清单。
> 后续目标只针对 Gandi，不考虑 TurboWarp 适配。
> `PROJECT_RUN_STOP` 后清理 skin 目前视为特性，暂不作为 bug 修复。
> 骨架尺寸、中心点和偏移能力当前暂按已可用处理，不作为近期优先项。

## 1. 当前优先级

- [ ] 完整骨骼动画引擎能力补齐
  - 第一批：动画进度读写、事件监听缓存、bone 旋转/缩放/坐标转换、attachment 查询、多 skin 组合。
  - 第二批：状态机、多 track 管理、约束控制、碰撞与 bounding box、配置管理。
  - 第三批：模块拆分、更多 runtime、测试资源、完整文档。

- [x] 修复或替换 `3.8webgl` runtime
  - 当前 `src/spine/3.8/spine-webgl.js` 中存在 `SkeletonData` / `skeletonData` 混用问题。
  - 会导致 Spine 3.8 导出的 `.skel` / `.json` 加载失败。
  - 这是当前最影响可用性的真实问题。

- [x] 增加骨骼指向目标点能力
  - 目标功能：让指定 bone 指向舞台坐标、鼠标坐标或另一个角色坐标。
  - 典型用途：枪口指向鼠标、头部看向目标、眼睛跟随、炮塔旋转。
  - 建议积木：`让骨骼[BONE]指向舞台坐标[X,Y]`。

- [x] 增加 IK target 控制能力
  - 如果 Spine 资源本身配置了 IK constraint，应允许通过积木移动 IK target。
  - 典型用途：拖动手脚、枪械瞄准、角色手臂自然弯曲。
  - 建议积木：`设置IK约束[NAME]的目标位置为[X,Y]`。

- [x] 增加动画混合控制
  - 当前只有 `setAnimation` / `addAnimation`，不能直接设置动画过渡时间。
  - 需要支持 `setMix` / `defaultMix`。

- [x] 增加 animation event 监听
  - 当前只有“动画是否完成”的布尔判断。
  - 需要支持 Spine event、开始、结束、完成、中断等事件。

- [x] 增加 skin / slot / attachment 操作
  - 支持换装、替换武器、隐藏部件、切换表情。

- [ ] 增加自动版本识别和上传校验
  - 上传时自动识别 skeleton 版本。
  - 校验 `.atlas` 里引用的 `.png` 是否都已选择。

## 2. 运行时与版本支持

- [x] 修复 `3.8webgl` 的 `.skel` 解析
  - `SkeletonBinary.prototype.readSkeletonData` 中存在变量名错误。
  - 需要保证 Spine 3.8.75 的二进制导出能正常加载。

- [x] 修复 `3.8webgl` 的 `.json` 解析
  - `SkeletonJson.prototype.readSkeletonData` 中也存在 `SkeletonData` / `skeletonData` 混用。
  - 普通 skin、slot、IK、transform、path 等结构都可能触发错误。

- [ ] 尽量用官方 Spine 3.8 WebGL runtime 替换当前文件
  - 比手动修局部变量更可靠。
  - 替换后需要验证 `.skel`、`.json`、`.atlas`、`.png` 全流程。

- [ ] 补充更多 Spine runtime 版本
  - 当前只支持 `3.8webgl`、`4.0webgl`、`4.2webgl`。
  - 可评估增加 `4.1`、`4.3`、`4.4`。
  - 可行性：中。Spine 官方 runtime 可通过 npm alias 引入，但不同版本 API 和导出格式可能有细节差异。
  - 用途：用户可以直接使用更多 Spine 编辑器版本导出的资源，减少手动转换。
  - 实现方案：在 `package.json` 增加 `41webgl`、`43webgl`、`44webgl` 之类 alias；在 `src/spine/spineVersions.ts` 注册版本；补充 VERSION 菜单。
  - 兼容方案：先用当前 `SpineManager` 跑 smoke test；如果某版本 AssetManager 或 SceneRenderer API 不同，再加 adapter。
  - 风险：runtime 包体增大；不同版本 `updateWorldTransform`、loader、debug render、attachment API 可能不一致。
  - 验证：每个新增 runtime 至少验证 `.json`、`.skel`、`.atlas`、单页 png、多页 png、skin、event、IK。

- [ ] 自动识别 skeleton 版本
  - `.json` 可读取 `skeleton.spine`。
  - `.skel` 需要读取二进制头部版本字段。
  - 自动推荐或直接选择对应 runtime。
  - 可行性：中。JSON 已可做，二进制需要扫描可读版本字符串或解析 header。
  - 用途：减少用户选错 3.8/4.0/4.2 导致的底层解析报错。
  - 实现方案：JSON 继续读取 `skeleton.spine`；SKEL 读取前几 KB ArrayBuffer，用 `TextDecoder` 或字节扫描查找 `3.8`、`4.0`、`4.1`、`4.2`、`4.3`、`4.4`。
  - 积木/交互：上传和 dataURL 配置创建时都显示推荐 runtime；如果用户选择不匹配版本，弹确认提示。
  - 风险：不同 Spine 版本二进制头格式可能变化；扫描不到时只能提示未知。
  - 验证：准备每个版本的 `.skel` 小文件，检查推荐版本是否正确。

- [ ] 版本不匹配时明确提示
  - 例如 3.8 文件选择 4.2 runtime 时，不应只显示底层解析错误。

## 3. 骨骼交互控制

- [x] 增加 bone look-at 积木
  - 让某根骨骼朝向指定舞台坐标。
  - 需要处理世界坐标到父骨骼局部旋转的转换。
  - 需要支持角度偏移，因为不同资源的骨骼朝向基准可能不同。

- [ ] 增加 bone 指向鼠标积木
  - 这是 look-at 的常用快捷形式。
  - 适合枪械、炮塔、头部、眼睛。

- [ ] 增加 bone 指向角色积木
  - 目标可以是另一个 Gandi 角色的当前坐标。

- [x] 增加设置 bone 旋转积木
  - 当前已有设置骨骼世界坐标。
  - 还需要直接设置 local rotation / world rotation。

- [x] 增加设置 bone 缩放积木
  - 用于拉伸、压缩、特殊效果。

- [x] 增加读取 bone 世界旋转 / 局部旋转
  - 便于做调试和联动。

- [x] 增加 bone 坐标转换工具
  - 世界坐标转骨骼局部坐标。
  - 骨骼局部坐标转世界坐标。

- [x] 增加 IK constraint 查询
  - 查询所有 IK 名称。
  - 查询 IK target、mix、bendDirection 等状态。

- [x] 增加 IK target 控制
  - 设置 target bone 的世界位置。
  - 或者直接修改 IK constraint 所关联 target 的位置。
  - 需要验证 Spine runtime 中 IK 更新顺序。

- [x] 增加 Transform Constraint 控制
  - 支持读取和设置 rotateMix、translateMix、scaleMix、shearMix 等。
  - 可行性：中。runtime 已暴露 `skeleton.transformConstraints`，但 3.8/4.x 字段名和行为要复查。
  - 用途：控制高级绑定效果，例如身体跟随、装备挂点、辅助骨骼联动强度。
  - 实现方案：按 name 查找 transform constraint，读取/设置 `rotateMix`、`translateMix`、`scaleMix`、`shearMix`。
  - 建议积木：`设置骨架[SKELETON]的Transform约束[NAME]的[FIELD]为[VALUE]`。
  - 建议查询：在“获取[...]的”里增加 transform constraint 的 mix 状态和 target bone 名称。
  - 风险：某些字段可能由动画 timeline 每帧覆盖，用户设置后需要在动画应用后或每帧重复应用。
  - 验证：用包含 Transform Constraint 的测试资源，调节 mix 后观察从 0 到 1 的效果差异。

- [x] 增加 Path Constraint 控制
  - 支持读取和设置 position、spacing、rotateMix、translateMix 等。
  - 可行性：中。runtime 已暴露 `skeleton.pathConstraints`，但不同版本字段/单位需要验证。
  - 用途：控制沿路径运动的头发、尾巴、绳子、轨道、装饰链条等。
  - 实现方案：按 name 查找 path constraint，读取/设置 `position`、`spacing`、`rotateMix`、`translateMix`。
  - 建议积木：`设置骨架[SKELETON]的Path约束[NAME]的[FIELD]为[VALUE]`。
  - 风险：position/spacing 的单位依赖 Spine 工程设置；动画 timeline 也可能覆盖手动值。
  - 验证：用一条路径约束资源，测试 position 变化是否沿路径移动，spacing 是否改变间距。

## 4. 动画播放控制

- [x] 增加基础动画状态机
  - 允许注册状态到动画名映射，并按状态切换动画。
  - 支持默认循环、track、mix、打断优先级。
  - 用途：统一管理 idle / walk / jump / attack / hurt / dead 等动画，避免用户在积木里到处手写复杂 if 判断。
  - 数据结构：每个 AnimationStateReport 绑定一个状态机对象，记录 `currentState`、`previousState`、`states`、`fallbackState` 和 `inputContext`。
  - 状态配置字段：`name`、`animation`、`track`、`loop`、`mix`、`priority`、`returnMode`、`returnState`、`allowInterruptBy`。
  - `returnMode` 规划：`none` 表示播完不自动切换，`fixed` 表示播完回固定状态，`input` 表示播完按当前输入回 idle/walk 等状态。
  - 建议积木：`为AnimationState[STATE]注册状态[NAME]动画[ANIMATION]track[TRACK]循环[LOOP]优先级[PRIORITY]`。
  - 建议积木：`设置动画状态[NAME]播完后[MODE]返回[RETURN]`。
  - 建议积木：`切换AnimationState[STATE]到状态[NAME]`。
  - 建议积木：`设置AnimationState[STATE]输入[KEY]为[VALUE]`，用于 jump 播完后根据 `moving=true/false` 回 walk 或 idle。
  - 建议积木：`获取AnimationState[STATE]当前状态`。
  - 实现步骤：先用现有事件监听捕获 complete，再在 complete 时检查当前状态是否非循环并执行 return 规则。
  - 实现步骤：切换状态时先比较 priority 和 allowInterruptBy，允许打断才调用 `setAnimation`。
  - 实现步骤：状态切换前自动调用 `setMix(previous.animation, next.animation, mix)`，再播放新状态动画。
  - 示例：walk 循环，jump 不循环；jump 播完时如果 `moving=true` 回 walk，否则回 idle。
  - 风险：Gandi 积木没有复杂对象编辑器，状态配置需要拆成多块积木或用 JSON 配置。
  - 验证：用 idle/walk/jump/attack 四个状态测试循环、非循环返回、优先级打断和输入返回。

- [ ] 增加动画队列查询和清空
  - 查询当前 track 以及 queued entries。
  - 支持清空指定 track 的后续队列。

- [x] 增加 `setMix(from, to, duration)` 积木
  - 指定两个动画之间的过渡时间。

- [x] 增加 `defaultMix` 积木
  - 设置默认动画过渡时间。

- [x] 增加 `timeScale` 控制
  - 支持整体动画速度。
  - 支持单个 TrackEntry 的速度控制，如果 runtime 支持。

- [x] 增加暂停 / 继续播放
  - 可通过设置 timeScale 或跳过 update 实现。

- [x] 增加停止单个 track
  - 支持 `clearTrack(track)`。

- [x] 增加清空所有 track
  - 支持 `clearTracks()`。

- [x] 增加 addAnimation delay 参数
  - 当前 `addAnimation(..., 0)` 写死 delay 为 0。

- [x] 增加读取播放进度
  - 当前动画名。
  - 当前 trackTime。
  - animationStart / animationEnd。
  - 是否 complete。

- [x] 增加设置播放进度
  - 支持跳到指定时间或百分比。

- [ ] 增加多 track 叠加示例
  - 例如下半身 walk，上半身 attack。

## 5. 动画事件

- [x] 增加 Spine Event 监听
  - 读取 animationState 事件队列。
  - 在 Gandi 中转换为可用的事件帽子积木或状态查询积木。

- [x] 增加动画开始事件
  - track entry start。

- [x] 增加动画完成事件
  - 当前已有布尔判断，但需要更 Scratch/Gandi 风格的帽子积木。

- [x] 增加动画结束 / 中断 / dispose 事件
  - 用于复杂动画状态机。

- [x] 增加事件参数读取
  - 支持 int、float、string、audio path 等 Spine event 数据。

- [x] 支持按动画名和 track 过滤事件
  - 避免多动画、多 track 混在一起。

## 6. Skin / Slot / Attachment / 换装

- [x] 查询所有 skin 名称
  - 用于显示可用换装列表。

- [x] 切换当前 skin
  - 支持 `skeleton.setSkinByName` 或对应 runtime API。

- [x] 组合多个 skin
  - Spine 3.8+ 常见换装功能。
  - 例如身体、头发、衣服、武器分别组合。

- [x] 查询所有 slot 名称
  - 便于定位要替换的部件。

- [x] 查询 slot 当前 attachment
  - 便于调试当前显示部件。

- [x] 设置 slot attachment
  - 替换武器、表情、道具。

- [x] 隐藏 slot attachment
  - 把 attachment 设置为空。

- [x] 查询某个 slot 可用 attachments
  - 需要从 skin 或 skeletonData 中读取。

## 7. 上传与文件管理

- [x] 改进上传说明
  - 明确需要 `.skel` 或 `.json`、`.atlas`、所有 `.png`。
  - 明确 `.skel` 和 `.json` 不能同时选。

- [ ] 支持拖拽上传文件夹
  - Spine 导出通常是一整个目录。

- [x] 支持 dataURL / base64 本地配置加载
  - 可选择本地 `.skel` / `.json`、`.atlas`、`.png` 生成 dataURL 配置。
  - 生成的配置可直接传给现有加载骨架积木。

- [x] 校验 atlas 引用图片
  - 解析 `.atlas`，检查每个 page 图片是否都已选择。

- [x] 支持多 atlas page
  - 多个 png page 要能一起上传并被 atlas 正确引用。

- [x] 上传前显示文件预览
  - 骨架文件、atlas 文件、png 文件列表、识别到的版本。

- [x] 上传失败显示详细错误
  - 包括哪个文件失败、HTTP 状态、存储返回信息。

- [x] 重复配置名提示
  - 避免覆盖旧配置。

- [x] 上传后自动刷新菜单
  - 当前已有刷新，但需要保证失败时不会刷新出错误配置。

## 8. 配置管理

- [ ] 改进配置结构
  - 当前只存 `skel`、`atlas`、`version`。
  - 可增加 `name`、`createdAt`、`files`、`sourceVersion`、`notes`。

- [x] 支持删除配置
  - 从 `config.json` 中移除对应项。
  - 可行性：高。现有配置就是 `config.json` 对象，删除 key 后重新保存即可。
  - 用途：清理错误上传或不再使用的 Spine 配置，避免菜单越来越乱。
  - 实现方案：在 `scratchStorageUI` 增加 `deleteConfig(userId, name)`；扩展增加按钮或命令积木。
  - 建议积木：`删除Spine配置[NAME]`，执行前 confirm 二次确认。
  - 风险：只删除配置，不删除已上传的 skel/atlas/png 文件；如果要删除文件需要确认 Gandi storage 是否支持删除。
  - 验证：删除后刷新菜单，确认该配置不再出现，其他配置不受影响。

- [x] 支持重命名配置
  - 不一定移动文件，只改菜单名。
  - 可行性：高。复制旧 key 到新 key，再删除旧 key 后保存。
  - 用途：修正配置名、整理菜单，不需要重新上传资源。
  - 实现方案：在 `scratchStorageUI` 增加 `renameConfig(userId, oldName, newName)`；若新名称存在则提示覆盖。
  - 建议积木：`重命名Spine配置[OLD]为[NEW]`。
  - 风险：只改配置名，不移动资源路径；这通常是期望行为，但文档要说明。
  - 验证：重命名后旧菜单项消失，新菜单项可正常加载同一资源。

- [x] 支持编辑配置 URL / 版本
  - 方便修正错误上传。
  - 可行性：高。修改已有配置的 `skel`、`atlas`、`version` 后保存。
  - 用途：修复填错 URL、选错 runtime、迁移资源路径。
  - 实现方案：新增 `updateConfig(userId, name, patch)`；扩展提供编辑 URL / 版本的 reporter 或 command。
  - 建议积木：`编辑Spine配置[NAME]骨架[SKEL]图集[ATLAS]版本[VERSION]`。
  - 风险：错误 URL 会导致菜单存在但加载失败；保存前可做 URL/dataURL 基本格式校验。
  - 验证：修改版本和 URL 后刷新菜单，加载使用的是新配置。

- [ ] 支持导入外部 URL 配置
  - 用户可以直接填远程 skeleton / atlas URL。

## 9. 数据查询与调试

- [x] 增加当前动画状态监视器
  - 当前动画、trackTime、进度百分比、timeScale、mix 状态。
  - 可行性：高。已有播放进度查询，可包装成更友好的综合 reporter。
  - 用途：调试状态机、多 track、动画卡住、速度异常等问题。
  - 实现方案：新增 reporter 返回 JSON：`tracks`、`currentAnimation`、`trackTime`、`progress`、`loop`、`timeScale`。
  - 风险：JSON 字符串对普通用户不够友好；后续可配合 Gandi 高级数据结构或拆分为多个 reporter。
  - 验证：播放、暂停、跳进度、清 track 后监视器数据应同步变化。

- [ ] 增加资源加载错误面板
  - 汇总 skeleton、atlas、png、parse 阶段错误。
  - 可行性：中。需要在 `SpineManager` 的 load/parse 阶段捕获并标注阶段。
  - 用途：用户能知道到底是 skel 下载失败、atlas 下载失败、png 缺失，还是 runtime 版本不匹配。
  - 实现方案：为 `loadSkeleton` 包装阶段错误；记录最近一次加载错误到扩展字段；新增 reporter `最近一次Spine加载错误`。
  - 风险：AssetManager 内部错误字符串跨版本不同，需要做通用兜底。
  - 验证：分别故意给错 skel、atlas、png、runtime，确认错误提示阶段准确。

- [ ] 增加性能统计
  - 资源数量、贴图数量、加载耗时、渲染耗时。
  - 可行性：中。加载耗时容易统计，渲染耗时需要在 draw 前后采样。
  - 用途：判断资源太大、贴图太多、动画太复杂导致卡顿。
  - 实现方案：在加载开始/结束记录时间；在 `drawSkeleton` 前后用 `performance.now()` 记录最近帧耗时；统计当前 skins 数量。
  - 风险：WebGL GPU 实际耗时不等于 JS draw 调用耗时，只能作为近似参考。
  - 验证：加载大资源与小资源，统计数据应有明显差异。

- [ ] 改进“获取[...]的”类型提示
  - 当前类型混用时只报“类型错误”。
  - 应提示需要 skin、skeleton、bone 还是 animationState。

- [x] 查询动画列表
  - 当前已有，但返回 JSON 字符串，不够友好。
  - 可增加菜单化或列表化输出。

- [x] 查询骨骼列表
  - 当前已有基础能力，可扩展返回父子关系、长度、旋转、坐标。

- [x] 查询 slot 列表
  - 当前缺失。

- [x] 查询 attachment 列表
  - 当前缺失。

- [x] 查询 skin 列表
  - 当前缺失。

- [x] 查询 event 列表
  - 当前缺失。

- [x] 查询 IK / transform / path constraint 列表
  - 当前缺失。

- [ ] 增加更详细 debug render
  - 当前有 skeleton debug 开关。
  - 可增加 slot、attachment bounds、bounding box 的显示。
  - 可行性：中。骨骼 debug 已有，slot/attachment/bounding box 需要额外绘制或使用 runtime debug renderer 能力。
  - 用途：检查骨骼位置、slot 当前附件、IK target、碰撞框是否正确。
  - 实现方案：拆分 debug 开关：bones、slots、bounds、boundingBoxes、ikTargets；在 `SpineManager.drawSkeleton` 后按开关绘制辅助线。
  - 风险：不同 runtime 的 debug renderer 能力不同；自己画线需要处理舞台坐标和 WebGL 状态恢复。
  - 验证：开启不同 debug 项，不应影响正常渲染透明混合和角色 skin。

## 10. 碰撞与边界

- [x] 读取 bounding box attachment
  - 用于攻击判定、受击判定、点击区域。
  - 可行性：中高。Spine runtime 有 BoundingBoxAttachment 和 world vertices 计算能力。
  - 用途：给 Spine 角色做攻击框、受击框、鼠标点击区域。
  - 实现方案：遍历当前 slots，找到 attachment 类型为 bounding box 的对象，读取 name 和 slot。
  - 风险：只有资源本身配置了 bounding box 才可用；普通 region/mesh attachment 不是碰撞框。
  - 验证：测试资源中放 head/body/attack 三个 box，查询应返回全部名称。

- [x] 返回 bounding box 世界坐标多边形
  - 比 AABB 更准确。
  - 可行性：中高。调用 attachment 的 `computeWorldVertices`，结合 slot/bone 当前姿态得到世界顶点。
  - 用途：精确点击、攻击判定、受击判定，比矩形 AABB 更贴近动画姿态。
  - 实现方案：新增 reporter：`获取骨架[SKELETON]碰撞框[NAME]世界顶点`，返回 `[[x,y], ...]` JSON。
  - 风险：不同 runtime 的 computeWorldVertices 参数签名可能不同，需要适配 3.8/4.x。
  - 验证：旋转/缩放角色后，返回顶点应随骨骼变换。

- [x] 增加 AABB 查询优化
  - 当前已有 bounds 查询，可进一步结合角色位置、缩放、旋转。
  - 可行性：高。可以基于多边形顶点 min/max 算 AABB。
  - 用途：先用粗略矩形快速判断，再用多边形精确判断，提升碰撞效率。
  - 实现方案：新增 reporter：`获取碰撞框[NAME]的AABB`，返回 `{x,y,width,height}`。
  - 风险：AABB 对旋转物体会偏大，只能做粗判。
  - 验证：同一 bounding box 旋转后 AABB 应覆盖整个多边形。

- [x] 增加点是否在 bounding box 内判断
  - 适合鼠标点击、命中检测。
  - 可行性：高。拿到多边形顶点后使用 ray casting 判断点在多边形内。
  - 用途：点击角色头部/身体，子弹点命中检测。
  - 实现方案：新增 boolean 积木：`点[POS]在骨架[SKELETON]碰撞框[NAME]内`。
  - 风险：需要明确 POS 是舞台坐标还是骨架局部坐标，建议统一舞台/世界坐标。
  - 验证：点击多边形内外多个点，结果应稳定。

- [x] 增加两个 bounding box 是否碰撞判断
  - 适合 Spine 角色之间的碰撞检测。
  - 可行性：中。可以先做 AABB 碰撞，再做多边形 SAT 精确碰撞。
  - 用途：近战攻击框打中受击框、两个 Spine 角色碰撞、技能范围判定。
  - 实现方案：新增 boolean 积木：`骨架[A]碰撞框[BOX_A]碰到骨架[B]碰撞框[BOX_B]`。
  - 风险：多边形碰撞计算比点判断复杂；Scratch/Gandi 帧率下要避免每帧大量碰撞框互测。
  - 验证：两个角色移动、旋转、缩放时碰撞结果应符合可视化 debug。

## 11. Gandi 专属能力整理

- [x] 保留并强化 Gandi 上传能力
  - 当前使用 `runtime.ccwAPI.getUserInfo()` 和 `runtime.storage.store()`。
  - 后续目标只针对 Gandi，不做 TurboWarp 兼容。

- [x] 保留 HTMLReport 能力
  - 当前通过 patch `visualReport` 和 `requestUpdateMonitor` 支持对象型报告器。

- [x] 保留 SafeObject patch
  - 当前用于 Gandi 高级数据结构兼容。
  - 需要补文档说明这个对象不应保存到项目持久数据里。

- [ ] 整理 Gandi renderer 内部字段依赖
  - 当前使用 `_allSkins`、`_nextSkinId`、`_allDrawables`、`createSpineSkin()`。
  - 需要集中封装，避免散落在 `index.ts` 和 `spineSkin.ts`。

- [ ] 整理 Gandi Blockly patch
  - 当前 `getSth` 动态菜单依赖 `runtime.scratchBlocks`。
  - 需要确保在 Blockly 不暴露时降级可用。

## 12. 错误处理与用户体验

- [ ] 把通用 `typeError` 改成具体错误
  - 例如：输入不是 Skin、输入不是 Skeleton、找不到 Bone、找不到 Animation。

- [x] 动画名不存在时提示可用动画名
  - 方便用户填写正确动画名。

- [x] bone 名不存在时提示相近名称或全部名称
  - 减少调试成本。

- [ ] slot / skin / attachment 名不存在时给出明确提示
  - 换装功能必需。

- [ ] loadSkeleton 失败时显示具体阶段
  - 下载 skeleton 失败。
  - 下载 atlas 失败。
  - 下载 png 失败。
  - 解析 skeleton 失败。
  - runtime 版本不匹配。

- [x] 上传失败时显示具体文件和原因
  - 当前错误提示过于笼统。

## 13. 代码结构与维护

- [ ] 拆分 `src/index.ts`
  - 当前主文件过大，包含注册、上传、菜单、加载、查询、动画、骨骼控制。
  - 可行性：高，但需要分阶段做，避免一次性大重构引入行为变化。
  - 用途：降低维护成本，方便单独测试动画、骨骼、上传、换装等模块。
  - 实现方案：先只移动纯函数和低耦合逻辑，再移动依赖 runtime 的方法；每拆一块就 build。
  - 风险：方法名用于 opcode，移动时不能改变类方法名和绑定方式。
  - 验证：拆分前后 `getInfo()` 生成的 opcode、menus、block 文案保持一致。

- [ ] 独立上传模块
  - `upload/validate.ts`
  - `upload/versionDetect.ts`
  - `upload/atlasParser.ts`

- [ ] 独立动画模块
  - `animation/controls.ts`
  - `animation/events.ts`

- [ ] 独立骨骼控制模块
  - `bone/lookAt.ts`
  - `bone/ik.ts`
  - `bone/constraints.ts`

- [ ] 独立换装模块
  - `skin/skinControl.ts`
  - `skin/attachmentControl.ts`

- [ ] 独立 Gandi 平台模块
  - 封装 storage、renderer、HTMLReport、Blockly patch。
  - 不是为了兼容 TurboWarp，而是为了降低 Gandi 内部 API 散落带来的维护成本。

- [ ] 减少 `any`
  - 优先清理 `SpineManager`、`SpineSkin`、`getSthOf`、`argsParse`。
  - 可行性：中。3.8/4.x 类型差异大，不能简单强行套单一官方类型。
  - 用途：让 TypeScript 在构建阶段提前发现字段名错误、参数错误和返回值错误。
  - 实现方案：定义最小公共接口，如 `SpineBoneLike`、`SpineSkeletonLike`、`TrackEntryLike`、`AnimationStateLike`。
  - 适配方案：跨版本差异用 helper 包装，例如 `findSlotIndex`、`getTrackAnimationTime`、`updateWorldTransformCompat`。
  - 风险：过度类型化会导致代码臃肿；优先给新增公共 helper 和模块边界加类型。
  - 验证：逐步开启局部严格类型，保持 `npm run build` 通过。

- [ ] 增加最小测试资源
  - 3.8 JSON / SKEL。
  - 4.0 JSON / SKEL。
  - 4.2 JSON / SKEL。
  - 包含动画、IK、slot、skin、event 的小样例。
  - 用途：不是给用户直接使用，而是给扩展开发做回归测试，防止修好一个版本又弄坏另一个版本。
  - 资源要求：每个版本至少一套 `.json`、一套 `.skel`、一个 `.atlas`、一到两个 `.png`。
  - 资源内容：至少包含 `idle` 循环动画、`jump` 单次动画、一个 Spine Event、两个 skin、一个可替换 slot attachment、一个 IK constraint、一个 bounding box。
  - 文件规划：放在 `test-assets/spine-3.8/`、`test-assets/spine-4.0/`、`test-assets/spine-4.2/`。
  - 测试配置：为每套资源生成 URL 配置和 dataURL 配置，分别覆盖云端加载与本地 dataURL 加载路径。
  - 自动检查项：能否加载 skeleton、能否读取动画列表、能否播放 idle、能否跳到 jump 进度、能否收到 event。
  - 自动检查项：能否切换 skin、能否组合 skin、能否查询并设置 attachment、能否移动 IK target。
  - 自动检查项：能否读取 bone 坐标/旋转/缩放、能否做世界/局部坐标转换。
  - 实现方式：先做一个轻量手动测试页面或 Gandi 测试工程清单，再逐步升级为 Playwright 自动测试。
  - 实现步骤：第一步先收集或导出小资源；第二步写 `tests/loadSpineSmoke.ts`；第三步接入 `npm run test:spine`。
  - 风险：Spine runtime 资源受授权和导出版本影响，测试资源需要确认可提交到仓库。
  - 验证：每次新增 runtime、修改 loader、修改 animation/skin/bone 逻辑后，都跑测试资源。

## 14. 文档和示例

- [x] 写完整上传说明
  - 文件要求。
  - 版本选择。
  - 转换 3.8 到 4.2 的临时方案。

- [x] 写基础加载示例
  - 上传。
  - 刷新菜单。
  - 加载 skeleton。
  - 设置角色 skin。

- [x] 写动画播放示例
  - idle。
  - walk。
  - attack 后回 idle。
  - 动画混合。

- [x] 写骨骼指向示例
  - 枪口指向鼠标。
  - 头部看向角色。
  - 眼睛跟随鼠标。

- [x] 写 IK 示例
  - 拖动手部目标点。
  - 手臂自然指向目标。

- [x] 写换装示例
  - 切换 skin。
  - 替换武器 attachment。
  - 隐藏某个 slot。

- [x] 写常见错误说明
  - `SkeletonData is not defined`。
  - id 变 `-1`：说明这是停止后清理行为，运行时需要重新加载。
  - 类型错误：说明 Skin / Skeleton / AnimationState 的区别。
  - 版本不匹配。

## 15. 暂不处理项

- [x] 暂不适配 TurboWarp
  - 当前目标只做 Gandi。
  - TurboWarp 的 storage、renderer、HTMLReport、Blockly 暴露方式都不同，暂不投入。

- [x] 暂不修复 `PROJECT_RUN_STOP` 后的 `gc()` 清理行为
  - 当前按特性处理。
  - 文档中说明停止后需要重新加载，或绿旗后延迟加载。

- [x] 暂不优先处理骨架尺寸和中心点自动适配
  - 当前实测已基本可用，并且已有偏移设置能力。
  - 后续如果出现具体资源适配问题，再单独处理。
