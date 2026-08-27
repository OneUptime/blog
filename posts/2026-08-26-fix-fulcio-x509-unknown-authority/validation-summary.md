# Validation Summary: Fix Fulcio `x509: Certificate Signed by Unknown Authority`

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- Sigstore and Fulcio
- Cosign v3
- The Update Framework (TUF)
- X.509 certificate paths and OpenSSL
- TLS and private PKI
- OpenID Connect (OIDC)
- Certificate Transparency, Rekor, and RFC 3161 timestamps
- Sigstore `Bundle` and `TrustedRoot` formats

## Sources Consulted

- [Sigstore public and staging deployment documentation](https://docs.sigstore.dev/cosign/system_config/public_deployment/)
- [Sigstore custom-component and trusted-root documentation](https://docs.sigstore.dev/cosign/system_config/custom_components/)
- [Cosign v3.1.3 `initialize` command documentation](https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_initialize.md) and [cache initialization source](https://github.com/sigstore/cosign/blob/v3.1.3/cmd/cosign/cli/initialize/init.go)
- [Cosign v3.1.3 image verification documentation](https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_verify.md) and [blob verification documentation](https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_verify-blob.md)
- [Cosign v3.1.3 certificate-option source](https://github.com/sigstore/cosign/blob/v3.1.3/cmd/cosign/cli/options/certificate.go), [Fulcio-option source](https://github.com/sigstore/cosign/blob/v3.1.3/cmd/cosign/cli/options/fulcio.go), and [environment-variable source](https://github.com/sigstore/cosign/blob/v3.1.3/pkg/cosign/env/env.go)
- [Cosign v3.1.3 trusted-root creation source](https://github.com/sigstore/cosign/blob/v3.1.3/cmd/cosign/cli/trustedroot/trustedroot.go)
- [Fulcio public-instance trust guidance](https://github.com/sigstore/fulcio#public-instance)
- [Fulcio v1.8.8 API schema](https://github.com/sigstore/fulcio/blob/v1.8.8/fulcio.proto)
- [Fulcio v1.8.8 CA-chain validation](https://github.com/sigstore/fulcio/blob/v1.8.8/pkg/ca/common.go), [base CA publication behavior](https://github.com/sigstore/fulcio/blob/v1.8.8/pkg/ca/baseca/baseca.go), and [CA setup guidance](https://github.com/sigstore/fulcio/blob/v1.8.8/docs/setup.md)
- [Fulcio certificate specification](https://github.com/sigstore/fulcio/blob/main/docs/certificate-specification.md)
- [Fulcio private OIDC CA configuration source](https://github.com/sigstore/fulcio/blob/main/pkg/config/config.go)
- [Sigstore client verification specification](https://github.com/sigstore/architecture-docs/blob/main/client-spec.md#43-certificate)
- [Sigstore bundle schema](https://github.com/sigstore/protobuf-specs/blob/main/protos/sigstore_bundle.proto) and [trusted-root schema](https://github.com/sigstore/protobuf-specs/blob/main/protos/sigstore_trustroot.proto)
- [OpenSSL 3.6 `s_client` documentation](https://docs.openssl.org/3.6/man1/openssl-s_client/), [`verify` documentation](https://docs.openssl.org/3.6/man1/openssl-verify/), and [verification options](https://docs.openssl.org/3.6/man1/openssl-verification-options/)
- [RFC 5280: Internet X.509 PKI Certificate and CRL Profile](https://www.rfc-editor.org/rfc/rfc5280.html)

## Issues Found

- The `openssl s_client` probe set SNI with `-servername` but did not verify the certificate's hostname. Added `-verify_hostname fulcio.example.com`, because SNI selection and peer-name authorization are separate operations.
- The TLS-chain wording could imply that a server should send its root. Clarified that the server supplies its leaf and required intermediates while the trust anchor comes from the client's trust store.
- The warning named Cosign's deprecated `--insecure-skip-verify` option as though it bypassed TLS. In Cosign v3.1.3 that option is SCT-related and no longer performs the described check. Replaced it with current verification-bypass flags: `--allow-insecure-registry`, `--insecure-ignore-sct`, and `--insecure-ignore-tlog`.
- The post implied that a Sigstore bundle necessarily supplies the CA chain. Current public bundles normally supply the leaf, while CA roots and intermediates come from an authenticated signing response or `TrustedRoot`/TUF material. Corrected the extraction guidance.
- Issuer-DN/Subject-DN equality was presented as though it established a certificate path. Clarified X.509 name matching and that signature and constraint validation are still required.
- The cache-isolation text claimed per-environment directories also prevent all concurrent rewrites. They prevent cross-domain collisions, but jobs sharing one environment directory can still race because `cosign initialize` removes and rebuilds the cache. Added per-job-cache or serialization guidance.
- The public-instance checklist implied an official endpoint-certificate fingerprint pin and tied Fulcio certificate validation to wall-clock time. Changed it to compare signing-CA fingerprints with TUF-authenticated production material and limited wall-clock guidance to live TLS and TUF metadata. Archived Fulcio chains are normally evaluated at authenticated signing time.
- The Cosign v3 image command incorrectly passed `--bundle` to `cosign verify`; that command has no such flag. Removed it and documented that image verification reads OCI-attached material, while detached blob bundles use `cosign verify-blob --bundle`.
- The OpenSSL path test used `-CAfile`, which can leave default CA directories and stores available and could therefore succeed through an unintended anchor. Replaced it with `-trusted` so only the explicitly supplied Fulcio root is trusted.
- The OpenSSL example omitted the time semantics of Fulcio's short-lived certificates. Added `-attime` guidance for archived leaves using only a cryptographically authenticated Rekor integrated time or RFC 3161 timestamp.
- The post treated an intermediate-only `kmsca`/`fileca` chain as unconditionally invalid. Current Fulcio can accept the only certificate as its trust anchor, which truncates the published chain and changes the trust boundary. Corrected the chain-order guidance and scoped the root/intermediate roles to the intended hierarchy.
- The Fulcio startup-check description applied the Code Signing EKU and key-strength checks too broadly. Clarified that the active intermediate needs the EKU, the active CA must be `CA:TRUE` and match the signing key, and key-strength validation applies to the signing key.
- The final OIDC link resolved but did not document the `ca-cert` YAML field. Replaced it with Fulcio's current configuration source, which defines and uses that field.

## Review Notes

- Reviewed against Cosign v3.1.3, Fulcio v1.8.8/current main, and OpenSSL 3.6.2 as available on 2026-08-27.
- Confirmed that `cosign initialize`, `--staging`, `--root`, `--mirror`, `--trusted-root`, and the documented TUF/Sigstore environment variables are current. Source confirms that initialization clears the selected cache.
- Confirmed the production/staging endpoints, separate trust roots, Fulcio response order (leaf first), and trust-bundle order (intermediates first, root last for a complete configured chain).
- Current Cosign emits the `TrustedRoot` v0.1 media type; the post correctly treats this as version-sensitive.
- `openssl verify -purpose any` is intentionally a path-construction check. Fulcio separately enforces its Code Signing CA profile and signing-key requirements.
- All eight original external links returned HTTP 200; one was replaced because its content did not substantiate the associated `ca-cert` claim.
- No technical issues remain after the corrections above.
