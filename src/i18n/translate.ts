import zh_cn from './zh_cn';
import en from './en';

export type Id = keyof typeof en & keyof typeof zh_cn;
export type TranslateFn = <T extends Id>(
    id: T,
    args?: object,
) => (typeof zh_cn)[T] | (typeof en)[T];

let translateFn: TranslateFn;

export function getTranslate(): TranslateFn {
    if (translateFn) {
        return translateFn;
    }
    if (!Scratch.runtime) {
        throw new Error('get translate调用太晚');
    }
    const getFmt = (Scratch.runtime as any).getFormatMessage;
    const fmt =
        typeof getFmt === 'function'
            ? getFmt.call(Scratch.runtime, { 'zh-cn': zh_cn, en })
            : (msg: { default?: string }) => (msg && msg.default) || '';
    translateFn = function (id: Id, args?: object) {
        return fmt(
            {
                default: id,
            },
            args,
        );
    };
    return getTranslate();
}

export { zh_cn, en };
