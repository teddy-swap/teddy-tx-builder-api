import { Assets } from "https://deno.land/x/lucid@0.9.4/mod.ts";

export const combineAssets = (assets: Assets[]): Assets => {
    const combinedAssets: Assets = {}

    for (const asset of assets) {
        Object.entries(asset).forEach(val => {
            combinedAssets[val[0]] = (combinedAssets[val[0]] == undefined ? 0n : combinedAssets[val[0]]) + val[1]
        });
    }

    return combinedAssets;
}

