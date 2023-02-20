import { Data } from "https://deno.land/x/lucid@0.8.8/mod.ts";

export const AssetClass = Data.Tuple([Data.String, Data.String], true);

export const SwapDatum = Data.Object({
  base: AssetClass,
  quote: AssetClass,
  poolNft: AssetClass,
  feeNum: Data.BigInt,
  exFeePerTokenNum: Data.BigInt,
  exFeePerTokenDen: Data.BigInt,
  rewardPkh: Data.String,
  stakePkh: Data.Nullable(Data.String),
  baseAmount: Data.BigInt,
  minQuoteAmount: Data.BigInt,
});

export const DepositDatum = Data.Object({
  poolNft: AssetClass,
  x: AssetClass,
  y: AssetClass,
  lq: AssetClass,
  exFee: Data.BigInt,
  rewardPkh: Data.String,
  stakePkh: Data.Nullable(Data.String),
  collateralAda: Data.BigInt,
});

export const RedeemDatum = Data.Object({
  poolNft: AssetClass,
  x: AssetClass,
  y: AssetClass,
  lq: AssetClass,
  exFee: Data.BigInt,
  rewardPkh: Data.String,
  stakePkh: Data.Nullable(Data.String),
});

export const PoolDatum = Data.Object({
  poolNft: AssetClass,
  poolX: AssetClass,
  poolY: AssetClass,
  poolLq: AssetClass,
  feeNum: Data.BigInt,
});

export type PoolDatum = Data.Static<typeof PoolDatum>;
export type SwapDatum = Data.Static<typeof SwapDatum>;
export type DepositDatum = Data.Static<typeof DepositDatum>;
export type RedeemDatum = Data.Static<typeof RedeemDatum>;
export type AssetClassType = [string, string];
export type Datum = PoolDatum | SwapDatum | DepositDatum | RedeemDatum;
export enum DatumType {
    Pool = 'pool',
    Swap = 'swap',
    Deposit = 'deposit',
    Redeem = 'redeem'
}
