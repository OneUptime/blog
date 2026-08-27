# Validation Summary: How to Troubleshoot Fulcio Proof-of-Possession Failures and CSR Key Mismatches

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- Fulcio v2 and Sigstore
- Cosign keyless signing and verification
- OpenID Connect (OIDC) identity tokens and JWT claims
- PKCS #10 certificate signing requests and X.509 certificates
- Proof of possession, SPKI key comparison, and certificate transparency
- ECDSA, RSA PKCS #1 v1.5, Ed25519, and SHA-2 hash algorithms
- Protocol Buffers, ProtoJSON, gRPC-Gateway, and protobuf `oneof` fields
- OpenSSL, Bash, curl, jq, base64, and od

## Sources Consulted

- [Fulcio v2 protobuf API at the reviewed commit](https://github.com/sigstore/fulcio/blob/ae51cd5b978de4389588cbb20cb08845e4e8b98c/fulcio.proto)
- [Fulcio request processing, proof/CSR verification, algorithm enforcement, and response construction](https://github.com/sigstore/fulcio/blob/ae51cd5b978de4389588cbb20cb08845e4e8b98c/pkg/server/grpc_server.go)
- [Fulcio client error handling and operator logging](https://github.com/sigstore/fulcio/blob/ae51cd5b978de4389588cbb20cb08845e4e8b98c/pkg/server/error.go)
- [Fulcio challenge verification and public-key parsing](https://github.com/sigstore/fulcio/blob/ae51cd5b978de4389588cbb20cb08845e4e8b98c/pkg/challenges/challenges.go)
- [Fulcio issuer configuration, wildcard matching, and advertised challenge claims](https://github.com/sigstore/fulcio/blob/ae51cd5b978de4389588cbb20cb08845e4e8b98c/pkg/config/config.go)
- [Fulcio Chainguard identity mapping](https://github.com/sigstore/fulcio/blob/ae51cd5b978de4389588cbb20cb08845e4e8b98c/pkg/identity/chainguard/principal.go)
- [Fulcio default `--client-signing-algorithms` configuration](https://github.com/sigstore/fulcio/blob/ae51cd5b978de4389588cbb20cb08845e4e8b98c/cmd/app/serve.go)
- [Sigstore v1.10.8 algorithm registry and default verifier mappings](https://github.com/sigstore/sigstore/blob/v1.10.8/pkg/signature/algorithm_registry.go)
- [Sigstore v1.10.8 public-key strength validation](https://github.com/sigstore/sigstore/blob/v1.10.8/pkg/cryptoutils/goodkey/publickey.go)
- [Sigstore v1.10.8 PKCS #10 CSR parser](https://github.com/sigstore/sigstore/blob/v1.10.8/pkg/cryptoutils/certificate.go)
- [Sigstore v1.10.8 OIDC subject/email selection](https://github.com/sigstore/sigstore/blob/v1.10.8/pkg/oauthflow/flow.go)
- [Fulcio v1.7.0 release notes for curve-specific proof hashes](https://github.com/sigstore/fulcio/releases/tag/v1.7.0)
- [Fulcio architecture specification](https://github.com/sigstore/architecture-docs/blob/main/fulcio-spec.md#3-issuance---life-of-a-request)
- [PKCS #10: RFC 2986](https://www.rfc-editor.org/rfc/rfc2986)
- [Protocol Buffers ProtoJSON format](https://protobuf.dev/programming-guides/json/)
- [OpenSSL 3.6 `req` documentation](https://docs.openssl.org/3.6/man1/openssl-req/)
- [OpenSSL 3.6 `dgst` documentation](https://docs.openssl.org/3.6/man1/openssl-dgst/)
- [OpenSSL 3.6 `pkey` documentation](https://docs.openssl.org/3.6/man1/openssl-pkey/)
- [curl `--fail-with-body` documentation](https://curl.se/docs/manpage.html#--fail-with-body)
- [Cosign signature specification](https://github.com/sigstore/cosign/blob/main/specs/SIGNATURE_SPEC.md)
- [OpenID Connect Core ID Token validation](https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation)

## Issues Found

- The Chainguard identity caveat implied that `sub` is used whenever a verified email is unavailable. Current `oauthflow.SubjectFromToken` instead rejects a present email whose `email_verified` claim is false or missing; it falls back to `sub` only when `email` is absent. Clarified all three cases.
- The CSR guidance treated every `openssl req -verify` command failure as proof that Fulcio would reject an invalid self-signature. OpenSSL can also fail before cryptographic verification because of local input, algorithm, or provider support. Narrowed the claim to the case where OpenSSL parses the CSR and specifically reports an invalid self-signature.

## Review Notes

The post was checked against Fulcio main commit `ae51cd5b978de4389588cbb20cb08845e4e8b98c`, fetched on 2026-08-27, and its Sigstore v1.10.8 dependency. The v2 endpoint paths, request and response field names, protobuf `bytes` encoding, request/response `oneof` behavior, identity-first processing order, exact client error messages, key-strength checks, CSR field handling, proof algorithms, default algorithm allowlist, CA/CT distinction, and Cosign key-continuity explanation were confirmed. The live public Fulcio configuration endpoint returned the documented lower-camel-case fields and the advertised `email`/`sub` challenge values, and all eight links in the post resolved successfully.

The OpenSSL key export, SPKI comparison, proof signing/verification, and CSR creation/verification sequences were exercised with OpenSSL 3.6.2. Valid CSRs were confirmed for P-256/SHA-256, P-384/SHA-384, P-521/SHA-512, RSA-2048/SHA-256, and pure Ed25519. The Bash `base64 | tr -d '\n'` form is portable across GNU and BSD/macOS base64 implementations. `curl --fail-with-body` is current but requires curl 7.76.0 or newer. Fulcio's advertised `challengeClaim` and the verifier's use of `principal.Name` remain release-sensitive, so the post correctly recommends positive integration tests for custom clients and overrides.
