import { registerExtDetail } from './scratch/register';
import { getTranslate, zh_cn, en } from './i18n/translate';
import { SimpleExt } from './scratch/simpleExt';
import type { extInfo, MenuItems } from './scratch/simpleExt';
import type VM from 'scratch-vm';
import { scratchStorageUI, StorageConfig } from './util/storage';
import { SpineSkin, patchSpineSkin } from './spineSkin';
import spineVersions, {
    AnimationState,
    Skeleton,
    VersionNames,
    Bone,
} from './spine/spineVersions';
import { SpineManager } from './spineManager';
import { patch, HTMLReport } from './util/htmlReport';
import {
    SpineSkinReport,
    SpineSkeletonReport,
    SpineAnimationStateReport,
    SpineBoneReport,
} from './util/spineReports';
import { setupCustomBlocks } from './util/customBlock';
import { GetSthMenuItems } from './util/customBlocks/getSth';
import { GandiRuntime } from '../types/gandi-type';
import { getLogger } from './logSystem';
import { SpineConfig } from './spineConfig';
import { trimPos } from './util/pos';
import { getStateAndTrack } from './util/argsParse';
import insetIcon_ from '../assets/insetIcon.png'; // 防止发布后icon消失
import { Vector2 } from '42webgl';

const insetIcon = insetIcon_;
// 'https://m.ccw.site/creator-college/cover/5ecb4a0ae781edb9ed8ed3d61d210ad7.svg';
const icon =
    'https://m.ccw.site/creator-college/cover/953085977e001622fd7153eb7c9ad646.png';
const NS = 'spineAnimation' as const;
const { BlockType, ArgumentType } = Scratch;
const MAX_PROXY_DEPTH = 5;
const translate = getTranslate();
let logger = getLogger('console', NS);
type Util = VM.BlockUtility;

function createADSProxy(target: object, depth: number = 0) {
    if (depth >= MAX_PROXY_DEPTH) {
        return `[DEPTH EXCEEDED!](${typeof target})`;
    }
    try {
        const proxy = new Proxy(target, {
            setPrototypeOf() {
                // ads会修改原型,造成问题
                return true;
            },
            getPrototypeOf(target) {
                return null;
            },
            get(target: object, key: string) {
                if (!(key in target)) {
                    return undefined;
                }
                if (target[key] instanceof Function) {
                    return null;
                }
                if (target[key] instanceof Object) {
                    let value = target[key];
                    if ('toJSON' in value) {
                        value = value.toJSON();
                    }
                    return createADSProxy(value, depth + 1);
                }
                return target[key];
            },
        });
        return proxy;
    } catch (e) {
        logger.warn(e, target);
        return null;
    }
}

class SpineExtension extends SimpleExt {
    runtime: GandiRuntime;
    managers: {
        [K in VersionNames]: SpineManager<K>;
    };
    renderer: RenderWebGL;
    enableDebugRender: boolean;
    skins: SpineSkin[];
    storage: scratchStorageUI;
    cloudConfig: StorageConfig;
    fetchingConfig: boolean;

    constructor(runtime: GandiRuntime) {
        super(NS, 'foo');
        this.runtime = runtime;
        this.storage = new scratchStorageUI(runtime.storage);
        this.renderer = runtime.renderer;
        patchSpineSkin(this.runtime);
        patch(this.runtime);
        this.setCustomBlock();
        this.patchADS();
        this.setupCallback();
        this.managers = {
            '4.0webgl': new SpineManager('4.0webgl', this.renderer),
            '4.2webgl': new SpineManager('4.2webgl', this.renderer),
            '3.8webgl': new SpineManager('3.8webgl', this.renderer),
        };
        this.enableDebugRender = false;
        this.skins = [];
        this.cloudConfig = {};
        this.fetchingConfig = false;
        this.refreshMenu();
    }

    /**
     * 注册自定义blockly
     */
    setCustomBlock() {
        if (!this.runtime.scratchBlocks) {
            logger.log('blockly未暴露，不进行patch');
            return;
        }
        setupCustomBlocks(this, NS);
    }

    /**
     * 创建回调函数
     */
    setupCallback() {
        const callbacks = {
            EXTENSION_ADDED: [this.patchADS.bind(this)],
            PROJECT_RUN_STOP: [() => setTimeout(this.gc.bind(this), 1000)],
        };
        for (const key in callbacks) {
            for (const callback of callbacks[key]) {
                this.runtime.on(key, callback);
            }
        }
        const disposeCallback = (info: extInfo) => {
            if (info.id === NS || !(`ext_${NS}` in this.runtime)) {
                // 扩展被卸载时清理listener
                this.onDispose(callbacks);
                this.runtime.off('EXTENSION_DELETED', disposeCallback);
            }
        };
        this.runtime.on('EXTENSION_DELETED', disposeCallback);
    }

    /**
     * 扩展卸载回调
     */
    onDispose(callbacks: { [event: string]: Function[] }) {
        logger.log(`%c[EXT Dispose] %c${NS}`, 'color:red', 'color:blue');
        for (const key in callbacks) {
            for (const callback of callbacks[key]) {
                this.runtime.off(key, callback);
            }
        }
    }

    /**
     * 删除skin
     */
    gc() {
        for (const skin of this.skins) {
            skin.dispose();
            delete this.renderer._allSkins[skin._id];
        }
        this.skins = [];
    }

    /**
     * patch 高级数据结构
     */
    patchADS(data?: { id: string }) {
        if (data && data.id !== 'moreDataTypes') {
            return;
        }
        type SafeObject = {
            getActualObject: (value: object) => object;
            orig_?: SafeObject;
        };
        if (!('SafeObject' in this.runtime)) {
            return;
        }
        const SafeObject = this.runtime.SafeObject as SafeObject;
        if ('orig_' in SafeObject) {
            // 如果之前patch过,进行修复
            SafeObject.getActualObject = SafeObject.orig_.getActualObject;
        }
        const orig = SafeObject.getActualObject;
        SafeObject.orig_ = { getActualObject: orig };
        SafeObject.getActualObject = function (value) {
            if (value instanceof HTMLReport) {
                return createADSProxy(value.valueOf());
            } else {
                return orig.call(this, value);
            }
        };
    }

    getInfo(): extInfo {
        const ext = this;
        this.info.name = translate('extensionName');
        this.info.blockIconURI = insetIcon;
        this.info.color1 = '#383f4c';
        this.info.color2 = '#2f3540';
        this.info.color3 = '#2f3540';
        this.info.blocks = [
            {
                func: this.switchDebug.name,
                get text() {
                    return translate('debugRender', {
                        action: ext.enableDebugRender
                            ? translate('disable')
                            : translate('enable'),
                    });
                },
                blockType: BlockType.BUTTON,
            },
            {
                text: translate('initialize'),
                blockType: BlockType.LABEL,
            },
            {
                text: translate('upload.text'),
                blockType: BlockType.BUTTON,
                func: this.startUpload.name,
            },
            {
                get text() {
                    return `${translate('refreshMenu.text')}${
                        ext.fetchingConfig ? translate('refreshing') : ''
                    }`;
                },
                blockType: BlockType.BUTTON,
                func: this.refreshMenu.name,
            },
            {
                opcode: this.createSpineConfig.name,
                text: translate('createSpineConfig.text'),
                blockType: BlockType.REPORTER,
                arguments: {
                    SKEL_URL: {
                        type: ArgumentType.STRING,
                        defaultValue:
                            'https://m.ccw.site/user_projects_assets/spine/Hina_home.skel',
                    },
                    ATLAS_URL: {
                        type: ArgumentType.STRING,
                        defaultValue:
                            'https://m.ccw.site/user_projects_assets/spine/Hina_home.atlas',
                    },
                    VERSION: {
                        type: ArgumentType.STRING,
                        menu: 'VERSION',
                    },
                },
            },
            {
                opcode: this.createDataURLSpineConfig.name,
                text: translate('createDataURLSpineConfig.text'),
                blockType: BlockType.REPORTER,
                arguments: {
                    VERSION: {
                        type: ArgumentType.STRING,
                        menu: 'VERSION',
                    },
                },
            },
            {
                opcode: this.loadSkeleton.name,
                text: translate('loadSkeleton.text'),
                blockType: BlockType.REPORTER,
                arguments: {
                    CONFIG: {
                        type: ArgumentType.STRING,
                        menu: 'skeleton_menu',
                    },
                    NAME: {
                        type: ArgumentType.STRING,
                        defaultValue: 'hina',
                    },
                },
            },
            {
                opcode: this.setSkinSkeleton.name,
                text: translate('setSkinSkeleton.text'),
                blockType: BlockType.COMMAND,
                arguments: {
                    TARGET_NAME: {
                        type: ArgumentType.STRING,
                        menu: 'sprite_menu',
                    },
                    SKELETON: {
                        type: ArgumentType.NUMBER,
                        defaultValue: 0,
                    },
                },
            },
            {
                blockType: BlockType.LABEL,
                text: translate('data'),
            },
            {
                opcode: this.setRelativePos.name,
                text: translate('setRelativePos.text'),
                blockType: BlockType.COMMAND,
                arguments: {
                    SKIN: {
                        type: null,
                    },
                    POS: {
                        type: ArgumentType.STRING,
                        defaultValue: JSON.stringify([0, 0]),
                    },
                },
            },
            {
                opcode: this.getSthOf.name,
                text: translate('getSthOf.text'),
                blockType: BlockType.REPORTER,
                arguments: {
                    DATA: {
                        type: null,
                    },
                },
            },
            {
                opcode: this.setBonePos.name,
                blockType: BlockType.COMMAND,
                text: translate('setBonePos.text'),
                tooltip: translate('setBonePos.tip'),
                arguments: {
                    BONE: {
                        type: null,
                    },
                    POS: {
                        type: ArgumentType.STRING,
                        defaultValue: '~, 0',
                    },
                },
            },
            {
                opcode: this.pointBoneTo.name,
                blockType: BlockType.COMMAND,
                text: translate('pointBoneTo.text'),
                tooltip: translate('pointBoneTo.tip'),
                arguments: {
                    BONE: {
                        type: null,
                    },
                    POS: {
                        type: ArgumentType.STRING,
                        defaultValue: '0, 0',
                    },
                    OFFSET: {
                        type: ArgumentType.NUMBER,
                        defaultValue: 0,
                    },
                },
            },
            {
                opcode: this.setIkTargetPos.name,
                blockType: BlockType.COMMAND,
                text: translate('setIkTargetPos.text'),
                tooltip: translate('setIkTargetPos.tip'),
                arguments: {
                    SKELETON: {
                        type: null,
                    },
                    NAME: {
                        type: ArgumentType.STRING,
                        defaultValue: 'ik',
                    },
                    POS: {
                        type: ArgumentType.STRING,
                        defaultValue: '0, 0',
                    },
                },
            },
            {
                opcode: this.setSkeletonSkin.name,
                blockType: BlockType.COMMAND,
                text: translate('setSkeletonSkin.text'),
                arguments: {
                    SKELETON: {
                        type: null,
                    },
                    NAME: {
                        type: ArgumentType.STRING,
                        defaultValue: 'default',
                    },
                },
            },
            {
                opcode: this.setSlotAttachment.name,
                blockType: BlockType.COMMAND,
                text: translate('setSlotAttachment.text'),
                arguments: {
                    SKELETON: {
                        type: null,
                    },
                    SLOT: {
                        type: ArgumentType.STRING,
                        defaultValue: 'slot',
                    },
                    ATTACHMENT: {
                        type: ArgumentType.STRING,
                        defaultValue: 'attachment',
                    },
                },
            },
            {
                opcode: this.hideSlotAttachment.name,
                blockType: BlockType.COMMAND,
                text: translate('hideSlotAttachment.text'),
                arguments: {
                    SKELETON: {
                        type: null,
                    },
                    SLOT: {
                        type: ArgumentType.STRING,
                        defaultValue: 'slot',
                    },
                },
            },
            {
                blockType: BlockType.LABEL,
                text: translate('animation'),
            },
            {
                opcode: this.addAnimation.name,
                text: translate('addAnimation.text'),
                blockType: BlockType.COMMAND,
                arguments: {
                    STATE: {
                        type: null,
                    },
                    TRACK: {
                        type: ArgumentType.NUMBER,
                        defaultValue: 0,
                    },
                    ACTION: {
                        type: ArgumentType.STRING,
                        menu: 'animation_action_menu',
                    },
                    NAME: {
                        type: ArgumentType.STRING,
                        defaultValue: 'Idle_01',
                    },
                    LOOP: {
                        type: ArgumentType.STRING,
                        menu: 'BOOLEAN',
                    },
                    DELAY: {
                        type: ArgumentType.NUMBER,
                        defaultValue: 0,
                    },
                },
            },
            {
                opcode: this.addEmptyAnimation.name,
                text: translate('addEmptyAnimation.text'),
                arguments: {
                    STATE: {
                        type: null,
                    },
                    TRACK: {
                        type: ArgumentType.NUMBER,
                        defaultValue: 0,
                    },
                    ACTION: {
                        type: ArgumentType.STRING,
                        menu: 'animation_action_menu',
                    },
                    MIX: {
                        type: ArgumentType.NUMBER,
                        defaultValue: 0,
                    },
                },
                blockType: BlockType.COMMAND,
            },
            {
                opcode: this.setDefaultMix.name,
                text: translate('setDefaultMix.text'),
                arguments: {
                    STATE: {
                        type: null,
                    },
                    MIX: {
                        type: ArgumentType.NUMBER,
                        defaultValue: 0.2,
                    },
                },
                blockType: BlockType.COMMAND,
            },
            {
                opcode: this.setAnimationMix.name,
                text: translate('setAnimationMix.text'),
                arguments: {
                    STATE: {
                        type: null,
                    },
                    FROM: {
                        type: ArgumentType.STRING,
                        defaultValue: 'idle',
                    },
                    TO: {
                        type: ArgumentType.STRING,
                        defaultValue: 'walk',
                    },
                    MIX: {
                        type: ArgumentType.NUMBER,
                        defaultValue: 0.2,
                    },
                },
                blockType: BlockType.COMMAND,
            },
            {
                opcode: this.setAnimationTimeScale.name,
                text: translate('setAnimationTimeScale.text'),
                arguments: {
                    STATE: {
                        type: null,
                    },
                    SCALE: {
                        type: ArgumentType.NUMBER,
                        defaultValue: 1,
                    },
                },
                blockType: BlockType.COMMAND,
            },
            {
                opcode: this.pauseAnimationState.name,
                text: translate('pauseAnimationState.text'),
                arguments: {
                    STATE: {
                        type: null,
                    },
                },
                blockType: BlockType.COMMAND,
            },
            {
                opcode: this.resumeAnimationState.name,
                text: translate('resumeAnimationState.text'),
                arguments: {
                    STATE: {
                        type: null,
                    },
                },
                blockType: BlockType.COMMAND,
            },
            {
                opcode: this.clearAnimationTrack.name,
                text: translate('clearAnimationTrack.text'),
                arguments: {
                    STATE: {
                        type: null,
                    },
                    TRACK: {
                        type: ArgumentType.NUMBER,
                        defaultValue: 0,
                    },
                },
                blockType: BlockType.COMMAND,
            },
            {
                opcode: this.clearAnimationTracks.name,
                text: translate('clearAnimationTracks.text'),
                arguments: {
                    STATE: {
                        type: null,
                    },
                },
                blockType: BlockType.COMMAND,
            },
            {
                opcode: this.animationCompleted.name,
                text: translate('animationCompleted.text'),
                arguments: {
                    STATE: {
                        type: null,
                    },
                    TRACK: {
                        type: ArgumentType.NUMBER,
                        defaultValue: 0,
                    },
                },
                blockType: BlockType.BOOLEAN,
            },
            /* {
                func: this.initUI.name,
                blockType: BlockType.BUTTON,
                text: 'abcd',
            }, */
        ];
        this.info.menus = {
            sprite_menu: {
                items: this.spriteMenu.name,
                acceptReporters: true,
            },
            skeleton_menu: {
                items: this.skeletonMenu.name,
                acceptReporters: true,
            },
            animation_action_menu: {
                items: [
                    {
                        text: translate('animation_action_menu.add'),
                        value: 'add',
                    },
                    {
                        text: translate('animation_action_menu.set'),
                        value: 'set',
                    },
                ],
                acceptReporters: true,
            },
            BOOLEAN: {
                items: [
                    { text: translate('BOOLEAN.true'), value: true },
                    { text: translate('BOOLEAN.false'), value: false },
                ],
                acceptReporters: true,
            },
            VERSION: {
                items: Object.keys(this.managers).map((v) => ({
                    text: v,
                    value: v,
                })),
                acceptReporters: true,
            },
        };
        return this.info;
    }

    spriteMenu(): MenuItems {
        const items: MenuItems = [
            {
                text: translate('spriteMenu.currentTarget'),
                value: '__this__',
            },
        ];
        for (const target of this.runtime.targets) {
            if (target.isSprite()) {
                if (target.id !== this.runtime.getEditingTarget()?.id) {
                    items.push({
                        text: target.sprite.name,
                        value: target.sprite.name,
                    });
                }
            }
        }
        return items;
    }

    createSpineConfig(args: {
        ATLAS_URL: string;
        SKEL_URL: string;
        VERSION: VersionNames;
    }) {
        const { SKEL_URL, ATLAS_URL, VERSION } = args;
        let skel = String(SKEL_URL);
        let atlas = String(ATLAS_URL);
        return JSON.stringify(
            new SpineConfig({
                skel,
                atlas,
                version: VERSION,
            }),
        );
    }

    async createDataURLSpineConfig(args: { VERSION: VersionNames }) {
        const files = await this.selectFiles();
        if (!files || files.length === 0) {
            return '';
        }

        const validation = this.validateSpineFiles(files);
        if (!validation.valid) {
            alert(validation.error);
            return '';
        }

        const atlasValidation = await this.validateAtlasImages(
            files,
            validation.atlasFile!,
        );
        if (!atlasValidation.valid) {
            alert(
                translate('upload.missingAtlasImages', {
                    files: atlasValidation.missing.join('\n'),
                }),
            );
            return '';
        }

        const rawDataURIs: Record<string, string> = {};
        for (const file of files) {
            rawDataURIs[file.name] = await this.readFileAsDataURL(file);
        }

        return JSON.stringify(
            new SpineConfig({
                skel: validation.skelFile!.name,
                atlas: validation.atlasFile!.name,
                version: args.VERSION,
                rawDataURIs,
            }),
        );
    }

    /**
     * by AI: Trae
     *
     * audit: BPDXZ
     *
     * 验证上传的 Spine 文件集合是否有效
     * 检查是否包含必需的骨架文件(.skel/.json)和图集文件(.atlas)
     * 确保只有一个骨架文件存在
     * @param files - 待验证的文件数组
     * @returns 验证结果对象，包含验证状态、文件引用和错误信息
     */
    private validateSpineFiles(files: File[]): {
        valid: boolean;
        skelFile?: File;
        atlasFile?: File;
        error?: string;
    } {
        const skelFile = files.find((f) =>
            f.name.toLowerCase().endsWith('.skel'),
        );
        const jsonFile = files.find((f) =>
            f.name.toLowerCase().endsWith('.json'),
        );
        const atlasFile = files.find((f) =>
            f.name.toLowerCase().endsWith('.atlas'),
        );

        const skeletonFile = skelFile || jsonFile;

        if (!skeletonFile) {
            return {
                valid: false,
                error: translate('upload.noSkeleton'),
            };
        }

        if (!atlasFile) {
            return {
                valid: false,
                error: translate('upload.noAtlas'),
            };
        }

        if (skelFile && jsonFile) {
            return {
                valid: false,
                error: translate('upload.multipleSkeleton'),
            };
        }

        return {
            valid: true,
            skelFile: skeletonFile,
            atlasFile,
        };
    }

    private async validateAtlasImages(files: File[], atlasFile: File) {
        const atlasText = await atlasFile.text();
        const pngFiles = new Set(
            files
                .filter((file) => file.name.toLowerCase().endsWith('.png'))
                .map((file) => file.name),
        );
        const pages = atlasText
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(
                (line) =>
                    line &&
                    line.toLowerCase().endsWith('.png') &&
                    !line.includes(':') &&
                    !line.includes(','),
            );
        const missing = pages.filter((page) => !pngFiles.has(page));
        return { valid: missing.length === 0, missing };
    }

    /**
     * by AI: Trae
     *
     * audit: BPDXZ
     *
     * 弹出对话框让用户选择 Spine 运行时版本
     * 显示所有可用版本列表，验证用户输入
     * @returns 有效的版本名称，如果用户取消或输入无效则返回 null
     */
    private selectVersion(detectedVersion?: VersionNames): VersionNames | null {
        const versions = Object.keys(spineVersions);
        const version = prompt(
            translate('upload.selectVersion') +
                (detectedVersion
                    ? '\n' + translate('upload.detectedVersion', { version: detectedVersion })
                    : '') +
                '\n' +
                versions.join('\n'),
            detectedVersion || '',
        );

        if (!version || !(version in spineVersions)) {
            return null;
        }

        return version as VersionNames;
    }

    private async detectRuntimeVersion(file: File): Promise<VersionNames | null> {
        if (!file.name.toLowerCase().endsWith('.json')) {
            return null;
        }
        try {
            const json = JSON.parse(await file.text());
            const version = String(json?.skeleton?.spine || '');
            if (version.startsWith('3.8')) return '3.8webgl';
            if (version.startsWith('4.0')) return '4.0webgl';
            if (version.startsWith('4.2')) return '4.2webgl';
        } catch (e) {
            logger.warn('detect spine version failed', e);
        }
        return null;
    }

    private readFileAsDataURL(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
    }

    /**
     * by AI: Trae
     *
     * audit: BPDXZ
     *
     * 批量上传文件到云端存储
     * 将文件名拆分为名称和扩展名，调用存储接口上传每个文件
     * @param files - 要上传的文件数组
     * @param rootFolder - 目标存储路径前缀
     * @returns Promise，所有文件上传完成后 resolve
     */
    private async uploadFiles(
        files: File[],
        rootFolder: string,
    ): Promise<void> {
        const uploadPromises = files.map(async (file) => {
            const lastDotIndex = file.name.lastIndexOf('.');
            const fileName = file.name.substring(0, lastDotIndex);
            const ext = file.name.substring(lastDotIndex + 1).toLowerCase();

            let mimeType = 'text/plain';
            if (ext === 'png') mimeType = 'image/png';
            else if (ext === 'skel') mimeType = 'application/octet-stream';
            else if (ext === 'json') mimeType = 'application/json';

            return this.storage.storeFile(
                mimeType,
                rootFolder + fileName,
                ext,
                await file.arrayBuffer(),
            );
        });

        await Promise.all(uploadPromises);
    }

    async startUpload() {
        try {
            const { userId } = await this.runtime.ccwAPI.getUserInfo();
            const userAssetUrl = `spine/${userId}/`;

            const spineFolder = prompt(
                translate('upload.inputFolder') + '\n' + userAssetUrl,
            );

            if (!spineFolder || !spineFolder.trim()) {
                alert(translate('upload.folderRequired'));
                return;
            }

            const rootFolder = userAssetUrl + spineFolder.trim() + '/';

            const files = await this.selectFiles();
            if (!files || files.length === 0) {
                return;
            }

            const validation = this.validateSpineFiles(files);
            if (!validation.valid) {
                alert(validation.error);
                return;
            }

            const atlasValidation = await this.validateAtlasImages(
                files,
                validation.atlasFile!,
            );
            if (!atlasValidation.valid) {
                alert(
                    translate('upload.missingAtlasImages', {
                        files: atlasValidation.missing.join('\n'),
                    }),
                );
                return;
            }

            const fileList = files.map((f) => f.name).join('\n');
            const confirmMsg = translate('upload.confirmUpload', {
                files: fileList,
                folder: rootFolder,
            });

            if (!confirm(confirmMsg)) {
                return;
            }

            const detectedVersion = await this.detectRuntimeVersion(
                validation.skelFile!,
            );
            const version = this.selectVersion(detectedVersion);
            if (!version) {
                alert(translate('upload.invalidVersion'));
                return;
            }

            const skelPath = rootFolder + validation.skelFile!.name;
            const atlasPath = rootFolder + validation.atlasFile!.name;

            await this.uploadFiles(files, rootFolder);

            await this.storage.saveConfig(userId, spineFolder.trim(), {
                skel: skelPath,
                atlas: atlasPath,
                version,
            });

            alert(translate('upload.success'));
            await this.refreshMenu();
        } catch (error) {
            logger.error('Upload failed:', error);
            alert(
                translate('upload.failed') +
                    ': ' +
                    (error instanceof Error ? error.message : String(error)),
            );
        }
    }

    /**
     * by AI: Trae
     *
     * audit: BPDXZ
     *
     * 创建文件选择对话框并等待用户选择文件
     * 使用 Promise 封装 input 元素的 change 事件，支持异步调用
     * @returns Promise，用户选择文件后 resolve 文件数组，取消选择则 resolve null
     */
    private selectFiles(): Promise<File[] | null> {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.accept = '.png,.atlas,.skel,.json';

            input.addEventListener('change', () => {
                if (input.files && input.files.length > 0) {
                    resolve(Array.from(input.files));
                } else {
                    resolve(null);
                }
            });

            input.click();
        });
    }

    async refreshMenu() {
        if (this.fetchingConfig) {
            return;
        }
        this.fetchingConfig = true;
        this.runtime.emit('TOOLBOX_EXTENSIONS_NEED_UPDATE');
        const { userId } = await this.runtime.ccwAPI.getUserInfo();
        this.cloudConfig = await this.storage.fetchConfig(userId);
        this.fetchingConfig = false;
        this.runtime.emit('TOOLBOX_EXTENSIONS_NEED_UPDATE');
    }

    skeletonMenu(): MenuItems {
        const menuItems: MenuItems = [];
        menuItems.push({
            text: 'azusa',
            value: JSON.stringify(
                new SpineConfig({
                    skel: 'spine/Azusa_home.skel',
                    atlas: 'spine/Azusa_home.atlas',
                    version: '4.2webgl',
                }),
            ),
        });
        for (let name in this.cloudConfig) {
            const config = this.cloudConfig[name];
            menuItems.push({
                text: name,
                value: JSON.stringify(new SpineConfig(config)),
            });
        }
        return menuItems;
    }

    setSkinSkeleton(
        arg: { TARGET_NAME: string; SKELETON: number | SpineSkinReport },
        util: Util,
    ) {
        const { TARGET_NAME, SKELETON } = arg;
        let skinId: any;
        if (!SKELETON) {
            logger.error(translate('setSkinSkeleton.skeletonIdError'));
            return;
        }
        if (SKELETON instanceof SpineSkinReport) {
            skinId = SKELETON.valueOf().id;
        } else {
            skinId = Number(SKELETON.toString());
        }
        if (isNaN(skinId) || skinId < 0) {
            logger.error(translate('setSkinSkeleton.skeletonIdError'));
            return;
        }
        let target: VM.RenderedTarget;
        if (TARGET_NAME === '__this__') {
            target = util.target;
        } else {
            target = this.runtime.targets.find(
                (t) => t.isSprite() && t.getName() === TARGET_NAME,
            );
            if (!target) {
                logger.warn(
                    translate('setSkinSkeleton.characterNotFound', {
                        name: TARGET_NAME,
                    }),
                );
            }
        }
        const drawableId = target.drawableID;
        const drawable = this.runtime.renderer._allDrawables[drawableId];
        const skin = this.runtime.renderer._allSkins[skinId];
        if (skin) {
            drawable.skin = skin;
        }
    }

    async loadSkeleton(arg: { CONFIG: string; NAME: string }) {
        const { CONFIG, NAME } = arg;

        const { skel, atlas, version, rawDataURIs } = JSON.parse(CONFIG) as {
            skel: string;
            atlas: string;
            version: VersionNames;
            rawDataURIs?: Record<string, string>;
        };
        if (!(skel && atlas && version in spineVersions)) {
            throw new Error(translate('loadSkeleton.configError'));
        }
        const manager = this.managers[version];
        const { skeleton, animationState } = await manager.loadSkeleton(
            skel,
            atlas,
            rawDataURIs,
        );
        skeleton.data.name = NAME;
        const skinId = this.renderer._nextSkinId++;
        const newSkin = (this.renderer._allSkins[skinId] = new SpineSkin(
            skinId,
            this.renderer,
            manager,
            skeleton,
            animationState,
            new spineVersions[version].TimeKeeper(),
            NAME,
        ));
        this.skins.push(newSkin);
        return new SpineSkinReport(newSkin);
    }

    setRelativePos(args: { SKIN: SpineSkinReport; POS: string }) {
        const { SKIN, POS } = args;
        if (!(SKIN && SKIN instanceof SpineSkinReport)) {
            logger.error(translate('typeError'), args);
            return;
        }
        if (!(POS && typeof POS == 'string')) {
            logger.error(translate('typeError'), args);
            return;
        }
        const skin = SKIN.valueOf();
        let pos: string[], x: number, y: number;
        try {
            pos = trimPos(POS).split(',');
            x = pos[0] == '~' ? skin.skeletonRelativePos[0] : Number(pos[0]);
            y = pos[1] == '~' ? skin.skeletonRelativePos[1] : Number(pos[1]);
            if (isNaN(x) || isNaN(y)) {
                throw new Error(`pos (${POS}) is invalid`);
            }
        } catch (e) {
            logger.error(translate('typeError'), e);
            return;
        }
        skin.skeletonRelativePos = [x, y];
    }

    getSthOf(arg: {
        KEY: GetSthMenuItems;
        DATA:
            | SpineSkinReport
            | SpineSkeletonReport<Skeleton>
            | SpineBoneReport<Bone>
            | SpineAnimationStateReport<AnimationState>;
    }): string | HTMLReport {
        const { KEY, DATA } = arg;
        if (DATA instanceof SpineSkeletonReport) {
            if (!KEY.startsWith('skeleton')) {
                logger.error(translate('typeError'));
                return '';
            }
            const skeleton = DATA.valueOf();
            switch (KEY) {
                case 'skeleton.bones': {
                    const names: string[] = [];
                    for (const bone of skeleton.bones) {
                        names.push(bone.data.name);
                    }
                    return JSON.stringify(names);
                }
                case 'skeleton.animations': {
                    const names: string[] = [];
                    for (const animation of skeleton.data.animations) {
                        names.push(animation.name);
                    }
                    return JSON.stringify(names);
                }
                case 'skeleton.skins': {
                    return JSON.stringify(
                        (skeleton.data.skins || []).map((skin: any) => skin.name),
                    );
                }
                case 'skeleton.slots': {
                    return JSON.stringify(
                        (skeleton.data.slots || []).map((slot: any) => slot.name),
                    );
                }
                case 'skeleton.events': {
                    return JSON.stringify(
                        (skeleton.data.events || []).map((event: any) => event.name),
                    );
                }
                case 'skeleton.ikConstraints': {
                    return JSON.stringify(
                        (skeleton.data.ikConstraints || []).map(
                            (constraint: any) => constraint.name,
                        ),
                    );
                }
                case 'skeleton.transformConstraints': {
                    return JSON.stringify(
                        (skeleton.data.transformConstraints || []).map(
                            (constraint: any) => constraint.name,
                        ),
                    );
                }
                case 'skeleton.pathConstraints': {
                    return JSON.stringify(
                        (skeleton.data.pathConstraints || []).map(
                            (constraint: any) => constraint.name,
                        ),
                    );
                }
                case 'skeleton.bone': {
                    const ARG_ID = String(arg['ARG_ID']);
                    if (!ARG_ID) {
                        logger.error(translate('typeError'));
                    }
                    try {
                        const bone = skeleton.findBone(ARG_ID);
                        if (!bone) {
                            logger.error(
                                translate('typeError'),
                                'bone not found',
                                ARG_ID,
                                'available bones:',
                                skeleton.bones.map((bone) => bone.data.name),
                            );
                            return '';
                        }
                        return new SpineBoneReport(bone);
                    } catch (e) {
                        logger.error(translate('typeError'), e);
                    }
                }
                case 'skeleton.bounds': {
                    const spine = spineVersions['4.2webgl'];
                    const offset = new spine.Vector2();
                    const size = new spine.Vector2();
                    skeleton.getBounds(offset, size);
                    return JSON.stringify({
                        x: offset.x,
                        y: offset.y,
                        width: size.x,
                        height: size.y,
                    });
                }
            }
        }
        if (DATA instanceof SpineSkinReport) {
            if (!KEY.startsWith('skin')) {
                logger.error(translate('typeError'));
                return '';
            }
            const skin = DATA.valueOf();
            switch (KEY) {
                case 'skin.name':
                    return skin.name;
                case 'skin.skeleton':
                    return new SpineSkeletonReport(skin.skeleton, skin.name);
                case 'skin.x': // skeleton的坐标过于底层，没有获取意义
                    return String(skin.skeletonRelativePos[0]);
                case 'skin.y':
                    return String(skin.skeletonRelativePos[1]);
                case 'skin.animationState': {
                    return new SpineAnimationStateReport(skin.animationState);
                }
            }
        }
        if (DATA instanceof SpineBoneReport) {
            if (!KEY.startsWith('bone')) {
                logger.error(translate('typeError'));
                return '';
            }
            const bone = DATA.valueOf();
            switch (KEY) {
                case 'bone.pos':
                    return JSON.stringify([bone.worldX, bone.worldY]);
            }
        }
        if (DATA instanceof SpineAnimationStateReport) {
            if (!KEY.startsWith('animationState')) {
                logger.error(translate('typeError'));
                return '';
            }
            const state = DATA.valueOf();
            const ARG_TRACK = Number(arg['ARG_TRACK']);
            if (isNaN(ARG_TRACK)) {
                logger.error(translate('typeError'));
                return '';
            }
            const track = state.tracks[ARG_TRACK];
            if (!track) {
                logger.error(translate('typeError'));
                return '';
            }
            switch (KEY) {
                case 'animationState.playing':
                    return track.animation.name;
                case 'animationState.loop':
                    return String(track.loop);
            }
        }
        logger.error(translate('typeError'));
        return '';
    }

    setBonePos(args: { BONE: SpineBoneReport<Bone>; POS: string }): void {
        const { BONE, POS } = args;
        if (!(BONE && BONE instanceof SpineBoneReport)) {
            logger.error(translate('typeError'));
            return;
        }
        if (!(POS && typeof POS == 'string')) {
            logger.error(translate('typeError'));
            return;
        }
        const bone = BONE.valueOf();
        let pos: string[], x: number, y: number;
        try {
            pos = trimPos(POS).split(',');
            x = pos[0] == '~' ? bone.worldX : Number(pos[0]);
            y = pos[1] == '~' ? bone.worldY : Number(pos[1]);
            if (isNaN(x) || isNaN(y)) {
                throw new Error(`pos (${pos.join(',')}) is invalid`);
            }
        } catch (e) {
            logger.error(translate('typeError'), e);
            return;
        }
        const srcVec = new Vector2(x, y);
        const dstVec = bone.parent ? bone.parent.worldToLocal(srcVec) : srcVec;
        bone.x = dstVec.x;
        bone.y = dstVec.y;
        bone.updateWorldTransform();
    }

    pointBoneTo(args: {
        BONE: SpineBoneReport<Bone>;
        POS: string;
        OFFSET: number;
    }): void {
        const { BONE, POS, OFFSET } = args;
        if (!(BONE && BONE instanceof SpineBoneReport)) {
            logger.error(translate('typeError'));
            return;
        }
        if (!(POS && typeof POS == 'string')) {
            logger.error(translate('typeError'));
            return;
        }
        const bone = BONE.valueOf() as any;
        let x: number, y: number;
        try {
            const pos = trimPos(POS).split(',');
            x = Number(pos[0]);
            y = Number(pos[1]);
            if (isNaN(x) || isNaN(y)) {
                throw new Error(`pos (${POS}) is invalid`);
            }
        } catch (e) {
            logger.error(translate('typeError'), e);
            return;
        }
        const offset = Number(OFFSET) || 0;
        const worldRotation =
            (Math.atan2(y - bone.worldY, x - bone.worldX) * 180) / Math.PI +
            offset;
        bone.rotation = bone.worldToLocalRotation
            ? bone.worldToLocalRotation(worldRotation)
            : worldRotation;
        bone.updateWorldTransform();
    }

    setIkTargetPos(args: {
        SKELETON: SpineSkeletonReport<Skeleton>;
        NAME: string;
        POS: string;
    }): void {
        const { SKELETON, NAME, POS } = args;
        if (!(SKELETON && SKELETON instanceof SpineSkeletonReport)) {
            logger.error(translate('typeError'));
            return;
        }
        const skeleton = SKELETON.valueOf() as any;
        const constraint = skeleton.ikConstraints?.find(
            (item: any) => item?.data?.name === String(NAME),
        );
        if (!constraint?.target) {
            logger.error(translate('typeError'), 'IK constraint not found', NAME);
            return;
        }
        let x: number, y: number;
        try {
            const pos = trimPos(POS).split(',');
            x = Number(pos[0]);
            y = Number(pos[1]);
            if (isNaN(x) || isNaN(y)) {
                throw new Error(`pos (${POS}) is invalid`);
            }
        } catch (e) {
            logger.error(translate('typeError'), e);
            return;
        }
        const target = constraint.target;
        const srcVec = new Vector2(x, y);
        const dstVec = target.parent ? target.parent.worldToLocal(srcVec) : srcVec;
        target.x = dstVec.x;
        target.y = dstVec.y;
        target.updateWorldTransform();
        skeleton.updateWorldTransform?.(2);
    }

    setSkeletonSkin(args: {
        SKELETON: SpineSkeletonReport<Skeleton>;
        NAME: string;
    }) {
        const { SKELETON, NAME } = args;
        if (!(SKELETON && SKELETON instanceof SpineSkeletonReport)) {
            logger.error(translate('typeError'));
            return;
        }
        try {
            const skeleton = SKELETON.valueOf() as any;
            if (skeleton.setSkinByName) {
                skeleton.setSkinByName(String(NAME));
            } else {
                const skin = skeleton.data.findSkin(String(NAME));
                if (!skin) {
                    throw new Error(`skin not found: ${NAME}`);
                }
                skeleton.setSkin(skin);
            }
            skeleton.setSlotsToSetupPose?.();
            skeleton.updateWorldTransform?.(2);
        } catch (e) {
            logger.error(translate('typeError'), e);
        }
    }

    setSlotAttachment(args: {
        SKELETON: SpineSkeletonReport<Skeleton>;
        SLOT: string;
        ATTACHMENT: string;
    }) {
        const { SKELETON, SLOT, ATTACHMENT } = args;
        if (!(SKELETON && SKELETON instanceof SpineSkeletonReport)) {
            logger.error(translate('typeError'));
            return;
        }
        try {
            const skeleton = SKELETON.valueOf() as any;
            skeleton.setAttachment(String(SLOT), String(ATTACHMENT));
            skeleton.updateWorldTransform?.(2);
        } catch (e) {
            logger.error(translate('typeError'), e);
        }
    }

    hideSlotAttachment(args: {
        SKELETON: SpineSkeletonReport<Skeleton>;
        SLOT: string;
    }) {
        const { SKELETON, SLOT } = args;
        if (!(SKELETON && SKELETON instanceof SpineSkeletonReport)) {
            logger.error(translate('typeError'));
            return;
        }
        try {
            const skeleton = SKELETON.valueOf() as any;
            const slot = skeleton.findSlot(String(SLOT));
            if (!slot) {
                throw new Error(`slot not found: ${SLOT}`);
            }
            slot.setAttachment(null);
            skeleton.updateWorldTransform?.(2);
        } catch (e) {
            logger.error(translate('typeError'), e);
        }
    }

    switchDebug() {
        this.enableDebugRender = !this.enableDebugRender;
        for (let manager of Object.values(this.managers)) {
            manager.debugRender = this.enableDebugRender;
        }
        this.runtime.emit('TOOLBOX_EXTENSIONS_NEED_UPDATE');
    }

    addAnimation(args: {
        STATE: SpineAnimationStateReport<AnimationState>;
        TRACK: number;
        NAME: string;
        LOOP: boolean;
        ACTION: 'add' | 'set';
        DELAY: number;
    }) {
        const { STATE, TRACK, NAME, LOOP, ACTION, DELAY } = args;
        try {
            const { animationState } = getStateAndTrack(STATE, TRACK);
            const skeletonData = (animationState as any).data?.skeletonData;
            if (skeletonData && !skeletonData.findAnimation(String(NAME))) {
                logger.error(
                    translate('typeError'),
                    'animation not found',
                    NAME,
                    'available animations:',
                    skeletonData.animations?.map((animation: any) => animation.name),
                );
                return;
            }
            if (ACTION == 'add') {
                animationState.addAnimation(TRACK, NAME, !!LOOP, Number(DELAY) || 0);
            } else {
                animationState.setAnimation(TRACK, NAME, !!LOOP);
            }
        } catch (e) {
            return String(e);
        }
    }

    addEmptyAnimation(args: {
        STATE: SpineAnimationStateReport<AnimationState>;
        TRACK: number;
        ACTION: 'add' | 'set';
        MIX: number;
    }) {
        const { STATE, TRACK, ACTION, MIX } = args;
        try {
            const { animationState } = getStateAndTrack(STATE, TRACK);
            if (ACTION == 'add') {
                animationState.addEmptyAnimation(TRACK, MIX, 0);
            } else {
                animationState.setEmptyAnimation(TRACK, MIX);
            }
        } catch (e) {
            logger.error(translate('typeError'), e);
        }
    }

    setDefaultMix(args: {
        STATE: SpineAnimationStateReport<AnimationState>;
        MIX: number;
    }) {
        const { STATE, MIX } = args;
        try {
            const state = STATE.valueOf() as any;
            state.data.defaultMix = Math.max(0, Number(MIX) || 0);
        } catch (e) {
            logger.error(translate('typeError'), e);
        }
    }

    setAnimationMix(args: {
        STATE: SpineAnimationStateReport<AnimationState>;
        FROM: string;
        TO: string;
        MIX: number;
    }) {
        const { STATE, FROM, TO, MIX } = args;
        try {
            const state = STATE.valueOf() as any;
            state.data.setMix(String(FROM), String(TO), Math.max(0, Number(MIX) || 0));
        } catch (e) {
            logger.error(translate('typeError'), e);
        }
    }

    setAnimationTimeScale(args: {
        STATE: SpineAnimationStateReport<AnimationState>;
        SCALE: number;
    }) {
        const { STATE, SCALE } = args;
        try {
            const state = STATE.valueOf() as any;
            const scale = Number(SCALE);
            state.timeScale = isNaN(scale) ? 1 : scale;
        } catch (e) {
            logger.error(translate('typeError'), e);
        }
    }

    pauseAnimationState(args: { STATE: SpineAnimationStateReport<AnimationState> }) {
        this.setAnimationTimeScale({ STATE: args.STATE, SCALE: 0 });
    }

    resumeAnimationState(args: { STATE: SpineAnimationStateReport<AnimationState> }) {
        this.setAnimationTimeScale({ STATE: args.STATE, SCALE: 1 });
    }

    clearAnimationTrack(args: {
        STATE: SpineAnimationStateReport<AnimationState>;
        TRACK: number;
    }) {
        const { STATE, TRACK } = args;
        try {
            const state = STATE.valueOf() as any;
            const track = Number(TRACK);
            if (isNaN(track)) {
                throw new Error('track is invalid');
            }
            state.clearTrack(track);
        } catch (e) {
            logger.error(translate('typeError'), e);
        }
    }

    clearAnimationTracks(args: { STATE: SpineAnimationStateReport<AnimationState> }) {
        try {
            const state = args.STATE.valueOf() as any;
            state.clearTracks();
        } catch (e) {
            logger.error(translate('typeError'), e);
        }
    }

    animationCompleted(args: {
        STATE: SpineAnimationStateReport<AnimationState>;
        TRACK: number;
    }): boolean {
        const { STATE, TRACK } = args;
        try {
            const { track } = getStateAndTrack(STATE, TRACK);
            if (!track) {
                logger.error(translate('typeError'));
                return true;
            }
            return track.isComplete();
        } catch (e) {
            logger.error(e);
            return false;
        }
    }
}

registerExtDetail(SpineExtension, {
    info: {
        name: 'spineAnimation.name',
        description: 'spineAnimation.desc',
        extensionId: NS,
        collaboratorList: [
            {
                collaborator: '孟夫子驾到@ccw',
                collaboratorURL:
                    'https://www.ccw.site/student/63c2807d669fa967f17f5559',
            },
            {
                collaborator: '乌龙茶速递@ccw',
                collaboratorURL:
                    'https://www.ccw.site/student/68dd004586bbc77f84e309ac',
            },
        ],
        iconURL: icon,
        insetIconURL: insetIcon_,
    },
    l10n: {
        'zh-cn': {
            'spineAnimation.name': zh_cn.extensionName,
            'spineAnimation.desc': zh_cn.description,
        },
        en: {
            'spineAnimation.name': en.extensionName,
            'spineAnimation.desc': en.description,
        },
    },
});

export type Ext = SpineExtension;
