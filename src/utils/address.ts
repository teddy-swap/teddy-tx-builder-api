import { C } from "https://deno.land/x/lucid@0.8.8/mod.ts";

export const credentialToBech32 = (pkh: string, stakePkh: string | null): string =>  {
    const address = C.BaseAddress.new(
        0,
        C.StakeCredential.from_keyhash(
          C.Ed25519KeyHash.from_hex(pkh),
        ),
        C.StakeCredential.from_keyhash(
          C.Ed25519KeyHash.from_hex(stakePkh || ""),
        ),
      );
      return address.to_address().to_bech32("addr_test");
}