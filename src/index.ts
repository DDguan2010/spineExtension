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
const NS = 'spinePro' as const;
const { BlockType, ArgumentType } = Scratch;
const MAX_PROXY_DEPTH = 5;
const translate = getTranslate();
let logger = getLogger('console', NS);
type Util = VM.BlockUtility;
type SpineEventRecord = {
    type: string;
    track: number;
    animation: string;
    name: string;
    intValue?: number;
    floatValue?: number;
    stringValue?: string;
};
type AnimationStateMachineState = {
    animation: string;
    track: number;
    loop: boolean;
    mix: number;
    priority: number;
    returnMode: 'none' | 'fixed' | 'input';
    returnState: string;
    allowInterruptBy: string[];
};
type AnimationStateMachine = {
    currentState: string;
    previousState: string;
    states: Record<string, AnimationStateMachineState>;
    inputContext: Record<string, string>;
};

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

function parsePair(value: string, label: string): [number, number] {
    const pair = trimPos(String(value)).split(',');
    const x = Number(pair[0]);
    const y = Number(pair[1]);
    if (isNaN(x) || isNaN(y)) {
        throw new Error(`${label} (${value}) is invalid`);
    }
    return [x, y];
}

function getAnimationDuration(track: any) {
    return Math.max(
        0,
        Number(track?.animationEnd ?? track?.animation?.duration ?? 0) -
            Number(track?.animationStart ?? 0),
    );
}

function getTrackAnimationTime(track: any) {
    if (typeof track?.getAnimationTime === 'function') {
        return track.getAnimationTime();
    }
    return track?.trackTime ?? 0;
}

function getSlotAttachmentName(slot: any) {
    const attachment = slot?.getAttachment ? slot.getAttachment() : slot?.attachment;
    return attachment?.name || '';
}

function getSkinAttachmentNames(skin: any, slotIndex: number) {
    const entries: any[] = [];
    if (skin?.getAttachmentsForSlot) {
        skin.getAttachmentsForSlot(slotIndex, entries);
        return entries.map((entry) => entry.name);
    }
    const attachments = skin?.attachments?.[slotIndex];
    return attachments ? Object.keys(attachments) : [];
}

function findSlotIndex(skeleton: any, slotName: string) {
    if (typeof skeleton.findSlotIndex === 'function') {
        return skeleton.findSlotIndex(slotName);
    }
    if (typeof skeleton.data?.findSlotIndex === 'function') {
        return skeleton.data.findSlotIndex(slotName);
    }
    return (skeleton.data?.slots || []).findIndex((slot: any) => slot.name === slotName);
}

function toBoolean(value: unknown) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value === 'true';
    return !!value;
}

function parseCsv(value: string) {
    return String(value)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}

function findConstraint(items: any[], name: string) {
    return (items || []).find((item) => item?.data?.name === name || item?.name === name);
}

function getConstraintField(constraint: any, field: string) {
    return constraint?.[field] ?? constraint?.data?.[field];
}

function setConstraintField(constraint: any, field: string, value: number) {
    if (field in constraint) {
        constraint[field] = value;
        return true;
    }
    return false;
}

function isBoundingBoxAttachment(attachment: any) {
    const ctorName = attachment?.constructor?.name || '';
    if (ctorName.includes('BoundingBox')) return true;
    return (
        Array.isArray(attachment?.vertices) &&
        !('path' in attachment) &&
        !('region' in attachment) &&
        !('endSlot' in attachment) &&
        !('lengths' in attachment)
    );
}

function getSlotCurrentAttachment(slot: any) {
    return slot?.getAttachment ? slot.getAttachment() : slot?.attachment;
}

function collectBoundingBoxes(skeleton: any) {
    const boxes: { name: string; slot: any; attachment: any }[] = [];
    for (const slot of skeleton.slots || []) {
        const attachment = getSlotCurrentAttachment(slot);
        if (isBoundingBoxAttachment(attachment)) {
            boxes.push({
                name: attachment.name || slot.data?.attachmentName || slot.data?.name || '',
                slot,
                attachment,
            });
        }
    }
    return boxes;
}

function computeBoundingBoxVertices(skeleton: any, name: string) {
    const box = collectBoundingBoxes(skeleton).find(
        (item) => item.name === name || item.slot?.data?.name === name,
    );
    if (!box) return null;
    const length = box.attachment.worldVerticesLength || box.attachment.vertices?.length || 0;
    const vertices = new Array(length).fill(0);
    box.attachment.computeWorldVertices(box.slot, 0, length, vertices, 0, 2);
    const points: [number, number][] = [];
    for (let i = 0; i < vertices.length; i += 2) {
        points.push([vertices[i], vertices[i + 1]]);
    }
    return points;
}

function getAabb(points: [number, number][]) {
    if (!points.length) return { x: 0, y: 0, width: 0, height: 0 };
    const xs = points.map((point) => point[0]);
    const ys = points.map((point) => point[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function pointInPolygon(point: [number, number], polygon: [number, number][]) {
    if (polygon.length < 3) return false;
    let inside = false;
    const [x, y] = point;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i];
        const [xj, yj] = polygon[j];
        const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
        if (intersect) inside = !inside;
    }
    return inside;
}

function cross(a: [number, number], b: [number, number], c: [number, number]) {
    return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function segmentsIntersect(
    a1: [number, number],
    a2: [number, number],
    b1: [number, number],
    b2: [number, number],
) {
    const c1 = cross(a1, a2, b1);
    const c2 = cross(a1, a2, b2);
    const c3 = cross(b1, b2, a1);
    const c4 = cross(b1, b2, a2);
    return c1 * c2 <= 0 && c3 * c4 <= 0;
}

function polygonEdgesIntersect(a: [number, number][], b: [number, number][]) {
    for (let i = 0; i < a.length; i++) {
        const a1 = a[i];
        const a2 = a[(i + 1) % a.length];
        for (let j = 0; j < b.length; j++) {
            if (segmentsIntersect(a1, a2, b[j], b[(j + 1) % b.length])) {
                return true;
            }
        }
    }
    return false;
}

function polygonsIntersect(a: [number, number][], b: [number, number][]) {
    if (a.length < 3 || b.length < 3) return false;
    const aabbA = getAabb(a);
    const aabbB = getAabb(b);
    if (
        aabbA.x + aabbA.width < aabbB.x ||
        aabbB.x + aabbB.width < aabbA.x ||
        aabbA.y + aabbA.height < aabbB.y ||
        aabbB.y + aabbB.height < aabbA.y
    ) {
        return false;
    }
    return (
        a.some((point) => pointInPolygon(point, b)) ||
        b.some((point) => pointInPolygon(point, a)) ||
        polygonEdgesIntersect(a, b)
    );
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
    animationEvents: WeakMap<object, SpineEventRecord[]>;
    stateMachines: WeakMap<object, AnimationStateMachine>;

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
        this.animationEvents = new WeakMap();
        this.stateMachines = new WeakMap();
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
        // 先回收所有 skin 私有纹理，再释放各版本共享的 atlas/sceneRenderer。
        // 此时项目已停、无使用者，统一释放是安全的，不影响运行中的效果。
        this.gc();
        for (const version in this.managers) {
            this.managers[version].dispose?.();
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
                opcode: this.deleteSpineConfig.name,
                text: translate('deleteSpineConfig.text'),
                blockType: BlockType.COMMAND,
                arguments: {
                    NAME: {
                        type: ArgumentType.STRING,
                        defaultValue: 'configName',
                    },
                },
            },
            {
                opcode: this.renameSpineConfig.name,
                text: translate('renameSpineConfig.text'),
                blockType: BlockType.COMMAND,
                arguments: {
                    OLD_NAME: {
                        type: ArgumentType.STRING,
                        defaultValue: 'oldName',
                    },
                    NEW_NAME: {
                        type: ArgumentType.STRING,
                        defaultValue: 'newName',
                    },
                },
            },
            {
                opcode: this.editSpineConfig.name,
                text: translate('editSpineConfig.text'),
                blockType: BlockType.COMMAND,
                arguments: {
                    NAME: {
                        type: ArgumentType.STRING,
                        defaultValue: 'configName',
                    },
                    SKEL_URL: {
                        type: ArgumentType.STRING,
                        defaultValue: 'spine/example.skel',
                    },
                    ATLAS_URL: {
                        type: ArgumentType.STRING,
                        defaultValue: 'spine/example.atlas',
                    },
                    VERSION: {
                        type: ArgumentType.STRING,
                        menu: 'VERSION',
                    },
                },
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
                opcode: this.getIkConstraintInfo.name,
                blockType: BlockType.REPORTER,
                text: translate('getIkConstraintInfo.text'),
                arguments: {
                    SKELETON: {
                        type: null,
                    },
                    NAME: {
                        type: ArgumentType.STRING,
                        defaultValue: 'ik',
                    },
                },
            },
            {
                opcode: this.setTransformConstraintField.name,
                blockType: BlockType.COMMAND,
                text: translate('setTransformConstraintField.text'),
                arguments: {
                    SKELETON: {
                        type: null,
                    },
                    NAME: {
                        type: ArgumentType.STRING,
                        defaultValue: 'transform',
                    },
                    FIELD: {
                        type: ArgumentType.STRING,
                        menu: 'transform_constraint_field_menu',
                    },
                    VALUE: {
                        type: ArgumentType.NUMBER,
                        defaultValue: 1,
                    },
                },
            },
            {
                opcode: this.getTransformConstraintInfo.name,
                blockType: BlockType.REPORTER,
                text: translate('getTransformConstraintInfo.text'),
                arguments: {
                    SKELETON: {
                        type: null,
                    },
                    NAME: {
                        type: ArgumentType.STRING,
                        defaultValue: 'transform',
                    },
                },
            },
            {
                opcode: this.setPathConstraintField.name,
                blockType: BlockType.COMMAND,
                text: translate('setPathConstraintField.text'),
                arguments: {
                    SKELETON: {
                        type: null,
                    },
                    NAME: {
                        type: ArgumentType.STRING,
                        defaultValue: 'path',
                    },
                    FIELD: {
                        type: ArgumentType.STRING,
                        menu: 'path_constraint_field_menu',
                    },
                    VALUE: {
                        type: ArgumentType.NUMBER,
                        defaultValue: 0,
                    },
                },
            },
            {
                opcode: this.getPathConstraintInfo.name,
                blockType: BlockType.REPORTER,
                text: translate('getPathConstraintInfo.text'),
                arguments: {
                    SKELETON: {
                        type: null,
                    },
                    NAME: {
                        type: ArgumentType.STRING,
                        defaultValue: 'path',
                    },
                },
            },
            {
                opcode: this.setBoneRotation.name,
                blockType: BlockType.COMMAND,
                text: translate('setBoneRotation.text'),
                arguments: {
                    BONE: {
                        type: null,
                    },
                    ROTATION: {
                        type: ArgumentType.NUMBER,
                        defaultValue: 0,
                    },
                    SPACE: {
                        type: ArgumentType.STRING,
                        menu: 'bone_space_menu',
                    },
                },
            },
            {
                opcode: this.setBoneScale.name,
                blockType: BlockType.COMMAND,
                text: translate('setBoneScale.text'),
                arguments: {
                    BONE: {
                        type: null,
                    },
                    SCALE: {
                        type: ArgumentType.STRING,
                        defaultValue: '1, 1',
                    },
                },
            },
            {
                opcode: this.convertBonePos.name,
                blockType: BlockType.REPORTER,
                text: translate('convertBonePos.text'),
                arguments: {
                    BONE: {
                        type: null,
                    },
                    POS: {
                        type: ArgumentType.STRING,
                        defaultValue: '0, 0',
                    },
                    MODE: {
                        type: ArgumentType.STRING,
                        menu: 'bone_convert_menu',
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
                opcode: this.combineSkeletonSkins.name,
                blockType: BlockType.COMMAND,
                text: translate('combineSkeletonSkins.text'),
                arguments: {
                    SKELETON: {
                        type: null,
                    },
                    NAMES: {
                        type: ArgumentType.STRING,
                        defaultValue: 'skin1, skin2',
                    },
                },
            },
            {
                opcode: this.getSlotAttachment.name,
                blockType: BlockType.REPORTER,
                text: translate('getSlotAttachment.text'),
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
                opcode: this.getSlotAttachments.name,
                blockType: BlockType.REPORTER,
                text: translate('getSlotAttachments.text'),
                arguments: {
                    SKELETON: {
                        type: null,
                    },
                    SLOT: {
                        type: ArgumentType.STRING,
                        defaultValue: 'slot',
                    },
                    SKIN: {
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
                opcode: this.getBoundingBoxes.name,
                blockType: BlockType.REPORTER,
                text: translate('getBoundingBoxes.text'),
                arguments: {
                    SKELETON: {
                        type: null,
                    },
                },
            },
            {
                opcode: this.getBoundingBoxVertices.name,
                blockType: BlockType.REPORTER,
                text: translate('getBoundingBoxVertices.text'),
                arguments: {
                    SKELETON: {
                        type: null,
                    },
                    NAME: {
                        type: ArgumentType.STRING,
                        defaultValue: 'hitbox',
                    },
                },
            },
            {
                opcode: this.getBoundingBoxAabb.name,
                blockType: BlockType.REPORTER,
                text: translate('getBoundingBoxAabb.text'),
                arguments: {
                    SKELETON: {
                        type: null,
                    },
                    NAME: {
                        type: ArgumentType.STRING,
                        defaultValue: 'hitbox',
                    },
                },
            },
            {
                opcode: this.isPointInBoundingBox.name,
                blockType: BlockType.BOOLEAN,
                text: translate('isPointInBoundingBox.text'),
                arguments: {
                    POS: {
                        type: ArgumentType.STRING,
                        defaultValue: '0, 0',
                    },
                    SKELETON: {
                        type: null,
                    },
                    NAME: {
                        type: ArgumentType.STRING,
                        defaultValue: 'hitbox',
                    },
                },
            },
            {
                opcode: this.areBoundingBoxesIntersecting.name,
                blockType: BlockType.BOOLEAN,
                text: translate('areBoundingBoxesIntersecting.text'),
                arguments: {
                    A: {
                        type: null,
                    },
                    BOX_A: {
                        type: ArgumentType.STRING,
                        defaultValue: 'attack',
                    },
                    B: {
                        type: null,
                    },
                    BOX_B: {
                        type: ArgumentType.STRING,
                        defaultValue: 'body',
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
                opcode: this.setTrackTime.name,
                text: translate('setTrackTime.text'),
                arguments: {
                    STATE: {
                        type: null,
                    },
                    TRACK: {
                        type: ArgumentType.NUMBER,
                        defaultValue: 0,
                    },
                    TIME: {
                        type: ArgumentType.NUMBER,
                        defaultValue: 0,
                    },
                },
                blockType: BlockType.COMMAND,
            },
            {
                opcode: this.setTrackProgress.name,
                text: translate('setTrackProgress.text'),
                arguments: {
                    STATE: {
                        type: null,
                    },
                    TRACK: {
                        type: ArgumentType.NUMBER,
                        defaultValue: 0,
                    },
                    PROGRESS: {
                        type: ArgumentType.NUMBER,
                        defaultValue: 0.5,
                    },
                },
                blockType: BlockType.COMMAND,
            },
            {
                opcode: this.listenAnimationEvents.name,
                text: translate('listenAnimationEvents.text'),
                arguments: {
                    STATE: {
                        type: null,
                    },
                },
                blockType: BlockType.COMMAND,
            },
            {
                opcode: this.popAnimationEvent.name,
                text: translate('popAnimationEvent.text'),
                arguments: {
                    STATE: {
                        type: null,
                    },
                },
                blockType: BlockType.REPORTER,
            },
            {
                opcode: this.popFilteredAnimationEvent.name,
                text: translate('popFilteredAnimationEvent.text'),
                arguments: {
                    STATE: {
                        type: null,
                    },
                    TRACK: {
                        type: ArgumentType.NUMBER,
                        defaultValue: -1,
                    },
                    ANIMATION: {
                        type: ArgumentType.STRING,
                        defaultValue: '',
                    },
                    TYPE: {
                        type: ArgumentType.STRING,
                        defaultValue: '',
                    },
                },
                blockType: BlockType.REPORTER,
            },
            {
                opcode: this.getAnimationStateMonitor.name,
                text: translate('getAnimationStateMonitor.text'),
                arguments: {
                    STATE: {
                        type: null,
                    },
                },
                blockType: BlockType.REPORTER,
            },
            {
                opcode: this.registerAnimationState.name,
                text: translate('registerAnimationState.text'),
                arguments: {
                    STATE: {
                        type: null,
                    },
                    NAME: {
                        type: ArgumentType.STRING,
                        defaultValue: 'idle',
                    },
                    ANIMATION: {
                        type: ArgumentType.STRING,
                        defaultValue: 'idle',
                    },
                    TRACK: {
                        type: ArgumentType.NUMBER,
                        defaultValue: 0,
                    },
                    LOOP: {
                        type: ArgumentType.STRING,
                        menu: 'BOOLEAN',
                    },
                    PRIORITY: {
                        type: ArgumentType.NUMBER,
                        defaultValue: 0,
                    },
                    MIX: {
                        type: ArgumentType.NUMBER,
                        defaultValue: 0.2,
                    },
                },
                blockType: BlockType.COMMAND,
            },
            {
                opcode: this.setAnimationStateReturn.name,
                text: translate('setAnimationStateReturn.text'),
                arguments: {
                    STATE: {
                        type: null,
                    },
                    NAME: {
                        type: ArgumentType.STRING,
                        defaultValue: 'jump',
                    },
                    MODE: {
                        type: ArgumentType.STRING,
                        menu: 'state_return_mode_menu',
                    },
                    RETURN: {
                        type: ArgumentType.STRING,
                        defaultValue: 'idle',
                    },
                },
                blockType: BlockType.COMMAND,
            },
            {
                opcode: this.switchAnimationState.name,
                text: translate('switchAnimationState.text'),
                arguments: {
                    STATE: {
                        type: null,
                    },
                    NAME: {
                        type: ArgumentType.STRING,
                        defaultValue: 'idle',
                    },
                },
                blockType: BlockType.COMMAND,
            },
            {
                opcode: this.setAnimationStateInput.name,
                text: translate('setAnimationStateInput.text'),
                arguments: {
                    STATE: {
                        type: null,
                    },
                    KEY: {
                        type: ArgumentType.STRING,
                        defaultValue: 'moving',
                    },
                    VALUE: {
                        type: ArgumentType.STRING,
                        defaultValue: 'idle',
                    },
                },
                blockType: BlockType.COMMAND,
            },
            {
                opcode: this.getAnimationStateMachineInfo.name,
                text: translate('getAnimationStateMachineInfo.text'),
                arguments: {
                    STATE: {
                        type: null,
                    },
                },
                blockType: BlockType.REPORTER,
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
            bone_space_menu: {
                items: [
                    {
                        text: translate('bone_space_menu.local'),
                        value: 'local',
                    },
                    {
                        text: translate('bone_space_menu.world'),
                        value: 'world',
                    },
                ],
                acceptReporters: true,
            },
            bone_convert_menu: {
                items: [
                    {
                        text: translate('bone_convert_menu.worldToLocal'),
                        value: 'worldToLocal',
                    },
                    {
                        text: translate('bone_convert_menu.localToWorld'),
                        value: 'localToWorld',
                    },
                ],
                acceptReporters: true,
            },
            transform_constraint_field_menu: {
                items: ['rotateMix', 'translateMix', 'scaleMix', 'shearMix'].map(
                    (value) => ({ text: value, value }),
                ),
                acceptReporters: true,
            },
            path_constraint_field_menu: {
                items: ['position', 'spacing', 'rotateMix', 'translateMix'].map(
                    (value) => ({ text: value, value }),
                ),
                acceptReporters: true,
            },
            state_return_mode_menu: {
                items: [
                    { text: translate('state_return_mode.none'), value: 'none' },
                    { text: translate('state_return_mode.fixed'), value: 'fixed' },
                    { text: translate('state_return_mode.input'), value: 'input' },
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
            ).catch((error) => {
                throw new Error(
                    `${file.name}: ${error instanceof Error ? error.message : String(error)}`,
                );
            });
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
            if (
                this.cloudConfig[spineFolder.trim()] &&
                !confirm(
                    translate('upload.confirmOverwrite', {
                        name: spineFolder.trim(),
                    }),
                )
            ) {
                return;
            }

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

            const detectedVersion = await this.detectRuntimeVersion(
                validation.skelFile!,
            );
            const imageList = files
                .filter((file) => file.name.toLowerCase().endsWith('.png'))
                .map((file) => file.name)
                .join('\n');
            const fileList = files.map((f) => f.name).join('\n');
            const confirmMsg = translate('upload.confirmUpload', {
                files:
                    translate('upload.preview', {
                        skeleton: validation.skelFile!.name,
                        atlas: validation.atlasFile!.name,
                        images: imageList || '(none)',
                        version: detectedVersion || '(unknown)',
                    }) +
                    '\n\n' +
                    fileList,
                folder: rootFolder,
            });

            if (!confirm(confirmMsg)) {
                return;
            }

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

    async deleteSpineConfig(args: { NAME: string }) {
        const name = String(args.NAME || '').trim();
        if (!name) return;
        if (!confirm(translate('deleteSpineConfig.confirm', { name }))) return;
        const { userId } = await this.runtime.ccwAPI.getUserInfo();
        await this.storage.deleteConfig(userId, name);
        await this.refreshMenu();
    }

    async renameSpineConfig(args: { OLD_NAME: string; NEW_NAME: string }) {
        const oldName = String(args.OLD_NAME || '').trim();
        const newName = String(args.NEW_NAME || '').trim();
        if (!(oldName && newName)) return;
        if (
            this.cloudConfig[newName] &&
            !confirm(translate('upload.confirmOverwrite', { name: newName }))
        ) {
            return;
        }
        const { userId } = await this.runtime.ccwAPI.getUserInfo();
        await this.storage.renameConfig(userId, oldName, newName);
        await this.refreshMenu();
    }

    async editSpineConfig(args: {
        NAME: string;
        SKEL_URL: string;
        ATLAS_URL: string;
        VERSION: VersionNames;
    }) {
        const name = String(args.NAME || '').trim();
        if (!name) return;
        const { userId } = await this.runtime.ccwAPI.getUserInfo();
        await this.storage.saveConfig(userId, name, {
            skel: String(args.SKEL_URL),
            atlas: String(args.ATLAS_URL),
            version: args.VERSION,
        });
        await this.refreshMenu();
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
                return;
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

        let config: {
            skel: string;
            atlas: string;
            version: VersionNames;
            rawDataURIs?: Record<string, string>;
        };
        try {
            config = JSON.parse(CONFIG);
        } catch (e) {
            throw new Error(translate('loadSkeleton.configError'));
        }
        const { skel, atlas, version, rawDataURIs } = config;
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
                case 'bone.localRotation':
                    return String((bone as any).rotation ?? 0);
                case 'bone.worldRotation':
                    return String(
                        (bone as any).getWorldRotationX
                            ? (bone as any).getWorldRotationX()
                            : ((bone as any).worldRotationX ?? (bone as any).rotation ?? 0),
                    );
                case 'bone.scale':
                    return JSON.stringify([
                        (bone as any).scaleX ?? 1,
                        (bone as any).scaleY ?? 1,
                    ]);
            }
        }
        if (DATA instanceof SpineAnimationStateReport) {
            if (!KEY.startsWith('animationState')) {
                logger.error(translate('typeError'));
                return '';
            }
            const state = DATA.valueOf();
            if (KEY === 'animationState.event') {
                const events = this.animationEvents.get(state as any) || [];
                return JSON.stringify(events[0] || null);
            }
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
                case 'animationState.trackTime':
                    return String(getTrackAnimationTime(track));
                case 'animationState.progress': {
                    const duration = getAnimationDuration(track);
                    if (!duration) return '0';
                    return String(getTrackAnimationTime(track) / duration);
                }
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

    setBoneRotation(args: {
        BONE: SpineBoneReport<Bone>;
        ROTATION: number;
        SPACE: 'local' | 'world';
    }): void {
        const { BONE, ROTATION, SPACE } = args;
        if (!(BONE && BONE instanceof SpineBoneReport)) {
            logger.error(translate('typeError'));
            return;
        }
        const bone = BONE.valueOf() as any;
        const rotation = Number(ROTATION);
        if (isNaN(rotation)) {
            logger.error(translate('typeError'), 'rotation is invalid');
            return;
        }
        bone.rotation = SPACE === 'world' && bone.worldToLocalRotation
            ? bone.worldToLocalRotation(rotation)
            : rotation;
        bone.updateWorldTransform();
    }

    setBoneScale(args: { BONE: SpineBoneReport<Bone>; SCALE: string }): void {
        const { BONE, SCALE } = args;
        if (!(BONE && BONE instanceof SpineBoneReport)) {
            logger.error(translate('typeError'));
            return;
        }
        try {
            const [x, y] = parsePair(SCALE, 'scale');
            const bone = BONE.valueOf() as any;
            bone.scaleX = x;
            bone.scaleY = y;
            bone.updateWorldTransform();
        } catch (e) {
            logger.error(translate('typeError'), e);
        }
    }

    convertBonePos(args: {
        BONE: SpineBoneReport<Bone>;
        POS: string;
        MODE: 'worldToLocal' | 'localToWorld';
    }) {
        const { BONE, POS, MODE } = args;
        if (!(BONE && BONE instanceof SpineBoneReport)) {
            logger.error(translate('typeError'));
            return '';
        }
        try {
            const [x, y] = parsePair(POS, 'pos');
            const bone = BONE.valueOf() as any;
            const vec = new Vector2(x, y);
            const result = MODE === 'localToWorld'
                ? bone.localToWorld(vec)
                : bone.worldToLocal(vec);
            return JSON.stringify([result.x, result.y]);
        } catch (e) {
            logger.error(translate('typeError'), e);
            return '';
        }
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

    getIkConstraintInfo(args: {
        SKELETON: SpineSkeletonReport<Skeleton>;
        NAME: string;
    }) {
        const { SKELETON, NAME } = args;
        if (!(SKELETON && SKELETON instanceof SpineSkeletonReport)) {
            logger.error(translate('typeError'));
            return '';
        }
        const skeleton = SKELETON.valueOf() as any;
        const constraint = findConstraint(skeleton.ikConstraints, String(NAME));
        if (!constraint) {
            logger.error(translate('typeError'), `IK constraint not found: ${NAME}`);
            return '';
        }
        return JSON.stringify({
            name: constraint.data?.name || NAME,
            target: constraint.target?.data?.name || constraint.target?.name || '',
            mix: getConstraintField(constraint, 'mix'),
            bendDirection: getConstraintField(constraint, 'bendDirection'),
        });
    }

    setTransformConstraintField(args: {
        SKELETON: SpineSkeletonReport<Skeleton>;
        NAME: string;
        FIELD: string;
        VALUE: number;
    }) {
        const { SKELETON, NAME, FIELD, VALUE } = args;
        if (!(SKELETON && SKELETON instanceof SpineSkeletonReport)) {
            logger.error(translate('typeError'));
            return;
        }
        const skeleton = SKELETON.valueOf() as any;
        const constraint = findConstraint(skeleton.transformConstraints, String(NAME));
        const value = Number(VALUE);
        if (!(constraint && !isNaN(value) && setConstraintField(constraint, String(FIELD), value))) {
            logger.error(translate('typeError'), `transform constraint field invalid: ${NAME}.${FIELD}`);
        }
    }

    getTransformConstraintInfo(args: {
        SKELETON: SpineSkeletonReport<Skeleton>;
        NAME: string;
    }) {
        const { SKELETON, NAME } = args;
        if (!(SKELETON && SKELETON instanceof SpineSkeletonReport)) {
            logger.error(translate('typeError'));
            return '';
        }
        const constraint = findConstraint(
            (SKELETON.valueOf() as any).transformConstraints,
            String(NAME),
        );
        if (!constraint) return '';
        return JSON.stringify({
            name: constraint.data?.name || NAME,
            target: constraint.target?.data?.name || constraint.target?.name || '',
            rotateMix: getConstraintField(constraint, 'rotateMix'),
            translateMix: getConstraintField(constraint, 'translateMix'),
            scaleMix: getConstraintField(constraint, 'scaleMix'),
            shearMix: getConstraintField(constraint, 'shearMix'),
        });
    }

    setPathConstraintField(args: {
        SKELETON: SpineSkeletonReport<Skeleton>;
        NAME: string;
        FIELD: string;
        VALUE: number;
    }) {
        const { SKELETON, NAME, FIELD, VALUE } = args;
        if (!(SKELETON && SKELETON instanceof SpineSkeletonReport)) {
            logger.error(translate('typeError'));
            return;
        }
        const skeleton = SKELETON.valueOf() as any;
        const constraint = findConstraint(skeleton.pathConstraints, String(NAME));
        const value = Number(VALUE);
        if (!(constraint && !isNaN(value) && setConstraintField(constraint, String(FIELD), value))) {
            logger.error(translate('typeError'), `path constraint field invalid: ${NAME}.${FIELD}`);
        }
    }

    getPathConstraintInfo(args: {
        SKELETON: SpineSkeletonReport<Skeleton>;
        NAME: string;
    }) {
        const { SKELETON, NAME } = args;
        if (!(SKELETON && SKELETON instanceof SpineSkeletonReport)) {
            logger.error(translate('typeError'));
            return '';
        }
        const constraint = findConstraint(
            (SKELETON.valueOf() as any).pathConstraints,
            String(NAME),
        );
        if (!constraint) return '';
        return JSON.stringify({
            name: constraint.data?.name || NAME,
            target: constraint.target?.data?.name || constraint.target?.name || '',
            position: getConstraintField(constraint, 'position'),
            spacing: getConstraintField(constraint, 'spacing'),
            rotateMix: getConstraintField(constraint, 'rotateMix'),
            translateMix: getConstraintField(constraint, 'translateMix'),
        });
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

    combineSkeletonSkins(args: {
        SKELETON: SpineSkeletonReport<Skeleton>;
        NAMES: string;
    }) {
        const { SKELETON, NAMES } = args;
        if (!(SKELETON && SKELETON instanceof SpineSkeletonReport)) {
            logger.error(translate('typeError'));
            return;
        }
        try {
            const skeleton = SKELETON.valueOf() as any;
            const names = String(NAMES)
                .split(',')
                .map((name) => name.trim())
                .filter(Boolean);
            if (!names.length) {
                throw new Error('skin names are empty');
            }
            const skins = names.map((name) => {
                const skin = skeleton.data.findSkin(name);
                if (!skin) {
                    throw new Error(`skin not found: ${name}`);
                }
                return skin;
            });
            const SkinCtor = skins[0].constructor;
            const combinedSkin = new SkinCtor(`combined:${names.join('+')}`);
            for (const skin of skins) {
                combinedSkin.addSkin(skin);
            }
            skeleton.setSkin(combinedSkin);
            skeleton.setSlotsToSetupPose?.();
            skeleton.updateWorldTransform?.(2);
        } catch (e) {
            logger.error(translate('typeError'), e);
        }
    }

    getSlotAttachment(args: {
        SKELETON: SpineSkeletonReport<Skeleton>;
        SLOT: string;
    }) {
        const { SKELETON, SLOT } = args;
        if (!(SKELETON && SKELETON instanceof SpineSkeletonReport)) {
            logger.error(translate('typeError'));
            return '';
        }
        const skeleton = SKELETON.valueOf() as any;
        const slot = skeleton.findSlot(String(SLOT));
        if (!slot) {
            logger.error(translate('typeError'), `slot not found: ${SLOT}`);
            return '';
        }
        return getSlotAttachmentName(slot);
    }

    getSlotAttachments(args: {
        SKELETON: SpineSkeletonReport<Skeleton>;
        SLOT: string;
        SKIN: string;
    }) {
        const { SKELETON, SLOT, SKIN } = args;
        if (!(SKELETON && SKELETON instanceof SpineSkeletonReport)) {
            logger.error(translate('typeError'));
            return '';
        }
        try {
            const skeleton = SKELETON.valueOf() as any;
            const slotIndex = findSlotIndex(skeleton, String(SLOT));
            if (slotIndex < 0) {
                throw new Error(`slot not found: ${SLOT}`);
            }
            const skinName = String(SKIN || 'default');
            const skin =
                skinName === 'default'
                    ? skeleton.data.defaultSkin || skeleton.skin
                    : skeleton.data.findSkin(skinName);
            if (!skin) {
                throw new Error(`skin not found: ${SKIN}`);
            }
            return JSON.stringify(getSkinAttachmentNames(skin, slotIndex));
        } catch (e) {
            logger.error(translate('typeError'), e);
            return '';
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
            const slot = skeleton.findSlot(String(SLOT));
            if (!slot) {
                throw new Error(`slot not found: ${SLOT}`);
            }
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

    getBoundingBoxes(args: { SKELETON: SpineSkeletonReport<Skeleton> }) {
        if (!(args.SKELETON && args.SKELETON instanceof SpineSkeletonReport)) {
            logger.error(translate('typeError'));
            return '';
        }
        const skeleton = args.SKELETON.valueOf() as any;
        return JSON.stringify(
            collectBoundingBoxes(skeleton).map((box) => ({
                name: box.name,
                slot: box.slot?.data?.name || '',
            })),
        );
    }

    getBoundingBoxVertices(args: {
        SKELETON: SpineSkeletonReport<Skeleton>;
        NAME: string;
    }) {
        if (!(args.SKELETON && args.SKELETON instanceof SpineSkeletonReport)) {
            logger.error(translate('typeError'));
            return '';
        }
        const points = computeBoundingBoxVertices(args.SKELETON.valueOf() as any, String(args.NAME));
        return points ? JSON.stringify(points) : '';
    }

    getBoundingBoxAabb(args: {
        SKELETON: SpineSkeletonReport<Skeleton>;
        NAME: string;
    }) {
        if (!(args.SKELETON && args.SKELETON instanceof SpineSkeletonReport)) {
            logger.error(translate('typeError'));
            return '';
        }
        const points = computeBoundingBoxVertices(args.SKELETON.valueOf() as any, String(args.NAME));
        return points ? JSON.stringify(getAabb(points)) : '';
    }

    isPointInBoundingBox(args: {
        POS: string;
        SKELETON: SpineSkeletonReport<Skeleton>;
        NAME: string;
    }) {
        if (!(args.SKELETON && args.SKELETON instanceof SpineSkeletonReport)) {
            logger.error(translate('typeError'));
            return false;
        }
        try {
            const point = parsePair(args.POS, 'pos');
            const points = computeBoundingBoxVertices(args.SKELETON.valueOf() as any, String(args.NAME));
            return !!points && pointInPolygon(point, points);
        } catch (e) {
            logger.error(translate('typeError'), e);
            return false;
        }
    }

    areBoundingBoxesIntersecting(args: {
        A: SpineSkeletonReport<Skeleton>;
        BOX_A: string;
        B: SpineSkeletonReport<Skeleton>;
        BOX_B: string;
    }) {
        if (!(args.A instanceof SpineSkeletonReport && args.B instanceof SpineSkeletonReport)) {
            logger.error(translate('typeError'));
            return false;
        }
        const a = computeBoundingBoxVertices(args.A.valueOf() as any, String(args.BOX_A));
        const b = computeBoundingBoxVertices(args.B.valueOf() as any, String(args.BOX_B));
        return !!(a && b && polygonsIntersect(a, b));
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
                animationState.addAnimation(
                    TRACK,
                    NAME,
                    toBoolean(LOOP),
                    Number(DELAY) || 0,
                );
            } else {
                animationState.setAnimation(TRACK, NAME, toBoolean(LOOP));
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
            if (isNaN(track) || track < 0) {
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

    setTrackTime(args: {
        STATE: SpineAnimationStateReport<AnimationState>;
        TRACK: number;
        TIME: number;
    }) {
        const { STATE, TRACK, TIME } = args;
        try {
            const { track } = getStateAndTrack(STATE, TRACK);
            const time = Number(TIME);
            if (isNaN(time) || Number(TRACK) < 0) {
                throw new Error('time is invalid');
            }
            track.trackTime = Math.max(0, time);
        } catch (e) {
            logger.error(translate('typeError'), e);
        }
    }

    setTrackProgress(args: {
        STATE: SpineAnimationStateReport<AnimationState>;
        TRACK: number;
        PROGRESS: number;
    }) {
        const { STATE, TRACK, PROGRESS } = args;
        try {
            const { track } = getStateAndTrack(STATE, TRACK);
            const progress = Number(PROGRESS);
            if (isNaN(progress) || Number(TRACK) < 0) {
                throw new Error('progress is invalid');
            }
            track.trackTime =
                getAnimationDuration(track) * Math.min(1, Math.max(0, progress));
        } catch (e) {
            logger.error(translate('typeError'), e);
        }
    }

    listenAnimationEvents(args: {
        STATE: SpineAnimationStateReport<AnimationState>;
    }) {
        try {
            const state = args.STATE.valueOf() as any;
            if (state.__spineProEventListener) {
                return;
            }
            this.animationEvents.set(state, []);
            const push = (type: string, entry: any, event?: any) => {
                const events = this.animationEvents.get(state) || [];
                events.push({
                    type,
                    track: entry?.trackIndex ?? -1,
                    animation: entry?.animation?.name || '',
                    name: event?.data?.name || event?.name || type,
                    intValue: event?.intValue,
                    floatValue: event?.floatValue,
                    stringValue: event?.stringValue,
                });
                if (events.length > 50) {
                    events.shift();
                }
                this.animationEvents.set(state, events);
            };
            state.__spineProEventListener = {
                start: (entry: any) => push('start', entry),
                interrupt: (entry: any) => push('interrupt', entry),
                end: (entry: any) => push('end', entry),
                dispose: (entry: any) => push('dispose', entry),
                complete: (entry: any) => {
                    push('complete', entry);
                    this.handleStateMachineComplete(state, entry?.trackIndex ?? -1);
                },
                event: (entry: any, event: any) => push('event', entry, event),
            };
            state.addListener(state.__spineProEventListener);
        } catch (e) {
            logger.error(translate('typeError'), e);
        }
    }

    popAnimationEvent(args: { STATE: SpineAnimationStateReport<AnimationState> }) {
        try {
            const state = args.STATE.valueOf() as any;
            const events = this.animationEvents.get(state) || [];
            const event = events.shift() || null;
            this.animationEvents.set(state, events);
            return JSON.stringify(event);
        } catch (e) {
            logger.error(translate('typeError'), e);
            return '';
        }
    }

    popFilteredAnimationEvent(args: {
        STATE: SpineAnimationStateReport<AnimationState>;
        TRACK: number;
        ANIMATION: string;
        TYPE: string;
    }) {
        try {
            const state = args.STATE.valueOf() as any;
            const events = this.animationEvents.get(state) || [];
            const track = Number(args.TRACK);
            const animation = String(args.ANIMATION || '');
            const type = String(args.TYPE || '');
            const index = events.findIndex(
                (event) =>
                    (isNaN(track) || track < 0 || event.track === track) &&
                    (!animation || event.animation === animation) &&
                    (!type || event.type === type || event.name === type),
            );
            const event = index >= 0 ? events.splice(index, 1)[0] : null;
            this.animationEvents.set(state, events);
            return JSON.stringify(event);
        } catch (e) {
            logger.error(translate('typeError'), e);
            return '';
        }
    }

    getAnimationStateMonitor(args: {
        STATE: SpineAnimationStateReport<AnimationState>;
    }) {
        try {
            const state = args.STATE.valueOf() as any;
            const tracks = (state.tracks || []).map((track: any, index: number) => {
                if (!track) return null;
                const duration = getAnimationDuration(track);
                const time = getTrackAnimationTime(track);
                return {
                    track: index,
                    animation: track.animation?.name || '',
                    loop: !!track.loop,
                    trackTime: time,
                    duration,
                    progress: duration ? time / duration : 0,
                    timeScale: track.timeScale ?? 1,
                };
            });
            return JSON.stringify({
                timeScale: state.timeScale ?? 1,
                tracks,
                pendingEvents: (this.animationEvents.get(state) || []).length,
            });
        } catch (e) {
            logger.error(translate('typeError'), e);
            return '';
        }
    }

    private getStateMachine(state: any): AnimationStateMachine {
        let machine = this.stateMachines.get(state);
        if (!machine) {
            machine = {
                currentState: '',
                previousState: '',
                states: {},
                inputContext: {},
            };
            this.stateMachines.set(state, machine);
        }
        return machine;
    }

    private handleStateMachineComplete(state: any, trackIndex: number) {
        const machine = this.stateMachines.get(state);
        if (!machine?.currentState) return;
        const current = machine.states[machine.currentState];
        if (!(current && current.track === trackIndex && !current.loop)) return;
        let next = '';
        if (current.returnMode === 'fixed') {
            next = current.returnState;
        } else if (current.returnMode === 'input') {
            next = machine.inputContext[current.returnState] || current.returnState;
        }
        if (next && machine.states[next]) {
            this.switchAnimationStateByName(state, next, true);
        }
    }

    private switchAnimationStateByName(state: any, name: string, force = false) {
        const machine = this.getStateMachine(state);
        const next = machine.states[name];
        if (!next) {
            throw new Error(`state not found: ${name}`);
        }
        const current = machine.states[machine.currentState];
        if (!force && current) {
            const allowed = current.allowInterruptBy.length
                ? current.allowInterruptBy.includes(name)
                : next.priority >= current.priority;
            if (!allowed) return;
        }
        if (current) {
            state.data?.setMix?.(current.animation, next.animation, Math.max(0, next.mix));
        }
        machine.previousState = machine.currentState;
        machine.currentState = name;
        this.listenAnimationEvents({ STATE: new SpineAnimationStateReport(state) });
        state.setAnimation(next.track, next.animation, next.loop);
    }

    registerAnimationState(args: {
        STATE: SpineAnimationStateReport<AnimationState>;
        NAME: string;
        ANIMATION: string;
        TRACK: number;
        LOOP: boolean;
        PRIORITY: number;
        MIX: number;
    }) {
        try {
            const state = args.STATE.valueOf() as any;
            const machine = this.getStateMachine(state);
            machine.states[String(args.NAME)] = {
                animation: String(args.ANIMATION),
                track: Math.max(0, Number(args.TRACK) || 0),
                loop: toBoolean(args.LOOP),
                mix: Math.max(0, Number(args.MIX) || 0),
                priority: Number(args.PRIORITY) || 0,
                returnMode: 'none',
                returnState: '',
                allowInterruptBy: [],
            };
            this.listenAnimationEvents({ STATE: args.STATE });
        } catch (e) {
            logger.error(translate('typeError'), e);
        }
    }

    setAnimationStateReturn(args: {
        STATE: SpineAnimationStateReport<AnimationState>;
        NAME: string;
        MODE: 'none' | 'fixed' | 'input';
        RETURN: string;
    }) {
        try {
            const machine = this.getStateMachine(args.STATE.valueOf() as any);
            const item = machine.states[String(args.NAME)];
            if (!item) throw new Error(`state not found: ${args.NAME}`);
            item.returnMode = args.MODE;
            item.returnState = String(args.RETURN || '');
        } catch (e) {
            logger.error(translate('typeError'), e);
        }
    }

    switchAnimationState(args: {
        STATE: SpineAnimationStateReport<AnimationState>;
        NAME: string;
    }) {
        try {
            this.switchAnimationStateByName(args.STATE.valueOf() as any, String(args.NAME));
        } catch (e) {
            logger.error(translate('typeError'), e);
        }
    }

    setAnimationStateInput(args: {
        STATE: SpineAnimationStateReport<AnimationState>;
        KEY: string;
        VALUE: string;
    }) {
        const machine = this.getStateMachine(args.STATE.valueOf() as any);
        machine.inputContext[String(args.KEY)] = String(args.VALUE);
    }

    getAnimationStateMachineInfo(args: {
        STATE: SpineAnimationStateReport<AnimationState>;
    }) {
        const machine = this.getStateMachine(args.STATE.valueOf() as any);
        return JSON.stringify({
            currentState: machine.currentState,
            previousState: machine.previousState,
            states: Object.keys(machine.states),
            inputContext: machine.inputContext,
        });
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
