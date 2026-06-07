/**
 * translate使用了一个新的namespace,与整体隔离,所以就不要前缀了,还能方便补全
 */
export default {
    // Metadata
    extensionName: 'spine骨骼动画',
    description: '在scratch中使用spine骨骼动画!',
    // Blocks
    initialize: '初始化',

    'upload.text': '上传Spine文件',
    'upload.inputFolder': '请输入spine文件夹:',
    'upload.folderRequired': '请输入文件夹名称！',
    'upload.noSkeleton': '请上传一个骨架文件(.skel 或 .json)',
    'upload.noAtlas': '请上传一个图集文件(.atlas)',
    'upload.multipleSkeleton': '只能上传一个骨架文件(.skel 或 .json)',
    'upload.missingAtlasImages': 'atlas引用了未选择的图片文件:\n{files}',
    'upload.selectVersion': '请选择使用的spine运行时版本',
    'upload.detectedVersion': '检测到推荐版本: {version}',
    'upload.invalidVersion': '版本选择无效',
    'upload.confirmUpload':
        '⚠请确认文件名是否正确⚠\n{files}\n以上文件将被上传到{folder}中',
    'upload.confirmOverwrite': '配置 {name} 已存在，是否覆盖？',
    'upload.preview':
        '骨架文件: {skeleton}\natlas文件: {atlas}\n图片文件:\n{images}\n推荐版本: {version}',
    'upload.success': '上传完成！',
    'upload.failed': '上传失败',

    'createSpineConfig.text':
        '创建spine配置,骨骼文件url为[SKEL_URL],图集文件url为[ATLAS_URL],版本为[VERSION]',
    'createDataURLSpineConfig.text': '选择本地Spine文件创建dataURL配置,版本为[VERSION]',

    'refreshMenu.text': '刷新Spine文件菜单',
    refreshing: '(刷新中)',
    'deleteSpineConfig.text': '删除Spine配置[NAME]',
    'deleteSpineConfig.confirm': '确定删除Spine配置 {name} 吗？',
    'renameSpineConfig.text': '重命名Spine配置[OLD_NAME]为[NEW_NAME]',
    'editSpineConfig.text': '编辑Spine配置[NAME]骨骼[SKEL_URL]图集[ATLAS_URL]版本[VERSION]',

    'loadSkeleton.text': '加载配置为[CONFIG]的spine骨骼并命名为[NAME]',
    'loadSkeleton.configError': '请输入有效配置',

    'setSkinSkeleton.text': '将角色[TARGET_NAME]的skin设为Skin[SKELETON]',
    'setSkinSkeleton.skeletonIdError': '请输入数字或有效的skeleton数据',
    'setSkinSkeleton.characterNotFound': '找不到名为{name}的角色',

    data: '数据',
    'setRelativePos.text': '设置skin[SKIN]的骨架偏移为[POS]',

    'getSthOf.text': '获取[DATA]的',

    'getSthMenu.none': '无可获取项目',
    'getSthMenu.needUpdate': '待补充',
    'getSthMenu.skin.name': '皮肤的名称',
    'getSthMenu.skin.skeleton': '皮肤中的骨架',
    'getSthMenu.skin.x': '皮肤的骨架x偏移',
    'getSthMenu.skin.y': '皮肤的骨架y偏移',
    'getSthMenu.skin.animationState': '皮肤的animationState',
    'getSthMenu.skeleton.bones': '骨架的全部骨骼',
    'getSthMenu.skeleton.animations': '骨架的全部动画',
    'getSthMenu.skeleton.skins': '骨架的全部皮肤',
    'getSthMenu.skeleton.slots': '骨架的全部slot',
    'getSthMenu.skeleton.events': '骨架的全部事件',
    'getSthMenu.skeleton.ikConstraints': '骨架的全部IK约束',
    'getSthMenu.skeleton.transformConstraints': '骨架的全部Transform约束',
    'getSthMenu.skeleton.pathConstraints': '骨架的全部Path约束',
    'getSthMenu.skeleton.bone': '骨架的骨骼',
    'getSthMenu.skeleton.bone.ID_prefix': ',名为',
    'getSthMenu.skeleton.bounds': '骨架的AABB边界盒',
    'getSthMenu.bone.pos': '骨骼世界坐标',
    'getSthMenu.bone.localRotation': '骨骼局部旋转',
    'getSthMenu.bone.worldRotation': '骨骼世界旋转',
    'getSthMenu.bone.scale': '骨骼缩放',
    'getSthMenu.animationState.playing': 'animationState中的动画名',
    'getSthMenu.animationState.loop': 'animationState中的动画是否循环',
    'getSthMenu.animationState.trackTime': 'animationState中的播放时间',
    'getSthMenu.animationState.progress': 'animationState中的播放进度',
    'getSthMenu.animationState.event': 'animationState缓存的动画事件',
    'getSthMenu.animationState.TRACK_prefix': '在Track',

    'setBonePos.text': '设置骨骼[BONE]的世界坐标为[POS]',
    'setBonePos.tip': '[~,0]表示x坐标不变,y坐标改为0',
    'pointBoneTo.text': '让骨骼[BONE]指向舞台坐标[POS],角度偏移[OFFSET]度',
    'pointBoneTo.tip': 'POS格式为x,y；OFFSET用于修正不同骨骼默认朝向',
    'setIkTargetPos.text': '设置骨架[SKELETON]中IK[NAME]的目标位置为[POS]',
    'setIkTargetPos.tip': 'POS格式为x,y；需要Spine资源本身已配置IK约束',
    'getIkConstraintInfo.text': '获取骨架[SKELETON]中IK[NAME]的信息',
    'setTransformConstraintField.text':
        '设置骨架[SKELETON]中Transform约束[NAME]的[FIELD]为[VALUE]',
    'getTransformConstraintInfo.text': '获取骨架[SKELETON]中Transform约束[NAME]的信息',
    'setPathConstraintField.text':
        '设置骨架[SKELETON]中Path约束[NAME]的[FIELD]为[VALUE]',
    'getPathConstraintInfo.text': '获取骨架[SKELETON]中Path约束[NAME]的信息',
    'setBoneRotation.text': '设置骨骼[BONE]的[SPACE]旋转为[ROTATION]度',
    'setBoneScale.text': '设置骨骼[BONE]缩放为[SCALE]',
    'convertBonePos.text': '将骨骼[BONE]坐标[POS][MODE]',
    'setSkeletonSkin.text': '将骨架[SKELETON]的皮肤切换为[NAME]',
    'combineSkeletonSkins.text': '将骨架[SKELETON]的多个皮肤组合为[NAMES]',
    'getSlotAttachment.text': '获取骨架[SKELETON]的slot[SLOT]当前附件',
    'getSlotAttachments.text': '获取骨架[SKELETON]皮肤[SKIN]中slot[SLOT]可用附件',
    'setSlotAttachment.text': '将骨架[SKELETON]的slot[SLOT]附件设为[ATTACHMENT]',
    'hideSlotAttachment.text': '隐藏骨架[SKELETON]的slot[SLOT]附件',
    'getBoundingBoxes.text': '获取骨架[SKELETON]当前可见碰撞框',
    'getBoundingBoxVertices.text': '获取骨架[SKELETON]碰撞框[NAME]世界顶点',
    'getBoundingBoxAabb.text': '获取骨架[SKELETON]碰撞框[NAME]的AABB',
    'isPointInBoundingBox.text': '点[POS]在骨架[SKELETON]碰撞框[NAME]内',
    'areBoundingBoxesIntersecting.text': '骨架[A]碰撞框[BOX_A]碰到骨架[B]碰撞框[BOX_B]',

    animation: '动画',
    'addAnimation.text':
        '向AnimationState[STATE]的track[TRACK][ACTION]名为[NAME]的动画并[LOOP]循环,延迟[DELAY]秒',

    'addEmptyAnimation.text':
        '在AnimationState[STATE]的track[TRACK]上[ACTION]空动画,混合时间[MIX]秒',
    'setDefaultMix.text': '设置AnimationState[STATE]的默认动画过渡时间为[MIX]秒',
    'setAnimationMix.text':
        '设置AnimationState[STATE]从动画[FROM]到动画[TO]的过渡时间为[MIX]秒',
    'setAnimationTimeScale.text': '设置AnimationState[STATE]的播放速度为[SCALE]倍',
    'pauseAnimationState.text': '暂停AnimationState[STATE]',
    'resumeAnimationState.text': '继续AnimationState[STATE]',
    'clearAnimationTrack.text': '停止AnimationState[STATE]的track[TRACK]',
    'clearAnimationTracks.text': '停止AnimationState[STATE]的全部track',
    'setTrackTime.text': '设置AnimationState[STATE]的track[TRACK]播放时间为[TIME]秒',
    'setTrackProgress.text': '设置AnimationState[STATE]的track[TRACK]播放进度为[PROGRESS]',
    'listenAnimationEvents.text': '开始监听AnimationState[STATE]的动画事件',
    'popAnimationEvent.text': '取出AnimationState[STATE]最早的动画事件',
    'popFilteredAnimationEvent.text':
        '取出AnimationState[STATE]中track[TRACK]动画[ANIMATION]类型[TYPE]的事件',
    'getAnimationStateMonitor.text': '获取AnimationState[STATE]的监视信息',
    'registerAnimationState.text':
        '为AnimationState[STATE]注册状态[NAME]动画[ANIMATION]track[TRACK]循环[LOOP]优先级[PRIORITY]混合[MIX]秒',
    'setAnimationStateReturn.text': '设置AnimationState[STATE]状态[NAME]播完后[MODE]返回[RETURN]',
    'switchAnimationState.text': '切换AnimationState[STATE]到状态[NAME]',
    'setAnimationStateInput.text': '设置AnimationState[STATE]输入[KEY]为[VALUE]',
    'getAnimationStateMachineInfo.text': '获取AnimationState[STATE]状态机信息',

    'addAnimation.invalidTrack': '无效的track',
    // Menu
    'spriteMenu.currentTarget': '当前角色',

    'animation_action_menu.add': '队列添加',
    'animation_action_menu.set': '立即播放',
    'bone_space_menu.local': '局部',
    'bone_space_menu.world': '世界',
    'bone_convert_menu.worldToLocal': '转为局部坐标',
    'bone_convert_menu.localToWorld': '转为世界坐标',
    'state_return_mode.none': '不返回',
    'state_return_mode.fixed': '固定状态',
    'state_return_mode.input': '按输入',

    'animationCompleted.text':
        'AnimationState[STATE]的Track[TRACK]已完成一次播放',

    'BOOLEAN.true': '进行',
    'BOOLEAN.false': '不',
    // Utils
    'HTMLReport.monitorPrefix': '(⛔无需保存⛔)',

    'SpineSkinReport.type': 'spine skin',
    'SpineSkinReport.id': 'id为 ',
    'SpineSkinReport.version': '版本为 ',
    'SpineSkinReport.nameText': '名称为 ',
    'SpineSkinReport.monitor':
        '(spine皮肤) id为{id}, 版本为{version}, 名称为{name}',

    'SpineSkeletonReport.type': 'spine骨架',
    'SpineSkeletonReport.nameText': '名称为 ',
    'SpineSkeletonReport.boneNum': '骨骼总数为 ',
    'SpineSkeletonReport.monitor':
        '(spine骨架) 名称为{name}, 骨骼总数为{boneNum}',

    'SpineAnimationStateReport.trackPlaying':
        'Track {id} {loop,select,true{正在循环} other{{complete,select,true{已完成} other{正在}}播放}}动画',
    'SpineBoneReport.type': '{name}的Spine骨骼',
    'SpineBoneReport.nameText': '骨骼名称为 ',
    'SpineBoneReport.monitor': '({name}的Spine骨骼), 名称为{boneName}',
    typeError: '🚫类型错误🚫',
    enable: '启用',
    disable: '禁用',
    debugRender: '{action} 调试渲染',
} as const;
