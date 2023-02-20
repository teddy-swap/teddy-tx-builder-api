import { Application } from "https://deno.land/x/oak@v11.1.0/mod.ts";
import { Assets, Blockfrost, C, Constr, Data, fromText, getAddressDetails, Lucid, assetsToValue, Kupmios, SLOT_CONFIG_NETWORK, PROTOCOL_PARAMETERS_DEFAULT, createCostModels, UTxO } from "https://deno.land/x/lucid@0.9.4/mod.ts";
import { TxCandidate, Value } from "./types/TxCandidate.ts";
import { DatumType, DepositDatum, RedeemDatum, SwapDatum } from "./types/Datum.ts";
import { convertToDatumObject } from "./utils/datum.ts";
import { credentialToBech32 } from "./utils/address.ts";
import { findValidatorRefScript } from "./utils/utxo.ts";
import { combineAssets } from "./utils/assets.ts";
const app = new Application();
const port = 8000;

const valueToAssets = (value: Value) => {
    const assets: Assets = {};
    value.forEach(v =>
        assets[
        v.policyId === ''
            ? 'lovelace'
            : v.policyId + fromText(v.name)] = BigInt(v.quantity));
    return assets;
}

const mkLucid = async () => {
    // const lucid = await Lucid.new(
    //     new Kupmios("https://kupo-preview-api-test-ad9e12.us1.demeter.run", "wss://ogmios-preview-api-test-ad9e12.us1.demeter.run"),
    //     "Preview"
    //   )

      const lucid = await Lucid.new(
        new Blockfrost(
          "https://cardano-preview.blockfrost.io/api/v0",
          "previewsvCJrhJ5kAN2sUqbeY7okLvKcHftwoEu",
        ),
        "Preview",
      );
    // const slotConfig = SLOT_CONFIG_NETWORK[lucid.network];
    // const protocolParameters = PROTOCOL_PARAMETERS_DEFAULT;

    // lucid.txBuilderConfig = C.TransactionBuilderConfigBuilder.new()
    //     .coins_per_utxo_byte(
    //         C.BigNum.from_str(protocolParameters.coinsPerUtxoByte.toString()),
    //     )
    //     .fee_algo(
    //         C.LinearFee.new(
    //             C.BigNum.from_str(protocolParameters.minFeeA.toString()),
    //             C.BigNum.from_str(protocolParameters.minFeeB.toString()),
    //         ),
    //     )
    //     .key_deposit(
    //         C.BigNum.from_str(protocolParameters.keyDeposit.toString()),
    //     )
    //     .pool_deposit(
    //         C.BigNum.from_str(protocolParameters.poolDeposit.toString()),
    //     )
    //     .max_tx_size(protocolParameters.maxTxSize)
    //     .max_value_size(protocolParameters.maxValSize)
    //     .collateral_percentage(protocolParameters.collateralPercentage)
    //     .max_collateral_inputs(protocolParameters.maxCollateralInputs)
    //     .max_tx_ex_units(
    //         C.ExUnits.new(
    //             C.BigNum.from_str(protocolParameters.maxTxExMem.toString()),
    //             C.BigNum.from_str(protocolParameters.maxTxExSteps.toString()),
    //         ),
    //     )
    //     .ex_unit_prices(
    //         C.ExUnitPrices.from_float(
    //             protocolParameters.priceMem,
    //             protocolParameters.priceStep,
    //         ),
    //     )
    //     .slot_config(
    //         C.BigNum.from_str(slotConfig.zeroTime.toString()),
    //         C.BigNum.from_str(slotConfig.zeroSlot.toString()),
    //         slotConfig.slotLength,
    //     )
    //     .costmdls(createCostModels(protocolParameters.costModels))
    //     .build();
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
                    const { candidate, requiredSigners, changeAddress}:
                        { candidate: TxCandidate, requiredSigners: string[], changeAddress: string}
                        = await ctx.request.body().value;

                    const scriptUtxo = candidate.inputs[0];
                    const type = requiredSigners[0] as DatumType;

                    const lucid = await mkLucid();
                    let datumObject = convertToDatumObject(scriptUtxo.consumeScript?.datum!, type);
                    let pkh: string;
                    let stakePkh: string | null;

                    switch (type) {
                        case DatumType.Deposit: 
                            datumObject = datumObject as DepositDatum;
                            pkh = datumObject.rewardPkh;
                            stakePkh = datumObject.stakePkh;
                            break;
                        
                        case DatumType.Redeem: 
                            datumObject= datumObject as RedeemDatum;
                            pkh = datumObject.rewardPkh;
                            stakePkh = datumObject.stakePkh;
                            break;
                        
                        case DatumType.Swap: 
                            datumObject = datumObject as SwapDatum;
                            pkh = datumObject.rewardPkh;
                            stakePkh = datumObject.stakePkh;
                            break;
                        default: 
                            pkh = "";
                            stakePkh = "";
                            break;
                    }
                    

                    const signerAddress = credentialToBech32(pkh, stakePkh);
                    // const walletUtxos = await lucid.provider.getUtxos(signerAddress);

                    console.log("datum", {pkh, stakePkh});

                    console.log("bech32Datum", signerAddress)
                    
                    const privateKey = C.PrivateKey.generate_ed25519().to_bech32();
                    lucid.selectWalletFromPrivateKey(privateKey);

                    // lucid.selectWalletFromSeed(
                    //     "wine mechanic family session illness desk tilt achieve discover soon paper become essence fruit during",
                    //     {
                    //       addressType: "Base",
                    //       accountIndex: 0,
                    //     },
                    //   );
                    
                    const lucidAddr = await lucid.wallet.address();
                    console.log("lucid", getAddressDetails(await lucid.wallet.address()));
                    console.log("l", lucidAddr);

                    const uScriptUtxo = candidate.inputs
                        .filter(u => u.consumeScript != undefined);

                    // const lucidScriptUtxo = await lucid.provider.getUtxosByOutRef([{
                    //     txHash: uScriptUtxo[0].txOut.txHash,
                    //     outputIndex: uScriptUtxo[0].txOut.index
                    // }]);

                    const lucidScriptUtxo = candidate.inputs
                    .filter(u => u.consumeScript != undefined)
                    .map((u): UTxO => {
                        return {
                            txHash: u.txOut.txHash,
                            outputIndex: u.txOut.index,
                            assets: valueToAssets(u.txOut.value),
                            datum: u.consumeScript?.datum!,
                            address: u.txOut.addr,
                            datumHash: null,
                            scriptRef: null,
                        }
                    });

                    console.log({ lucidScriptUtxo });
                    // console.log({ slucidScriptUtxo });

                    const collateralUtxo = await lucid.provider.getUtxosByOutRef([{
                        txHash: candidate.collateral![0].outTxHash,
                        outputIndex: candidate.collateral![0].outIndex
                    }]);

                    console.log({collateralUtxo})


                    // const lucidScriptUtxo = {
                    //     txHash: scriptUtxo.txOut.txHash,
                    //     outputIndex: scriptUtxo.txOut.index,
                    //     assets: valueToAssets(scriptUtxo.txOut.value),
                    //     datum: scriptUtxo.consumeScript?.datum!,
                    //     address: scriptUtxo.txOut.addr,
                    //     datumHash: scriptUtxo.txOut.dataHash,
                    //     scriptRef: null,
                    // }

                    //const sUtxo = await lucid.provider.getUtxosByOutRef([{txHash: lucidScriptUtxo[0].txHash, outputIndex: lucidScriptUtxo[0].outputIndex}])

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

                    const redeemerIndex = [...lucidScriptUtxo, ...collateralUtxo].map(u => u.txHash + u.outputIndex).sort().findIndex(u => u === lucidScriptUtxo[0].txHash+lucidScriptUtxo[0].outputIndex);
                    const orderRedeemer: string = Data.to(
                        new Constr(0, [BigInt(redeemerIndex), BigInt(redeemerIndex), 0n, 1n]),
                    );
                    const validatorData = scriptUtxo.consumeScript;
                    const refScript = await findValidatorRefScript(lucid, type);
                    const combinedAsset = lucidScriptUtxo[0].assets;
                    console.log({combinedAsset});
                    // combinedAsset["lovelace"] =  combinedAsset["lovelace"] - 500000n;
                    console.log({combinedAsset});
                    console.log({refScript})
                    console.log({redeemerIndex})
                    // console.log({sUtxo});
                    // console.log(sUtxo[0].datum);
                    console.log("signerAddress", signerAddress);
                    
                    const incompleteTx = lucid
                        .newTx()

                        .collectFrom(
                            lucidScriptUtxo,
                            orderRedeemer
                        )
                        .readFrom(refScript!)
                        // .attachSpendingValidator({
                        //     type: "PlutusV2",
                        //     script: validatorData?.validator!
                        // })
                        .collectFrom(collateralUtxo)
                        .payToAddress(signerAddress, combinedAsset)
                        .addSigner(signerAddress);


                        


                        // const signedTx = await tx.sign().complete();
                        // const txHash = await signedTx.submit();

                        // console.log({txHash})
                    
                    // addr_test1qrz4zdjhg9t9kuyqs4k24ygx006u9k52vtmvul92zrmeh9udrlylnvpdu48sftjs86ket5q86lqxcvzg0v8epjgz3chq2qh8y2 
                    // addr_test1qrz4zdjhg9t9kuyqs4k24ygx006u9k52vtmvul92zrmeh9udrlylnvpdu48sftjs86ket5q86lqxcvzg0v8epjgz3chq2qh8y2
                    // addr_test1qrz4zdjhg9t9kuyqs4k24ygx006u9k52vtmvul92zrmeh9udrlylnvpdu48sftjs86ket5q86lqxcvzg0v8epjgz3chq2qh8y2
                    

                    //candidate.outputs.forEach(o => incompleteTx.payToAddress(o.addr, valueToAssets(o.value)));
                    // requiredSigners.forEach(r => incompleteTx.addSigner(r));

                    // const collateralUtxo =
                    //     walletUtxos.find(u => {
                    //         let lovelaceOnly = true;
                    //         for (let unit in u.assets) {
                    //             if (unit != 'lovelace') {
                    //                 lovelaceOnly = false;
                    //                 break;
                    //             }
                    //         }
                    //         return !lovelaceOnly;
                    //     });

                    incompleteTx.txBuilder.add_collateral(
                        C.TransactionUnspentOutput.new(
                            C.TransactionInput.new(
                                C.TransactionHash.from_hex(collateralUtxo[0].txHash),
                                C.BigNum.from_str(collateralUtxo[0].outputIndex.toString() as string)
                            ),
                            C.TransactionOutput.new(
                                C.Address.from_bech32(collateralUtxo[0].address as string),
                                assetsToValue(collateralUtxo[0].assets)
                            )
                        )
                    );

                    const tx = await incompleteTx.complete({
                            change: {
                                address: signerAddress
                            },
                            coinSelection: false,
                            nativeUplc: false
                        });

                    console.log("");
                    console.log(tx.toString());

                    ctx.response.headers.append('Access-Control-Allow-Origin', '*');
                    ctx.response.body = tx.toString();
                    break;
                }
            }
            break;
        }
    }
});

console.log(`Listening at port: ${port}`);
await app.listen({ port });