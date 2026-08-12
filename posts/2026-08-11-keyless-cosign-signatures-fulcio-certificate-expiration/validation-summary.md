# Validation Summary: What Happens to Keyless Cosign Signatures After the Fulcio Certificate Expires?

## Status
validated

## Post Type
Technical guide and operational reference

## Technologies Covered
- Cosign v3 keyless signing and verification
- Sigstore bundles
- Fulcio short-lived code-signing certificates
- Rekor v1 and Rekor v2 transparency logs
- RFC 3161 timestamp authorities
- Fulcio certificate transparency and Signed Certificate Timestamps
- OCI Image 1.1 referrers
- Sigstore trusted roots and The Update Framework (TUF)
- OpenID Connect and GitHub Actions workload identities

## Sources Consulted
- Sigstore Security Model - https://docs.sigstore.dev/about/security/
- Sigstore Threat Model - https://docs.sigstore.dev/about/threat-model/
- Sigstore Timestamps documentation - https://docs.sigstore.dev/cosign/verifying/timestamps/
- Sigstore Bundle Format - https://docs.sigstore.dev/about/bundle/
- Fulcio Certificate Issuing Overview - https://docs.sigstore.dev/certificate_authority/certificate-issuing-overview/
- Sigstore Quickstart with Cosign - https://docs.sigstore.dev/quickstart/quickstart-cosign/
- Sigstore Registry Support - https://docs.sigstore.dev/cosign/system_config/registry_support/
- Cosign v3.1.3 `sign-blob` command reference - https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_sign-blob.md
- Cosign v3.1.3 `verify-blob` command reference - https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_verify-blob.md
- Cosign v3.1.3 `verify` command reference - https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_verify.md
- Cosign v3.1.3 `save` command reference - https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_save.md
- Sigstore bundle protobuf specification - https://github.com/sigstore/protobuf-specs/blob/main/protos/sigstore_bundle.proto
- Sigstore trusted-root protobuf specification - https://github.com/sigstore/protobuf-specs/blob/main/protos/sigstore_trustroot.proto
- sigstore-go observer-timestamp and certificate-path verification flow - https://github.com/sigstore/sigstore-go/blob/main/pkg/verify/signed_entity.go
- Rekor v2 client requirements - https://github.com/sigstore/rekor-tiles/blob/main/CLIENTS.md
- RFC 3161, Internet X.509 Public Key Infrastructure Time-Stamp Protocol - https://datatracker.ietf.org/doc/html/rfc3161
- The Update Framework specification - https://theupdateframework.github.io/specification/latest/
- Cosign verification advisory GHSA-whqx-f9j3-ch6m - https://github.com/sigstore/cosign/security/advisories/GHSA-whqx-f9j3-ch6m

## Issues Found
- The post described trusted time generically as "Rekor signed time," which reflects Rekor v1 but not Rekor v2. Updated the explanation to distinguish Rekor v1's `integratedTime`, authenticated by its `signedEntryTimestamp`, from the separate RFC 3161 timestamp required with Rekor v2.
- Several sentences treated the timestamp as the exact signing instant and implied certificate expiry prevents the key from producing signatures. Changed them to describe trusted observer times bound to the signature and the verifier's certificate-validity decision; certificate expiry limits acceptance, while disposal of the ephemeral private key prevents later use.
- The bundle list implied that a current public-good keyless bundle carries the Fulcio trust chain. Corrected it to state that current bundles carry the leaf certificate; older or private-infrastructure bundles can use chain material, while independently trusted CA material comes from the trusted root.
- The container-storage description treated the signature and bundle as separate objects. Corrected it for Cosign v3: the signature and verification material are together in a Sigstore bundle published as an OCI Image 1.1 referring artifact.
- The SCT discussion could be read as treating the SCT as artifact-signing-time evidence. Clarified that it is the certificate-transparency log's signed inclusion promise for the Fulcio certificate and is separate from the trusted timestamp bound to the artifact signature.
- The wildcard identity warning used `.*` without naming the regular-expression flag. Changed it to the actual `--certificate-identity-regexp='.*'` form because `--certificate-identity` performs exact matching.
- The compromise discussion claimed transparency makes unexpected signing detectable without noting the monitoring requirement. Added that detection depends on monitoring the logs, as required by Sigstore's security model.
- The trusted-root section omitted certificate-transparency-log keys and timestamp-authority chains and suggested that an arbitrary historical root might be supplied. Updated it to describe the full trusted-root contents and require authenticated, up-to-date material that retains the authority entries valid at the signature's time.

## Review Notes
All example commands and flags are current and syntactically valid in Cosign v3.1.3, including `--bundle`, `--certificate-identity`, `--certificate-oidc-issuer`, `--insecure-ignore-tlog`, and `--insecure-ignore-sct`. The GitHub Actions identity and issuer example is correct. `cosign save` remains valid for saving an image and associated signatures, but offline verification also requires independently authenticated trusted-root material and the intended identity policy. All links in the post's Official Documentation section resolved to relevant official sources. The OCI referring-artifact behavior is now explicitly scoped to Cosign v3 because older Cosign releases used different storage and bundle defaults.
