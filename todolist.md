# Spine Extension Todo List

> 基于当前仓库源码复查后的完整待办清单。
> 后续目标只针对 Gandi，不考虑 TurboWarp 适配。
> `PROJECT_RUN_STOP` 后清理 skin 目前视为特性，暂不作为 bug 修复。
> 骨架尺寸、中心点和偏移能力当前暂按已可用处理，不作为近期优先项。

## 1. 当前优先级

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

- [ ] 增加 animation event 监听
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

- [ ] 自动识别 skeleton 版本
  - `.json` 可读取 `skeleton.spine`。
  - `.skel` 需要读取二进制头部版本字段。
  - 自动推荐或直接选择对应 runtime。

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

- [ ] 增加设置 bone 旋转积木
  - 当前已有设置骨骼世界坐标。
  - 还需要直接设置 local rotation / world rotation。

- [ ] 增加设置 bone 缩放积木
  - 用于拉伸、压缩、特殊效果。

- [ ] 增加读取 bone 世界旋转 / 局部旋转
  - 便于做调试和联动。

- [ ] 增加 bone 坐标转换工具
  - 世界坐标转骨骼局部坐标。
  - 骨骼局部坐标转世界坐标。

- [ ] 增加 IK constraint 查询
  - 查询所有 IK 名称。
  - 查询 IK target、mix、bendDirection 等状态。

- [x] 增加 IK target 控制
  - 设置 target bone 的世界位置。
  - 或者直接修改 IK constraint 所关联 target 的位置。
  - 需要验证 Spine runtime 中 IK 更新顺序。

- [ ] 增加 Transform Constraint 控制
  - 支持读取和设置 rotateMix、translateMix、scaleMix、shearMix 等。

- [ ] 增加 Path Constraint 控制
  - 支持读取和设置 position、spacing、rotateMix、translateMix 等。

## 4. 动画播放控制

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

- [ ] 增加读取播放进度
  - 当前动画名。
  - 当前 trackTime。
  - animationStart / animationEnd。
  - 是否 complete。

- [ ] 增加设置播放进度
  - 支持跳到指定时间或百分比。

- [ ] 增加多 track 叠加示例
  - 例如下半身 walk，上半身 attack。

## 5. 动画事件

- [ ] 增加 Spine Event 监听
  - 读取 animationState 事件队列。
  - 在 Gandi 中转换为可用的事件帽子积木或状态查询积木。

- [ ] 增加动画开始事件
  - track entry start。

- [ ] 增加动画完成事件
  - 当前已有布尔判断，但需要更 Scratch/Gandi 风格的帽子积木。

- [ ] 增加动画结束 / 中断 / dispose 事件
  - 用于复杂动画状态机。

- [ ] 增加事件参数读取
  - 支持 int、float、string、audio path 等 Spine event 数据。

- [ ] 支持按动画名和 track 过滤事件
  - 避免多动画、多 track 混在一起。

## 6. Skin / Slot / Attachment / 换装

- [x] 查询所有 skin 名称
  - 用于显示可用换装列表。

- [x] 切换当前 skin
  - 支持 `skeleton.setSkinByName` 或对应 runtime API。

- [ ] 组合多个 skin
  - Spine 3.8+ 常见换装功能。
  - 例如身体、头发、衣服、武器分别组合。

- [x] 查询所有 slot 名称
  - 便于定位要替换的部件。

- [ ] 查询 slot 当前 attachment
  - 便于调试当前显示部件。

- [x] 设置 slot attachment
  - 替换武器、表情、道具。

- [x] 隐藏 slot attachment
  - 把 attachment 设置为空。

- [ ] 查询某个 slot 可用 attachments
  - 需要从 skin 或 skeletonData 中读取。

## 7. 上传与文件管理

- [ ] 改进上传说明
  - 明确需要 `.skel` 或 `.json`、`.atlas`、所有 `.png`。
  - 明确 `.skel` 和 `.json` 不能同时选。

- [ ] 支持拖拽上传文件夹
  - Spine 导出通常是一整个目录。

- [x] 支持 dataURL / base64 本地配置加载
  - 可选择本地 `.skel` / `.json`、`.atlas`、`.png` 生成 dataURL 配置。
  - 生成的配置可直接传给现有加载骨架积木。

- [x] 校验 atlas 引用图片
  - 解析 `.atlas`，检查每个 page 图片是否都已选择。

- [ ] 支持多 atlas page
  - 多个 png page 要能一起上传并被 atlas 正确引用。

- [ ] 上传前显示文件预览
  - 骨架文件、atlas 文件、png 文件列表、识别到的版本。

- [ ] 上传失败显示详细错误
  - 包括哪个文件失败、HTTP 状态、存储返回信息。

- [ ] 重复配置名提示
  - 避免覆盖旧配置。

- [ ] 上传后自动刷新菜单
  - 当前已有刷新，但需要保证失败时不会刷新出错误配置。

## 8. 配置管理

- [ ] 改进配置结构
  - 当前只存 `skel`、`atlas`、`version`。
  - 可增加 `name`、`createdAt`、`files`、`sourceVersion`、`notes`。

- [ ] 支持删除配置
  - 从 `config.json` 中移除对应项。

- [ ] 支持重命名配置
  - 不一定移动文件，只改菜单名。

- [ ] 支持编辑配置 URL / 版本
  - 方便修正错误上传。

- [ ] 支持导入外部 URL 配置
  - 用户可以直接填远程 skeleton / atlas URL。

## 9. 数据查询与调试

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

- [ ] 查询 attachment 列表
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

## 10. 碰撞与边界

- [ ] 读取 bounding box attachment
  - 用于攻击判定、受击判定、点击区域。

- [ ] 返回 bounding box 世界坐标多边形
  - 比 AABB 更准确。

- [ ] 增加 AABB 查询优化
  - 当前已有 bounds 查询，可进一步结合角色位置、缩放、旋转。

- [ ] 增加点是否在 bounding box 内判断
  - 适合鼠标点击、命中检测。

- [ ] 增加两个 bounding box 是否碰撞判断
  - 适合 Spine 角色之间的碰撞检测。

## 11. Gandi 专属能力整理

- [ ] 保留并强化 Gandi 上传能力
  - 当前使用 `runtime.ccwAPI.getUserInfo()` 和 `runtime.storage.store()`。
  - 后续目标只针对 Gandi，不做 TurboWarp 兼容。

- [ ] 保留 HTMLReport 能力
  - 当前通过 patch `visualReport` 和 `requestUpdateMonitor` 支持对象型报告器。

- [ ] 保留 SafeObject patch
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

- [ ] 上传失败时显示具体文件和原因
  - 当前错误提示过于笼统。

## 13. 代码结构与维护

- [ ] 拆分 `src/index.ts`
  - 当前主文件过大，包含注册、上传、菜单、加载、查询、动画、骨骼控制。

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

- [ ] 增加最小测试资源
  - 3.8 JSON / SKEL。
  - 4.0 JSON / SKEL。
  - 4.2 JSON / SKEL。
  - 包含动画、IK、slot、skin、event 的小样例。

## 14. 文档和示例

- [ ] 写完整上传说明
  - 文件要求。
  - 版本选择。
  - 转换 3.8 到 4.2 的临时方案。

- [ ] 写基础加载示例
  - 上传。
  - 刷新菜单。
  - 加载 skeleton。
  - 设置角色 skin。

- [ ] 写动画播放示例
  - idle。
  - walk。
  - attack 后回 idle。
  - 动画混合。

- [ ] 写骨骼指向示例
  - 枪口指向鼠标。
  - 头部看向角色。
  - 眼睛跟随鼠标。

- [ ] 写 IK 示例
  - 拖动手部目标点。
  - 手臂自然指向目标。

- [ ] 写换装示例
  - 切换 skin。
  - 替换武器 attachment。
  - 隐藏某个 slot。

- [ ] 写常见错误说明
  - `SkeletonData is not defined`。
  - id 变 `-1`：说明这是停止后清理行为，运行时需要重新加载。
  - 类型错误：说明 Skin / Skeleton / AnimationState 的区别。
  - 版本不匹配。

## 15. 暂不处理项

- [ ] 暂不适配 TurboWarp
  - 当前目标只做 Gandi。
  - TurboWarp 的 storage、renderer、HTMLReport、Blockly 暴露方式都不同，暂不投入。

- [ ] 暂不修复 `PROJECT_RUN_STOP` 后的 `gc()` 清理行为
  - 当前按特性处理。
  - 文档中说明停止后需要重新加载，或绿旗后延迟加载。

- [ ] 暂不优先处理骨架尺寸和中心点自动适配
  - 当前实测已基本可用，并且已有偏移设置能力。
  - 后续如果出现具体资源适配问题，再单独处理。
