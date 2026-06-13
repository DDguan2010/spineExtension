import RenderWebGL, { AnyWebGLContext } from 'scratch-render';
import type { SpineManager } from './spineManager';
import type { GandiRuntime } from '../types/gandi-type';
import spineVersions, { AnimationState, Skeleton } from './spine/spineVersions';

type RendererSkin = typeof Scratch.runtime.renderer.exports.Skin;

let Skin: any;

function getSkin() {
    if (!Skin) {
        Skin = (Scratch as any).vm.runtime.renderer.exports.Skin;
        Object.setPrototypeOf(SkinProxy.prototype, Skin.prototype);
    }
    return Skin;
}

const SkinProxy: any = class {
    constructor(id: number) {
        return Reflect.construct(getSkin(), [id], new.target);
    }
};

/**
 * 重写hasInstance,使scratch renderer在渲染阶段使用spineSkin.render()
 */
export function patchSpineSkin(runtime: GandiRuntime) {
    getSkin();
    const [id, skin] = runtime.renderer.createSpineSkin();
    runtime.renderer._allSkins[id] = undefined;
    runtime.renderer._nextSkinId--;
    const originSkin = Object.getPrototypeOf(skin).constructor;
    const originHas = originSkin[Symbol.hasInstance];
    Object.defineProperty(originSkin, Symbol.hasInstance, {
        value: function (instance: any) {
            if (instance instanceof SpineSkin || instance?.spine) {
                return true;
            }
            return originHas(instance);
        },
        writable: true,
    });
}

export class SpineSkin extends (SkinProxy as RendererSkin) {
    gl: AnyWebGLContext;
    manager: SpineManager;
    _size: [x: number, y: number];
    skeletonRelativePos: [x: number, y: number];
    skeleton: Skeleton<keyof typeof spineVersions>;
    animationState: AnimationState;
    tk: any;
    name: string;
    renderer: RenderWebGL;
    _disposed: boolean;

    constructor(
        id: number,
        renderer: RenderWebGL,
        manager: SpineManager,
        skeleton: Skeleton,
        animationState: AnimationState,
        tk: any,
        name: string,
    ) {
        super(id);
        this.gl = renderer.gl;
        this.renderer = renderer;

        this.manager = manager;
        this.skeleton = skeleton;
        this.tk = tk;
        this.animationState = animationState;
        this.name = name;
        this._disposed = false;

        this._texture = this.gl.createTexture();
        this.size = [640, 360];
        this.skeletonRelativePos = [0, 0];
        this._rotationCenter = [320, 180];
    }
    set size(size: [number, number]) {
        this._size = size;
    }
    get size() {
        return this._size;
    }
    getTexture(scale: [number, number]) {
        return this._texture;
    }
    updateTransform(drawable: RenderWebGL.Drawable) {
        this.updatePosition(drawable._position as [x: number, y: number]);
        this.updateScale(drawable._scale as [x: number, y: number]);
        this.updateDirection(drawable._direction);
    }
    updatePosition([x, y]: [x: number, y: number]) {
        this.skeleton.x = x + this.skeletonRelativePos[0];
        this.skeleton.y = y + this.skeletonRelativePos[1];
    }
    updateScale([x, y]: [x: number, y: number]) {
        this.skeleton.scaleX = x / 100;
        this.skeleton.scaleY = y / 100;
    }
    updateDirection(direction: number) {
        this.skeleton.getRootBone().rotation = direction - 90;
    }
    render(drawable: RenderWebGL.Drawable) {
        this.updateTransform(drawable);
        this.manager.drawSkeleton(this.skeleton, this.tk, this.animationState, [
            this.renderer._xRight - this.renderer._xLeft,
            this.renderer._yTop - this.renderer._yBottom,
        ]);
        requestAnimationFrame(() => {
            if (this._disposed) return;
            this.emit(getSkin().Events.WasAltered);
        }); //request next frame
    }

    dispose(): void {
        this._disposed = true;
        super.dispose();
        this.render = () => {};
        if (this._texture) {
            this.gl.deleteTexture(this._texture);
            this._texture = null;
        }
        delete this.skeleton;
        delete this.tk;
        delete this.animationState;
    }
}
