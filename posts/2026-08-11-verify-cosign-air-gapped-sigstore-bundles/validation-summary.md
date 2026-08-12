# Validation Summary: Verify Cosign Signatures Offline with Sigstore Bundles

## Status
validated

## Post Type
Technical Guide / Supply Chain Security Tutorial

## Technologies Covered
- Cosign v3.1.3 CLI
- Sigstore protobuf bundles
- Sigstore keyless signing and verification
- Fulcio short-lived signing certificates
- Rekor v1 and Rekor v2 transparency logs
- RFC 3161 signed timestamps
- The Update Framework (TUF)
- Sigstore `TrustedRoot` JSON
- OCI images, image indexes, layouts, and referrers
- OIDC certificate identity and issuer policy
- Bash and `jq`

## Sources Consulted
- [Cosign v3.1.3 release](https://github.com/sigstore/cosign/releases/tag/v3.1.3) — current release and release date at validation time.
- [Cosign v3.1.3 `verify` reference](https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_verify.md) — `--local-image`, `--trusted-root`, identity, and issuer options.
- [Cosign v3.1.3 `save` reference](https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_save.md) — command syntax and documented save scope.
- [Cosign v3.1.3 `sign-blob` reference](https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_sign-blob.md) and [`verify-blob` reference](https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_verify-blob.md) — protobuf bundle creation and offline verification flags.
- [Cosign v3.1.3 `initialize` reference](https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_initialize.md) and [initialization implementation](https://github.com/sigstore/cosign/blob/v3.1.3/cmd/cosign/cli/initialize/init.go) — embedded TUF root, mirror, cache, aggregate trusted-root target, and fallback behavior.
- [Cosign v3.1.3 `trusted-root create` reference](https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_trusted-root_create.md) — assembling a trusted root from independently supplied service material.
- [Cosign v3.1.3 save implementation](https://github.com/sigstore/cosign/blob/v3.1.3/cmd/cosign/cli/save.go), [referrer lookup](https://github.com/sigstore/cosign/blob/v3.1.3/pkg/oci/remote/referrers.go), and [remote image lookup](https://github.com/sigstore/cosign/blob/v3.1.3/pkg/oci/remote/image.go) — saved-layout behavior and the separate-`COSIGN_REPOSITORY` limitation.
- [Cosign v3.1.3 local bundle verification tests](https://github.com/sigstore/cosign/blob/v3.1.3/test/e2e_test.go#L4092-L4193) — supported single-image v3 bundle save and local verification path.
- [Cosign issue #4937](https://github.com/sigstore/cosign/issues/4937) and [unmerged fix PR #5023](https://github.com/sigstore/cosign/pull/5023) — current failure for saved multi-platform image indexes.
- [Cosign claim verifiers](https://github.com/sigstore/cosign/blob/v3.1.3/pkg/cosign/verifiers.go) — comparison of the signed subject with the digest recovered from the supplied image/layout.
- [Sigstore client specification](https://github.com/sigstore/architecture-docs/blob/main/client-spec.md) — bundle inputs, external policy, Rekor v1 integrated time, RFC 3161 time, certificate validation, and offline verification.
- [Sigstore bundle protobuf specification](https://github.com/sigstore/protobuf-specs/blob/main/protos/sigstore_bundle.proto) — bundle certificate, signature, transparency entry, and timestamp fields.
- [Sigstore TrustedRoot protobuf specification](https://github.com/sigstore/protobuf-specs/blob/main/protos/sigstore_trustroot.proto) — trusted authorities, log keys, and validity periods.
- [Sigstore custom-components documentation](https://docs.sigstore.dev/cosign/system_config/custom_components/) — TUF distribution and manually assembled trusted-root guidance.
- [Sigstore public `trusted_root.json` TUF target](https://github.com/sigstore/root-signing/blob/main/targets/trusted_root.json) and [The Update Framework specification](https://theupdateframework.github.io/specification/) — authenticated trust material and TUF update/rollback protections.

## Issues Found
1. **The registry-image recipe incorrectly covered multi-platform image indexes.** Cosign v3.1.3 can save and locally verify a v3 bundle for a single-image manifest, but local bundle discovery does not recognize the saved `imageIndex` annotation. A signed multi-platform index can therefore verify online, save successfully, and then fail local verification. The post now requires a single-image-manifest digest for v3.1.3 and directs index users to separately signed platform manifests or a later release in which the upstream fix has been qualified.
2. **The `COSIGN_REPOSITORY` advice was not valid for current v3 referrers.** In v3.1.3, `cosign save` discovers referrers in the override repository but reconstructs each returned referrer reference in the original image repository. Merely retaining the same environment variable is therefore insufficient. The post now requires co-located referrers or a later end-to-end-tested release.
3. **The protected `subjectDigest` was declared but never enforced by the offline command.** `cosign verify --local-image` checks the bundle subject against the image found in the local layout; it does not compare that layout digest with a separately approved policy value. The post now binds repository and digest policy to the authenticated transfer manifest and explicitly extracts the single saved-image descriptor with `jq` before comparing it with `$EXPECTED_DIGEST`.
4. **Repository identity was treated as if it could be recovered from the v3 bundle.** The v3 subject authenticates the artifact digest, not the original registry repository as an authorization identity. The policy now includes `imageRepository`, and the text requires the authenticated transfer manifest to bind that external policy value to the exported layout.
5. **Trusted-time terminology conflated Rekor integrated time with RFC 3161 timestamps.** A verified Rekor v1 `integratedTime` is an observer timestamp, while RFC 3161 supplies a signed timestamp. Rekor v2 has no integrated time and requires signed timestamp material for keyless certificate validation. The opening requirements and expired-certificate explanation now distinguish these cases and accurately allow the timestamp and transparency combinations defined by the Sigstore client specification.
6. **Private TUF initialization omitted the mirror flag and assumed an aggregate target always exists.** The post referred to a private mirror without naming `--mirror`, did not state that `--root-checksum` is required when downloading the initial root over HTTP(S), and assumed every private repository publishes `trusted_root.json`. It now gives the correct flag conditions and explains when `cosign trusted-root create` is required.
7. **Several operational claims were too broad.** “Associated registry artifacts” could imply arbitrary attachments that `cosign save` does not promise to preserve, and running online verification does not itself create a retained audit record. The post now limits export claims to supported signature/bundle material and conditions the audit-record claim on retaining command output and status.
8. **Version scope was insufficient for an air-gap procedure.** The guide referred generally to “current Cosign” and major/minor testing even though patch-level behavior matters here. It is now explicitly validated against v3.1.3, links to version-pinned command references, and requires qualification of the exact release.

## Review Notes
- All displayed Cosign commands and visible flags were checked against Cosign v3.1.3. The `verify`, `save`, `initialize`, `sign-blob`, and `verify-blob` syntax is valid.
- `--offline` still exists internally in v3.1.3 but is deprecated and hidden; it is not needed for the shown local-image bundle command. The omitted `--new-bundle-format` option is also deprecated/hidden in v3.1.3, and the relevant format is auto-detected for a saved single-image layout.
- The corrected offline digest check requires a trusted `jq` installation. If `jq` is transferred with the package, its binary and version metadata must be covered by the authenticated transfer manifest, as the post now states.
- A stale trusted root may both reject material signed under newly rotated keys and leave the air-gapped verifier unaware of later trust or revocation changes. The post's recurring audited refresh procedure remains necessary.
- The upstream image-index and separate-repository behavior may change after v3.1.3. Any later release should be tested end to end before those restrictions are relaxed.
