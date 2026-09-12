# Validation Summary: Fix Trustee KBS Client Trust for Self-Signed TLS Certificates

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered

- Confidential Containers Trustee and Key Broker Service (KBS)
- Attestation Agent and Confidential Data Hub (CDH)
- TLS and X.509 certificate validation
- OpenSSL
- Kubernetes guest configuration and Init-Data
- TOML and Python

## Sources Consulted

- [Trustee self-signed HTTPS guide](https://github.com/confidential-containers/trustee/blob/512fed65642015b849f38fb13bfdec7806639987/kbs/docs/self-signed-https.md)
- [Trustee KBS configuration reference](https://github.com/confidential-containers/trustee/blob/512fed65642015b849f38fb13bfdec7806639987/kbs/docs/config.md)
- [Trustee `kbs-client` source and CLI definitions](https://github.com/confidential-containers/trustee/blob/512fed65642015b849f38fb13bfdec7806639987/tools/kbs-client/src/main.rs)
- [Guest-components Attestation Agent KBS configuration](https://github.com/confidential-containers/guest-components/blob/eae0bf63a3a9db7721f86e0a2b0b9941a7fcba3a/attestation-agent/attestation-agent/src/config/kbs.rs)
- [Guest-components CDH example configuration](https://github.com/confidential-containers/guest-components/blob/eae0bf63a3a9db7721f86e0a2b0b9941a7fcba3a/confidential-data-hub/example.config.toml)
- [OpenSSL 3.5 `s_client` documentation](https://docs.openssl.org/3.5/man1/openssl-s_client/)
- [OpenSSL 3.5 `x509` documentation](https://docs.openssl.org/3.5/man1/openssl-x509/)
- [RFC 6125: Service Identity in TLS](https://www.rfc-editor.org/rfc/rfc6125)

## Issues Found
No technical issues found.

## Review Notes
The Trustee and guest-components examples are intentionally pinned to specific commits. Users should continue to check the help output and configuration schema of their installed versions, as the post recommends.
