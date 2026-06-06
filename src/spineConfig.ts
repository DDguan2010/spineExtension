import { VersionNames } from './spine/spineVersions';

export type RawSpineConfig = {
    skel: string;
    atlas: string;
    version: VersionNames;
    rawDataURIs?: Record<string, string>;
};

function shouldPrefixAssetUrl(v: string) {
    return !v.startsWith('http') && !v.startsWith('data:');
}

export class SpineConfig implements RawSpineConfig {
    private _skel: string;
    private _atlas: string;
    version: VersionNames;
    rawDataURIs?: Record<string, string>;
    constructor(config: {
        skel: string;
        atlas: string;
        version: VersionNames;
        rawDataURIs?: Record<string, string>;
    }) {
        this.version = config.version;
        this.rawDataURIs = config.rawDataURIs;
        this.skel = config.skel;
        this.atlas = config.atlas;
    }
    set skel(v: string) {
        if (shouldPrefixAssetUrl(v) && !(this.rawDataURIs && v in this.rawDataURIs)) {
            v = `https://m.ccw.site/user_projects_assets/${v}`;
        }
        this._skel = v;
    }
    get skel() {
        return this._skel;
    }

    set atlas(v: string) {
        if (shouldPrefixAssetUrl(v) && !(this.rawDataURIs && v in this.rawDataURIs)) {
            v = `https://m.ccw.site/user_projects_assets/${v}`;
        }
        this._atlas = v;
    }
    get atlas() {
        return this._atlas;
    }

    toJSON() {
        return {
            skel: this.skel,
            atlas: this.atlas,
            version: this.version,
            rawDataURIs: this.rawDataURIs,
        };
    }
}
