# Validation Summary: Configure Embedded SCTs for a Self-Hosted Fulcio CT Log

## Status
validated

## Post Type
Technical Guide / Deployment Tutorial

## Technologies Covered
- Fulcio and its `EmbeddedSCTCA` certificate-issuance path
- Sigstore private trust roots and TUF-based trust distribution
- RFC 6962 Certificate Transparency, precertificates, SCTs, and Log IDs
- Tesseract static Certificate Transparency logs
- `certificate-transparency-go`
- Cosign image and bundle verification
- OpenSSL certificate and public-key inspection
- KMS, PKCS #11, file-backed, Tink, and ephemeral Fulcio CA backends

## Sources Consulted
- [Fulcio embedded-SCT server selection at the reviewed `main` commit](https://github.com/sigstore/fulcio/blob/ae51cd5b978de4389588cbb20cb08845e4e8b98c/pkg/server/grpc_server.go) - embedded-versus-detached selection, CT submission, response variants, and failure behavior.
- [Fulcio `EmbeddedSCTCA` interface](https://github.com/sigstore/fulcio/blob/ae51cd5b978de4389588cbb20cb08845e4e8b98c/pkg/ca/embeddedca.go) and [BaseCA implementation](https://github.com/sigstore/fulcio/blob/ae51cd5b978de4389588cbb20cb08845e4e8b98c/pkg/ca/baseca/baseca.go) - poison/SCT extensions, precertificate construction, and final-certificate issuance.
- [Fulcio CA implementations](https://github.com/sigstore/fulcio/tree/ae51cd5b978de4389588cbb20cb08845e4e8b98c/pkg/ca) and [Fulcio setup documentation](https://github.com/sigstore/fulcio/blob/ae51cd5b978de4389588cbb20cb08845e4e8b98c/docs/setup.md) - backend capabilities, file-key requirements, KMS configuration, and version-dependent documentation.
- [Fulcio server flags and CT client construction](https://github.com/sigstore/fulcio/blob/ae51cd5b978de4389588cbb20cb08845e4e8b98c/cmd/app/serve.go) - CT URL, public key, TLS CA, HTTP `Host`, and KMS flags.
- [Fulcio's Tesseract image](https://github.com/sigstore/fulcio/blob/ae51cd5b978de4389588cbb20cb08845e4e8b98c/Dockerfile.tesseract) and [Compose configuration](https://github.com/sigstore/fulcio/blob/ae51cd5b978de4389588cbb20cb08845e4e8b98c/docker-compose.yml) - pinned Tesseract v0.1.1 binary and deployment arguments.
- [`certificate-transparency-go` v1.3.3 JSON client](https://github.com/google/certificate-transparency-go/blob/v1.3.3/jsonclient/client.go) and [CT log client](https://github.com/google/certificate-transparency-go/blob/v1.3.3/client/logclient.go) - request paths and conditional SCT-signature verification.
- [Tesseract v0.1.1 POSIX flags](https://github.com/transparency-dev/tesseract/blob/v0.1.1/cmd/tesseract/posix/main.go), [submission handlers](https://github.com/transparency-dev/tesseract/blob/v0.1.1/internal/ct/handlers.go), and [log setup](https://github.com/transparency-dev/tesseract/blob/v0.1.1/ctlog.go) - origin/path-prefix matching, root loading, accepted EKUs, and publication behavior.
- [C2SP Static CT API](https://c2sp.org/static-ct-api) - submission-prefix and checkpoint-origin requirements.
- [RFC 6962](https://www.rfc-editor.org/rfc/rfc6962) - precertificate poison and SCT-list OIDs, `add-pre-chain`, the DER SubjectPublicKeyInfo Log ID, maximum merge delay, and inclusion/consistency semantics.
- [Cosign `verify` reference](https://github.com/sigstore/cosign/blob/main/doc/cosign_verify.md), [`verify-blob` reference](https://github.com/sigstore/cosign/blob/main/doc/cosign_verify-blob.md), and [custom trusted-root documentation](https://docs.sigstore.dev/cosign/system_config/custom_components/) - supported flags and required verification material.
- [Cosign trusted-root creator](https://github.com/sigstore/cosign/blob/main/cmd/cosign/cli/trustedroot/trustedroot.go) and [its static-CT test](https://github.com/sigstore/cosign/blob/main/cmd/cosign/cli/trustedroot/trustedroot_test.go) - current `origin` handling and the distinction between SCT Log IDs and checkpoint key IDs.
- [Sigstore TrustedRoot schema](https://github.com/sigstore/protobuf-specs/blob/main/protos/sigstore_trustroot.proto) - historical-key retention, validity intervals, `logId`, and v0.2 `checkpointKeyId` semantics.
- [OpenSSL `x509` reference](https://docs.openssl.org/master/man1/openssl-x509/) and [OpenSSL object-name registry](https://github.com/openssl/openssl/blob/master/crypto/objects/objects.txt) - extension display behavior for the CT poison OID.

## Issues Found
1. **SCT verification was described as unconditional.** `certificate-transparency-go` verifies the returned SCT signature only when Fulcio was given a CT public key. The transaction description now states that verification is conditional on `--ct-log-public-key-path`.
2. **The file-backed CA was classified as testing-oriented.** Upstream explicitly labels `ephemeralca`, not `fileca`, as testing-only. The post now distinguishes the testing-only ephemeral backend from the encrypted on-disk key and stronger host-protection requirements of `fileca`.
3. **The Tesseract example did not identify the pinned implementation precisely.** The post now records that Fulcio Compose pins Tesseract POSIX v0.1.1 and renames its `posix` binary to `tesseract`, making the shown executable and version-specific flags traceable.
4. **The Tesseract origin, route, and Fulcio URL were inconsistent.** A Fulcio base URL ending in `/acme-fulcio-2026` makes the CT client call `/acme-fulcio-2026/ct/v1/add-pre-chain`, but Tesseract without `--path_prefix` serves `/ct/v1/add-pre-chain`. Added `--path_prefix=/acme-fulcio-2026` and changed `--origin` to the required schema-less submission prefix `ct-write.example.com/acme-fulcio-2026`.
5. **Accepted-root reload behavior was incomplete.** In the pinned v0.1.1 POSIX implementation, `--roots_pem_file` is read at startup, so a root migration requires a restart or redeployment after updating the file. The post now says so and notes that newer releases can also load remote and storage-cached roots.
6. **The `--ct-log-origin` example used the wrong host for the described routing case.** Fulcio sets this value as the HTTP `Host` header. The example now uses an internal connection URL while overriding the header with the public Tesseract submission host.
7. **The RFC 6962 Log ID description was imprecise.** It now identifies the hashed bytes as the DER-encoded SubjectPublicKeyInfo rather than the ambiguous “DER public key.” The existing OpenSSL pipeline already emits the correct bytes.
8. **The poison-extension check could miss an actual poison extension.** OpenSSL recognizes the OID and normally prints `CT Precertificate Poison`, not its numeric form. The grep now accepts both the registered name and numeric OID.
9. **The Cosign image command used an unsupported flag.** `cosign verify` has no `--bundle`; that flag belongs to `cosign verify-blob`. The invalid flag was removed, and the surrounding text now accurately describes verification of an image's registry-attached bundle.
10. **The custom trust material was incomplete for normal Cosign verification.** A private root used for identity-based image verification also needs the artifact transparency-log key and any TSA trust required by its bundle, not only Fulcio and CT material. The post now states this requirement.
11. **The TrustedRoot guidance conflated the RFC 6962 Log ID with static-checkpoint identity.** Current `cosign trusted-root create` changes an `origin`-bearing CT entry to use the signed-note checkpoint key ID, while SCT verification looks up the 32-byte RFC 6962 Log ID. The post now requires retaining the ordinary entry for SCT verification, explains the additional origin-derived entry needed by current v0.1 tooling for checkpoints, and notes the separate `checkpointKeyId` field in TrustedRoot v0.2.
12. **The rotation heading covered a key-only rotation, but its steps froze an old shard.** It is now scoped to creating a new shard with a new key, which matches the procedure that follows.

## Review Notes
- The review checked Fulcio `main` at commit `ae51cd5b978de4389588cbb20cb08845e4e8b98c` on 2026-08-27 and also compared the latest tagged Fulcio release, v1.8.8. The source-level backend claim is accurate at that point in time, but the post correctly advises pinning a release because older setup documentation lists fewer embedded-SCT backends.
- `pkcs11ca` embeds `BaseCA`, but it can be instantiated only in a CGO-enabled Fulcio build; the non-CGO constructor returns an error.
- Fulcio Compose pins Tesseract v0.1.1 even though v0.1.2 is available. The post deliberately scopes startup-only root loading to v0.1.1 and tells operators to audit version-specific storage and root-source behavior when upgrading.
- Tesseract POSIX v0.1.1's file-key loader expects an unencrypted SEC1 EC private key. Production HSM or remote-signing integration therefore requires a deployment implementation that explicitly supports it; the generic key-protection recommendation is not a claim that this lab binary has native HSM support.
- Tesseract's built-in witness collection is experimental and fail-open in the reviewed implementation. Independent monitoring and reviewed checkpoint distribution/witnessing remain necessary.
- The OpenSSL public-key pipeline and poison-extension display were exercised locally with OpenSSL 3.6.2. OpenSSL output remains an inspection aid, not a cryptographic SCT verification substitute.
- All external links in the post resolved to the intended official or authoritative resources during the review.
