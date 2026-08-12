# Validation Summary: Rekor in Cosign Verification During a Transparency-Log Outage

## Status
validated

## Post Type
Technical guide / supply-chain security incident-response guide

## Technologies Covered
- Sigstore
- Cosign v3
- Rekor v1 and Rekor v2
- Fulcio and certificate transparency
- Sigstore protobuf bundles and trusted roots
- RFC 3161 timestamp authorities
- OCI images, registries, and referring artifacts

## Sources Consulted
- [Sigstore Rekor overview](https://docs.sigstore.dev/logging/overview/)
- [Sigstore security model](https://docs.sigstore.dev/about/security/)
- [Sigstore threat model](https://docs.sigstore.dev/about/threat-model/)
- [Sigstore timestamp documentation](https://docs.sigstore.dev/cosign/verifying/timestamps/)
- [Sigstore bundle format](https://docs.sigstore.dev/about/bundle/)
- [Sigstore Fulcio specification](https://github.com/sigstore/architecture-docs/blob/main/fulcio-spec.md)
- [Sigstore client specification](https://github.com/sigstore/architecture-docs/blob/main/client-spec.md)
- [Rekor v2 specification](https://github.com/sigstore/architecture-docs/blob/main/rekor-v2-spec.md)
- [Rekor v2 client changes](https://github.com/sigstore/rekor-tiles/blob/main/CLIENTS.md)
- [Sigstore protobuf bundle schema](https://github.com/sigstore/protobuf-specs/blob/main/protos/sigstore_bundle.proto)
- [Sigstore protobuf trusted-root schema](https://github.com/sigstore/protobuf-specs/blob/main/protos/sigstore_trustroot.proto)
- [Public Sigstore default signing configuration](https://github.com/sigstore/root-signing/blob/main/targets/signing_config.v0.2.json)
- [Public Sigstore Rekor v2 signing configuration](https://github.com/sigstore/root-signing/blob/main/targets/signing_config_rekor_v2.v0.2.json)
- [RFC 3161: Internet X.509 Public Key Infrastructure Time-Stamp Protocol](https://www.rfc-editor.org/rfc/rfc3161.html)
- [Cosign v3.1.3 release](https://github.com/sigstore/cosign/releases/tag/v3.1.3)
- [Cosign v3.1.3 `sign` reference](https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_sign.md)
- [Cosign v3.1.3 `verify` reference](https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_verify.md)
- [Cosign v3.1.3 `sign-blob` reference](https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_sign-blob.md)
- [Cosign v3.1.3 `verify-blob` reference](https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_verify-blob.md)
- [Cosign v3.1.3 `save` reference](https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_save.md)
- [Cosign v3.1.3 `bundle` reference](https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_bundle.md)
- [Cosign v3.1.3 signing-config reference](https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_signing-config_create.md)
- [Cosign custom-component configuration](https://docs.sigstore.dev/cosign/system_config/custom_components/)

## Issues Found
1. **Ephemeral-key behavior was attributed too broadly to Fulcio.** Fulcio binds a submitted public key to an identity but does not require that key to be ephemeral. Changed the text to identify generation and use of the ephemeral key as behavior of Cosign's keyless flow.
2. **Transparency evidence was described as inherent to every standardized Cosign v3 bundle.** Transparency-log entries are optional in the bundle schema, including for intentionally logless configurations. Scoped the claim to bundles produced by Cosign v3's default public signing path.
3. **The Rekor v2 API and outage wording was overly categorical.** Rekor v2 removes Rekor v1's entry/proof lookup and search APIs, but it still exposes tile, entry, and checkpoint endpoints for monitors and proof computation. Clarified that distinction and stated directly that locally retained evidence remains verifiable during an outage, while a Rekor v1 fallback lookup can be blocked.
4. **The disconnected-verification trusted-root wording was underspecified.** Clarified that `--trusted-root` takes a Sigstore `TrustedRoot` JSON file, avoiding confusion with a TUF root metadata file.
5. **The recovery log-review step did not explain the Rekor v2 mechanism.** Changed it to use retained bundles or a monitor's index, which is required because Rekor v2 has no identity or digest search API.

## Review Notes
- The blob signing and verification examples are valid with current stable Cosign v3.1.3. The `--bundle`, `--certificate-identity`, and `--certificate-oidc-issuer` flags are current and correctly used.
- `--tlog-upload=false` remains available as a deprecated compatibility flag, and Cosign v3 rejects it with the default `--use-signing-config=true` path. A custom signing configuration without a transparency-log service is the supported v3 configuration mechanism, and ordinary verification of its logless output requires an explicit policy such as `--insecure-ignore-tlog`.
- `cosign bundle create`, `cosign bundle inspect`, `cosign save --dir`, `cosign verify --local-image`, and `--trusted-root` were confirmed in the v3.1.3 command references and CLI behavior.
- `cosign sign-blob` can prompt for confirmation when run interactively. Automated pipelines normally add `--yes`, but its omission does not make the example invalid.
- As of the validation date, the public Sigstore default signing configuration still selects Rekor v1; Rekor v2 is available through a separate signing configuration. The post correctly discusses both versions without claiming that v2 is the public default.
- The Sigstore security-model and threat-model pages primarily describe the Rekor v1 SET and live-proof-lookup flow. The post correctly scopes that material to Rekor v1 and uses the Rekor v2 specifications for the v2 behavior.
