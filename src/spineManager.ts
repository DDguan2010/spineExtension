import spineVersions, { SceneRenderer } from './spine/spineVersions';
import {
    Skeleton,
    AnimationState,
    AssetManager,
    Versions,
    VersionNames,
} from './spine/spineVersions';
import RenderWebGL from 'scratch-render';

function loadAsset<V extends VersionNames>(
    assetManager: AssetManager<V>,
    skeletonUrl: string,
    atlasUrl: string,
    rawDataURIs?: Record<string, string>,
) {
    if ((assetManager as any).downloader?.rawDataUris) {
        (assetManager as any).downloader.rawDataUris = {};
    }
    if ((assetManager as any).rawDataUris) {
        (assetManager as any).rawDataUris = {};
    }
    if (rawDataURIs) {
        for (const path in rawDataURIs) {
            if (Object.prototype.hasOwnProperty.call(rawDataURIs, path)) {
                (assetManager as any).setRawDataURI(path, rawDataURIs[path]);
            }
        }
    }
    if (skeletonUrl.endsWith('.skel')) {
        assetManager.loadBinary(skeletonUrl);
    } else {
        if ('loadJson' in assetManager) {
            assetManager.loadJson(skeletonUrl);
        } else {
            assetManager.loadText(skeletonUrl);
        }
    }
    assetManager.loadTextureAtlas(atlasUrl);
    return assetManager;
}

function parseSkeleton(
    assetManager: any,
    spine: any,
    skeletonUrl: string,
    atlasUrl: string,
): { skeleton: any; animationState: any } {
    const atlasLoader = new spine.AtlasAttachmentLoader(
        assetManager.get(atlasUrl),
    );
    let loader: any;
    if (skeletonUrl.endsWith('.skel')) {
        loader = new spine.SkeletonBinary(atlasLoader);
    } else {
        loader = new spine.SkeletonJson(atlasLoader);
    }
    const skeletonData = loader.readSkeletonData(assetManager.get(skeletonUrl));
    const skeleton = new spine.Skeleton(skeletonData);
    const animationStateData = new spine.AnimationStateData(skeletonData);
    const animationState = new spine.AnimationState(animationStateData);
    return { skeleton, animationState };
}

function loadAll(assetManager: AssetManager) {
    if ('loadAll' in assetManager) {
        return assetManager.loadAll();
    } else {
        return new Promise((resolve) => {
            const check = () => {
                if (assetManager.getToLoad() == 0) {
                    resolve(assetManager);
                } else {
                    requestAnimationFrame(check);
                }
            };
            check();
        });
    }
}

export class SpineManager<V extends VersionNames = VersionNames> {
    sceneRenderer: SceneRenderer<V>;
    version: V;
    assetManager: AssetManager<V>;
    spine: Versions<V>;
    debugRender: boolean;
    gl: WebGLRenderingContext;

    constructor(version: V, renderer: RenderWebGL) {
        this.version = version;
        this.spine = spineVersions[version];
        this.assetManager = new this.spine.AssetManager(
            renderer.gl,
        ) as AssetManager<V>;
        this.sceneRenderer = new this.spine.SceneRenderer(
            renderer.canvas,
            renderer.gl,
        ) as SceneRenderer<V>;
        this.gl = renderer.gl;
    }
    async loadSkeleton(
        skeletonUrl: string,
        atlasUrl: string,
        rawDataURIs?: Record<string, string>,
    ): Promise<{ skeleton: Skeleton<V>; animationState: AnimationState<V> }> {
        // 重新加载前必须释放旧 atlas 贴图，否则反复加载会线性吃显存。
        // 部分 spine 版本的 AssetManager 没有 removeAll，需用 dispose 兜底确保 GL 纹理被删除。
        if (typeof (this.assetManager as any).removeAll === 'function') {
            this.assetManager.removeAll();
        } else if (typeof (this.assetManager as any).dispose === 'function') {
            (this.assetManager as any).dispose();
        }
        loadAsset(this.assetManager, skeletonUrl, atlasUrl, rawDataURIs);
        await loadAll(this.assetManager);
        return parseSkeleton(
            this.assetManager,
            this.spine,
            skeletonUrl,
            atlasUrl,
        );
    }
    drawSkeleton(
        skeleton: Skeleton<V>,
        tk: any,
        animationState: any,
        viewport: [w: number, h: number],
    ): any {
        skeleton.updateWorldTransform(2); //adapter: in 4.0 and 3.8, don't need this argument
        tk.update();
        animationState.update(tk.delta);
        animationState.apply(skeleton);
        const camera = this.sceneRenderer.camera;
        camera.setViewport(...viewport);
        this.sceneRenderer.begin();
        this.sceneRenderer.drawSkeleton(skeleton as any, true);
        if (this.debugRender) {
            this.sceneRenderer.drawSkeletonDebug(skeleton as any, true);
        }
        this.sceneRenderer.end();
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA); //reset blendfunc
    }
    /**
     * 释放共享资源（atlas 贴图与 sceneRenderer 的 buffer/shader）。
     * 仅可在扩展卸载/整体销毁等"无任何使用者"的时机调用，
     * 不能在单个 skin 销毁时调用，否则会误删同版本其他角色仍在用的 atlas。
     */
    dispose() {
        if (typeof (this.assetManager as any).dispose === 'function') {
            (this.assetManager as any).dispose();
        } else if (typeof (this.assetManager as any).removeAll === 'function') {
            this.assetManager.removeAll();
        }
        (this.sceneRenderer as any)?.dispose?.();
    }
}

// export abstract class Spine4Manager extends SpineManager {
//     assetManager: any;
//     sceneRenderer: any;
//     constructor(version: keyof typeof spineVersions) {
//         super(version);
//     }
//     async loadSkeleton(skeletonUrl: string, atlasUrl: string): Promise<any> {
//         loadAsset(this.assetManager, skeletonUrl, atlasUrl);
//         await this.assetManager.loadAll(); // in 4.x
//     }
// }
