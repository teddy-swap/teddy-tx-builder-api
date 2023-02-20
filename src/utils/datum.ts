import { Data } from "https://deno.land/x/lucid@0.8.8/mod.ts";
import { Datum, DatumType, DepositDatum, PoolDatum, RedeemDatum, SwapDatum } from "../types/Datum.ts";


export const convertToDatumObject = (rawDatum: string, type: DatumType): Datum | undefined  => {
    switch (type) {
        case DatumType.Pool: return Data.from<PoolDatum>(rawDatum, PoolDatum);
        case DatumType.Swap: return Data.from<SwapDatum>(rawDatum, SwapDatum);
        case DatumType.Deposit: return Data.from<DepositDatum>(rawDatum, DepositDatum);
        case DatumType.Redeem: return Data.from<RedeemDatum>(rawDatum, RedeemDatum);
        default: return undefined;
    }
}