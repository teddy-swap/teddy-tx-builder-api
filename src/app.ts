import { Application } from "https://deno.land/x/oak@v11.1.0/mod.ts";
import { Assets, C, createCostModels, fromText, Kupmios, Lucid, PROTOCOL_PARAMETERS_DEFAULT, SLOT_CONFIG_NETWORK, UTxO } from "https://deno.land/x/lucid@0.9.4/mod.ts";
import { Addr, TxCandidate, Value } from "./types/TxCandidate.ts";
const app = new Application();
const port = 8000;

const valueToAssets = (value: Value) => {
    const assets: Assets = {};
    value.forEach(v =>
        assets[
        v.policyId === ''
            ? 'lovelace'
            : v.policyId + fromText(v.name)] = v.quantity);
    return assets;
}

const mkLucid = async () => {
    const lucid = await Lucid.new(
        new Kupmios("https://kupo-preview-api-teddy-swap-preview-414e80.us1.demeter.run", "wss://ogmios-preview-api-teddy-swap-preview-414e80.us1.demeter.run"),
        "Preview"
    )

    const slotConfig = SLOT_CONFIG_NETWORK[lucid.network];
    const protocolParameters = PROTOCOL_PARAMETERS_DEFAULT;

    lucid.txBuilderConfig = C.TransactionBuilderConfigBuilder.new()
        .coins_per_utxo_byte(
            C.BigNum.from_str(protocolParameters.coinsPerUtxoByte.toString()),
        )
        .fee_algo(
            C.LinearFee.new(
                C.BigNum.from_str(protocolParameters.minFeeA.toString()),
                C.BigNum.from_str(protocolParameters.minFeeB.toString()),
            ),
        )
        .key_deposit(
            C.BigNum.from_str(protocolParameters.keyDeposit.toString()),
        )
        .pool_deposit(
            C.BigNum.from_str(protocolParameters.poolDeposit.toString()),
        )
        .max_tx_size(protocolParameters.maxTxSize)
        .max_value_size(protocolParameters.maxValSize)
        .collateral_percentage(protocolParameters.collateralPercentage)
        .max_collateral_inputs(protocolParameters.maxCollateralInputs)
        .max_tx_ex_units(
            C.ExUnits.new(
                C.BigNum.from_str(protocolParameters.maxTxExMem.toString()),
                C.BigNum.from_str(protocolParameters.maxTxExSteps.toString()),
            ),
        )
        .ex_unit_prices(
            C.ExUnitPrices.from_float(
                protocolParameters.priceMem,
                protocolParameters.priceStep,
            ),
        )
        .slot_config(
            C.BigNum.from_str(slotConfig.zeroTime.toString()),
            C.BigNum.from_str(slotConfig.zeroSlot.toString()),
            slotConfig.slotLength,
        )
        .costmdls(createCostModels(protocolParameters.costModels))
        .build();
    return lucid;
}

app.use(async (ctx) => {
    console.log(new Date(), ctx.request.url.host, ctx.request.url.pathname, ctx.request.method);
    switch (ctx.request.url.pathname) {
        case "/v1/tx/teddyswap/refund": {
            switch (ctx.request.method) {
                case "OPTIONS": {
                    ctx.response.status = 204;
                    ctx.response.headers.append('Access-Control-Allow-Origin', 'http://localhost:3000');
                    ctx.response.headers.append('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
                    ctx.response.headers.append('Access-Control-Allow-Headers', 'Content-Type');
                    break;
                }
                case "POST": {
                    const { candidate, requiredSigners, changeAddress }:
                        { candidate: TxCandidate, requiredSigners: Addr[], changeAddress: Addr }
                        = await ctx.request.body().value;

                    const lucid = await mkLucid();
                    const privateKey = C.PrivateKey.generate_ed25519().to_bech32();
                    lucid.selectWalletFromPrivateKey(privateKey);

                    const validatorUtxo = candidate.inputs
                        .filter(u => u.consumeScript != undefined)
                        .map((u): UTxO => {
                            return {
                                txHash: u.txOut.txHash,
                                outputIndex: u.txOut.index,
                                assets: valueToAssets(u.txOut.value),
                                datum: u.consumeScript?.datum!,
                                address: u.txOut.addr,
                                datumHash: u.txOut.dataHash,
                                scriptRef: null,
                            }
                        });

                    const walletUtxos = candidate.inputs
                        .filter(u => u.consumeScript == undefined)
                        .map((u): UTxO => {
                            return {
                                txHash: u.txOut.txHash,
                                outputIndex: u.txOut.index,
                                assets: valueToAssets(u.txOut.value),
                                datum: null,
                                address: u.txOut.addr,
                                datumHash: u.txOut.dataHash,
                                scriptRef: null,
                            }
                        });

                    const validatorData = candidate.inputs.filter(u => u.consumeScript != undefined)[0].consumeScript;

                    let incompleteTx = lucid
                        .newTx()
                        .collectFrom(
                            validatorUtxo,
                            validatorData?.redeemer
                        )
                        .collectFrom(walletUtxos)
                        .attachSpendingValidator({
                            type: "PlutusV2",
                            script: validatorData?.validator!
                        });

                    candidate.outputs.forEach(o => incompleteTx.payToAddress(o.addr, valueToAssets(o.value)));
                    requiredSigners.forEach(r => incompleteTx.addSigner(r));

                    const txComplete = await incompleteTx.complete({
                        change: {
                            address: changeAddress
                        },
                        coinSelection: false
                    });

                    ctx.response.headers.append('Access-Control-Allow-Origin', '*');
                    ctx.response.body = txComplete.toString();
                    break;
                }
            }
            break;
        }
    }
});

console.log(`Listening at port: ${port}`);
await app.listen({ port });