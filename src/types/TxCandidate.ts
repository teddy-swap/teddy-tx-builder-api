
export type HexString = string
export type Bech32String = string

export type Hash32 = HexString
export type Hash28 = HexString

export type ScriptHash = HexString

export type Script = HexString
export type Redeemer = HexString
export type Datum = HexString

export type MintingPolicy = Script

export type Subject = ScriptHash
export type PolicyId = ScriptHash
export type AssetName = string

export type AssetRef = string


export type Lovelace = bigint

export type TxHash = Hash32
export type BlockHash = Hash32

export type TxOutRef = string

export function mkTxOutRef(txHash: TxHash, index: number): TxOutRef {
    return `${txHash}#${index}`
}

export type Slot = bigint

export type ValidityRange = [Slot, Slot]

export type PaymentCred = HexString

export type ExUnits = {
    mem: bigint,
    steps: bigint
}
export type FullTxIn = {
    txOut: TxOut
    consumeScript?: ConsumeScriptInput
}

export type ConsumeScriptInput = {
    validator: Script
    redeemer: Redeemer
    datum?: Datum,
    exUnits: ExUnits
}

export type TxOut = {
    txHash: TxHash
    index: number
    value: Value
    addr: Addr
    dataHash?: Hash32
}

export type Addr = Bech32String

export type AssetEntry = {
    name: AssetName
    policyId: PolicyId
    quantity: bigint
}

export type Value = AssetEntry[]

export type TxOutCandidate = {
    value: Value
    addr: Addr
    data?: Datum
}

export type TxIn = {
    outTxHash: TxHash
    outIndex: number
}

export type TxCandidate = {
    inputs: FullTxIn[]
    outputs: TxOutCandidate[]
    valueMint: Value
    changeAddr: Addr
    validityRange?: ValidityRange
    collateral?: TxIn[]
    ttl?: number
}