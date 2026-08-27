# Validation Summary: How to Use a PKCS#11 HSM as Fulcio’s Certificate-Signing Backend

## Status

validated

## Post Type

Technical tutorial and production deployment guide

## Technologies Covered

- Fulcio v1.8.8 and the `pkcs11ca`, `kmsca`, and `fileca` backends
- Sigstore and Cosign private trust configuration
- PKCS#11, HSMs, and the crypto11 Go library
- SoftHSM2 and OpenSC `pkcs11-tool`
- CGO and Go builds
- X.509 certificate profiles and private PKI
- Certificate Transparency, precertificates, and embedded SCTs
- OpenSSL certificate inspection and path verification

## Sources Consulted

- [Fulcio v1.8.8 release](https://github.com/sigstore/fulcio/releases/tag/v1.8.8)
- [Fulcio v1.8.8 Go module and toolchain declaration](https://github.com/sigstore/fulcio/blob/v1.8.8/go.mod)
- [Fulcio v1.8.8 PKCS#11 backend](https://github.com/sigstore/fulcio/blob/v1.8.8/pkg/ca/pkcs11ca/pkcs11ca.go) and [no-CGO stub](https://github.com/sigstore/fulcio/blob/v1.8.8/pkg/ca/pkcs11ca/pkcs11canocgo.go)
- [Fulcio v1.8.8 server flags and backend construction](https://github.com/sigstore/fulcio/blob/v1.8.8/cmd/app/serve.go), [PKCS#11 root creation command](https://github.com/sigstore/fulcio/blob/v1.8.8/cmd/app/createca.go), and [no-CGO createca placeholder](https://github.com/sigstore/fulcio/blob/v1.8.8/cmd/app/createcanocgo.go)
- [Fulcio BaseCA precertificate/final-certificate implementation](https://github.com/sigstore/fulcio/blob/v1.8.8/pkg/ca/baseca/baseca.go) and [gRPC issuance flow](https://github.com/sigstore/fulcio/blob/v1.8.8/pkg/server/grpc_server.go)
- [Fulcio certificate construction and chain validation](https://github.com/sigstore/fulcio/blob/v1.8.8/pkg/ca/common.go), including the [KMS backend](https://github.com/sigstore/fulcio/blob/v1.8.8/pkg/ca/kmsca/kmsca.go) and [file backend loader](https://github.com/sigstore/fulcio/blob/v1.8.8/pkg/ca/fileca/load.go)
- [Fulcio HSM support guide](https://github.com/sigstore/fulcio/blob/main/docs/hsm-support.md) and [signing-backend setup guide](https://github.com/sigstore/fulcio/blob/main/docs/setup.md#pkcs11-hsm)
- [Normative Fulcio certificate profile](https://github.com/sigstore/architecture-docs/blob/main/fulcio-spec.md#7-certificate-profile)
- [RFC 5280: Internet X.509 PKI Certificate and CRL Profile](https://www.rfc-editor.org/rfc/rfc5280) and [RFC 6962: Certificate Transparency](https://www.rfc-editor.org/rfc/rfc6962)
- [OASIS PKCS#11 v3.2 specification](https://docs.oasis-open.org/pkcs11/pkcs11-spec/v3.2/pkcs11-spec-v3.2.pdf)
- [crypto11 configuration and API documentation](https://github.com/eclipse-keypont/crypto11)
- [SoftHSM2 configuration and token initialization](https://github.com/softhsm/SoftHSMv2/blob/develop/README.md) and [OpenSC pkcs11-tool manual](https://manpages.debian.org/testing/opensc/pkcs11-tool.1.en.html)
- [OpenSSL verify documentation](https://docs.openssl.org/3.6/man1/openssl-verify/) and [Sigstore custom component/trusted-root configuration](https://docs.sigstore.dev/cosign/system_config/custom_components/)

## Issues Found

- The post described `pkcs11ca` as effectively direct-root/root-only. The implementation loads exactly one issuer certificate but does not require that certificate to be self-signed. A matching intermediate can mechanically issue leaves when its root is distributed separately and the CT log accepts the path, although Fulcio cannot load or return a complete signer-to-root chain and does not validate the signer/certificate relationship at startup. The introduction, KMS comparison, acceptance criteria, and conclusion were corrected to distinguish the single-certificate limitation from a root-only requirement.
- The build example used only `fulcio serve --help` to inspect PKCS#11 flags. Those flags also appear in a `CGO_ENABLED=0` build, so that check does not distinguish a working CGO build from the no-CGO stub. A `fulcio createca --help` check for `--pkcs11-config-path`, which is present only in the CGO implementation, was added before the server flag check. The exact v1.8.8 CGO build command was also executed successfully.
- The selector discussion could be read as applying equally to `serve` and `createca`. In v1.8.8, `--hsm-key-label` is a server flag; the `createca` helper always searches for `PKCS11CA`. The section was scoped to `fulcio serve`, and the helper's hardcoded label was documented.
- The AWS-HSM certificate-file path bypasses token certificate lookup, but v1.8.8 still rejects `--ca=pkcs11ca` unless `--hsm-caroot-id` is nonempty. The AWS paragraph now documents that the flag remains required even though its value is unused on this branch.
- Embedded-SCT support was described only in terms of current `main`, which made support in the pinned example release unclear. Source inspection confirmed that v1.8.8 also embeds `BaseCA` and takes the two-signature precertificate/final-certificate path when a CT client is configured. The version wording was made explicit.

## Review Notes

- Fulcio v1.8.8 declares Go 1.26.0 in `go.mod`; CI using `GOTOOLCHAIN=local` must provide a compatible toolchain, along with a C compiler for CGO.
- Upstream `docs/setup.md` still says only KMS and file backends support embedded SCTs, but that prose is stale for v1.8.8 and current `main`.
- The `createca` helper still omits a Subject common name, so its output does not meet the normative Fulcio root profile without further ceremony/profile work, as the post warns.
- The PKCS#11 constructor does not call Fulcio's common certificate-chain/key validation routine. It also does not reject a missing certificate returned as `nil` before constructing the backend, which reinforces the post's SPKI/object preflight requirement.
- `openssl verify -purpose any` validates the certificate path but does not enforce the Fulcio Code Signing profile; the post correctly requires separate extension inspection and Cosign verification.
- The original ThalesGroup crypto11 URL redirects to the project's current Eclipse Keypop repository and remains usable.
