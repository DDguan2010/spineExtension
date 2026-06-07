import type zh_cn from './zh_cn';
export default {
    // Metadata
    extensionName: 'Spine Animation',
    description: 'Use Spine animation in Scratch!',
    // Blocks
    initialize: 'Initialize',

    'upload.text': 'Upload Spine Files',
    'upload.inputFolder': 'Please input spine folder:',
    'upload.folderRequired': 'Please input folder name!',
    'upload.noSkeleton': 'Please upload a skeleton file (.skel or .json)',
    'upload.noAtlas': 'Please upload an atlas file (.atlas)',
    'upload.multipleSkeleton':
        'Only one skeleton file (.skel or .json) allowed',
    'upload.missingAtlasImages':
        'Atlas references image files that were not selected:\n{files}',
    'upload.selectVersion': 'Please select Spine runtime version',
    'upload.detectedVersion': 'Detected recommended version: {version}',
    'upload.invalidVersion': 'Invalid version selection',
    'upload.confirmUpload':
        '⚠Please confirm file names are correct⚠\n{files}\nThese files will be uploaded to {folder}',
    'upload.confirmOverwrite': 'Config {name} already exists. Overwrite?',
    'upload.preview':
        'Skeleton file: {skeleton}\nAtlas file: {atlas}\nImage files:\n{images}\nRecommended version: {version}',
    'upload.success': 'Upload completed!',
    'upload.failed': 'Upload failed',

    'refreshMenu.text': 'Refresh Spine Files Menu',
    refreshing: '(refreshing)',
    'deleteSpineConfig.text': 'Delete Spine config [NAME]',
    'deleteSpineConfig.confirm': 'Delete Spine config {name}?',
    'renameSpineConfig.text': 'Rename Spine config [OLD_NAME] to [NEW_NAME]',
    'editSpineConfig.text':
        'Edit Spine config [NAME] skeleton [SKEL_URL] atlas [ATLAS_URL] version [VERSION]',

    'createSpineConfig.text':
        'Create Spine Config,Skeleton url:[SKEL_URL],Atlas url:[ATLAS_URL],Version:[VERSION]',
    'createDataURLSpineConfig.text':
        'Select local Spine files to create dataURL config, Version:[VERSION]',

    'loadSkeleton.text':
        'Load the spine skeleton with configuration [CONFIG] and name it [NAME]',
    'loadSkeleton.configError': 'Please input correct configs',

    'setSkinSkeleton.text':
        'Set the skin of character [TARGET_NAME] to Skin:[SKELETON]',
    'setSkinSkeleton.skeletonIdError': 'Please input valid Skeleton data!',
    'setSkinSkeleton.characterNotFound': 'Cannot find character named {name}',

    data: 'Data',
    'setRelativePos.text': "Set Skin [SKIN] 's relative pos to [POS]",

    'getSthOf.text': "Get [DATA]'s ",
    'getSthMenu.none': 'NONE',
    'getSthMenu.needUpdate': 'will be updated',
    'getSthMenu.skin.name': 'Name of Skin',
    'getSthMenu.skin.skeleton': 'Skeleton in Skin',
    'getSthMenu.skin.x': 'relative x pos of Skin',
    'getSthMenu.skin.y': 'relative y pos of Skin',
    'getSthMenu.skin.animationState': 'AnimationState of Skin',
    'getSthMenu.skeleton.bones': 'all names of bones in Skeleton',
    'getSthMenu.skeleton.animations': 'all names of animations in Skeleton',
    'getSthMenu.skeleton.skins': 'all names of skins in Skeleton',
    'getSthMenu.skeleton.slots': 'all names of slots in Skeleton',
    'getSthMenu.skeleton.events': 'all names of events in Skeleton',
    'getSthMenu.skeleton.ikConstraints': 'all names of IK constraints',
    'getSthMenu.skeleton.transformConstraints':
        'all names of transform constraints',
    'getSthMenu.skeleton.pathConstraints': 'all names of path constraints',
    'getSthMenu.skeleton.bone': 'Bone in Skeleton',
    'getSthMenu.skeleton.bone.ID_prefix': ', Named',
    'getSthMenu.skeleton.bounds': 'AABB Bounds of Skeleton',
    'getSthMenu.bone.pos': 'Bone World Pos',
    'getSthMenu.bone.localRotation': 'Bone local rotation',
    'getSthMenu.bone.worldRotation': 'Bone world rotation',
    'getSthMenu.bone.scale': 'Bone scale',
    'getSthMenu.animationState.playing': 'Name of Animation',
    'getSthMenu.animationState.loop': 'Animation is Loop?',
    'getSthMenu.animationState.trackTime': 'Track playback time',
    'getSthMenu.animationState.progress': 'Track playback progress',
    'getSthMenu.animationState.event': 'Cached animation event',
    'getSthMenu.animationState.TRACK_prefix': 'In track',

    'setBonePos.text': "Set Bone [BONE]'s world pos to [POS]",
    'setBonePos.tip': "[~,0] means don't change x, change y to 0",
    'pointBoneTo.text':
        'Point Bone [BONE] to stage pos [POS], angle offset [OFFSET] degrees',
    'pointBoneTo.tip':
        'POS format is x,y; OFFSET adjusts different bone forward directions',
    'setIkTargetPos.text':
        'Set IK [NAME] target position in Skeleton [SKELETON] to [POS]',
    'setIkTargetPos.tip':
        'POS format is x,y; the Spine resource must already have IK constraints',
    'getIkConstraintInfo.text': 'Get Skeleton [SKELETON] IK [NAME] info',
    'setTransformConstraintField.text':
        'Set Skeleton [SKELETON] Transform constraint [NAME] [FIELD] to [VALUE]',
    'getTransformConstraintInfo.text':
        'Get Skeleton [SKELETON] Transform constraint [NAME] info',
    'setPathConstraintField.text':
        'Set Skeleton [SKELETON] Path constraint [NAME] [FIELD] to [VALUE]',
    'getPathConstraintInfo.text': 'Get Skeleton [SKELETON] Path constraint [NAME] info',
    'setBoneRotation.text': 'Set Bone [BONE] [SPACE] rotation to [ROTATION] degrees',
    'setBoneScale.text': 'Set Bone [BONE] scale to [SCALE]',
    'convertBonePos.text': 'Convert Bone [BONE] pos [POS] [MODE]',
    'setSkeletonSkin.text': 'Set Skeleton [SKELETON] skin to [NAME]',
    'combineSkeletonSkins.text': 'Combine Skeleton [SKELETON] skins [NAMES]',
    'getSlotAttachment.text': 'Get Skeleton [SKELETON] slot [SLOT] current attachment',
    'getSlotAttachments.text':
        'Get Skeleton [SKELETON] skin [SKIN] slot [SLOT] attachments',
    'setSlotAttachment.text':
        'Set Skeleton [SKELETON] slot [SLOT] attachment to [ATTACHMENT]',
    'hideSlotAttachment.text': 'Hide Skeleton [SKELETON] slot [SLOT] attachment',
    'getBoundingBoxes.text': 'Get Skeleton [SKELETON] visible bounding boxes',
    'getBoundingBoxVertices.text':
        'Get Skeleton [SKELETON] bounding box [NAME] world vertices',
    'getBoundingBoxAabb.text': 'Get Skeleton [SKELETON] bounding box [NAME] AABB',
    'isPointInBoundingBox.text':
        'Point [POS] is in Skeleton [SKELETON] bounding box [NAME]',
    'areBoundingBoxesIntersecting.text':
        'Skeleton [A] bounding box [BOX_A] touches Skeleton [B] bounding box [BOX_B]',

    animation: 'Animation',
    'addAnimation.text':
        'On AnimationState [STATE], track [TRACK], [ACTION] animation [NAME], [LOOP] loop, delay [DELAY]s',
    'addAnimation.invalidTrack': 'Invalid Track!',

    'addEmptyAnimation.text':
        'On AnimationState [STATE], track [TRACK], [ACTION] empty animation, mix duration: [MIX]s',
    'setDefaultMix.text':
        'Set AnimationState [STATE] default animation mix duration to [MIX]s',
    'setAnimationMix.text':
        'Set AnimationState [STATE] mix from animation [FROM] to [TO] to [MIX]s',
    'setAnimationTimeScale.text':
        'Set AnimationState [STATE] playback speed to [SCALE]x',
    'pauseAnimationState.text': 'Pause AnimationState [STATE]',
    'resumeAnimationState.text': 'Resume AnimationState [STATE]',
    'clearAnimationTrack.text': 'Stop AnimationState [STATE] track [TRACK]',
    'clearAnimationTracks.text': 'Stop all tracks of AnimationState [STATE]',
    'setTrackTime.text':
        'Set AnimationState [STATE] track [TRACK] playback time to [TIME]s',
    'setTrackProgress.text':
        'Set AnimationState [STATE] track [TRACK] playback progress to [PROGRESS]',
    'listenAnimationEvents.text': 'Start listening AnimationState [STATE] events',
    'popAnimationEvent.text': 'Pop oldest AnimationState [STATE] event',
    'popFilteredAnimationEvent.text':
        'Pop AnimationState [STATE] event track [TRACK] animation [ANIMATION] type [TYPE]',
    'getAnimationStateMonitor.text': 'Get AnimationState [STATE] monitor info',
    'registerAnimationState.text':
        'Register AnimationState [STATE] state [NAME] animation [ANIMATION] track [TRACK] loop [LOOP] priority [PRIORITY] mix [MIX]s',
    'setAnimationStateReturn.text':
        'Set AnimationState [STATE] state [NAME] return [MODE] to [RETURN] after complete',
    'switchAnimationState.text': 'Switch AnimationState [STATE] to state [NAME]',
    'setAnimationStateInput.text': 'Set AnimationState [STATE] input [KEY] to [VALUE]',
    'getAnimationStateMachineInfo.text': 'Get AnimationState [STATE] state machine info',
    // Menu
    'spriteMenu.currentTarget': 'Current target',

    'animation_action_menu.add': 'Queue',
    'animation_action_menu.set': 'Set',
    'bone_space_menu.local': 'local',
    'bone_space_menu.world': 'world',
    'bone_convert_menu.worldToLocal': 'to local pos',
    'bone_convert_menu.localToWorld': 'to world pos',
    'state_return_mode.none': 'none',
    'state_return_mode.fixed': 'fixed',
    'state_return_mode.input': 'input',

    'animationCompleted.text':
        "AnimationState [STATE]'s Track[TRACK] is completed",

    'BOOLEAN.true': 'do',
    'BOOLEAN.false': 'do not',
    // Utils
    'HTMLReport.monitorPrefix': '(⛔No Need to Save⛔)',

    'SpineSkinReport.type': 'Spine Skin',
    'SpineSkinReport.id': 'Id is ',
    'SpineSkinReport.version': 'Version is ',
    'SpineSkinReport.nameText': 'Name is ',
    'SpineSkinReport.monitor':
        '(Spine Skin) Id is {id}, Version is {version}, Name is {name}',

    'SpineSkeletonReport.type': 'Spine Skeleton',
    'SpineSkeletonReport.nameText': 'Name is ',
    'SpineSkeletonReport.boneNum': 'Total Bone num is ',
    'SpineSkeletonReport.monitor':
        '(Spine Skeleton) Name is {name}, Total Bone num is {boneNum}',

    'SpineAnimationStateReport.trackPlaying':
        'Track {id} {loop,select,true{is looping} other{{complete,select,true{has done} other{is playing}}}} animation ',

    'SpineBoneReport.type': "{name}'s Spine Bone",
    'SpineBoneReport.nameText': 'Bone name is ',
    'SpineBoneReport.monitor': "({name}'s Spine Bone), Name is {boneName}",
    typeError: '🚫type error🚫',
    enable: 'Enable',
    disable: 'Disable',
    debugRender: '{action} Debug Render',
} as const satisfies {
    [K in keyof typeof zh_cn]: string;
};
