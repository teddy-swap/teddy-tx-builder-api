import { Lucid, UTxO } from "https://deno.land/x/lucid@0.8.8/mod.ts";
import { DEPOSIT_VALIDATOR_SCRIPT_OUTREF, POOL_VALIDATOR_SCRIPT_OUTREF, REDEEM_VALIDATOR_SCRIPT_OUTREF, SWAP_VALIDATOR_SCRIPT_OUTREF } from "../config/reference-scripts.ts";
import { DatumType } from "../types/Datum.ts";

export const findValidatorRefScript = async (lucid: Lucid, type: DatumType): Promise<UTxO[] | undefined> => {
    switch (type) {
        case DatumType.Pool: return await lucid.provider.getUtxosByOutRef([POOL_VALIDATOR_SCRIPT_OUTREF]);
        case DatumType.Swap: return await lucid.provider.getUtxosByOutRef([SWAP_VALIDATOR_SCRIPT_OUTREF]); 
        case DatumType.Deposit: return await lucid.provider.getUtxosByOutRef([DEPOSIT_VALIDATOR_SCRIPT_OUTREF]); 
        case DatumType.Redeem: return await lucid.provider.getUtxosByOutRef([REDEEM_VALIDATOR_SCRIPT_OUTREF]);
    }
}