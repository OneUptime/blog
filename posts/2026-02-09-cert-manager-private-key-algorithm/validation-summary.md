# Validation Summary: How to Configure cert-manager Certificate Private Key Algorithm and Key Size

## Status
validated

## Post Type
Tutorial / Kubernetes configuration guide

## Technologies Covered
- Kubernetes
- cert-manager Certificate resources
- TLS private key algorithms
- RSA, ECDSA, and Ed25519
- OpenSSL
- kubectl and jq

## Sources Consulted
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/
- cert-manager Certificate usage documentation: https://cert-manager.io/docs/usage/certificate/
- cert-manager v1 Go API documentation: https://pkg.go.dev/github.com/cert-manager/cert-manager/pkg/apis/certmanager/v1
- CA/Browser Forum Baseline Requirements for TLS Server Certificates: https://cabforum.org/working-groups/server/baseline-requirements/requirements/
- NIST SP 800-57 Part 1 Rev. 5: https://csrc.nist.gov/pubs/sp/800/57/pt1/r5/final
- OpenSSL genpkey documentation: https://docs.openssl.org/3.0/man1/openssl-genpkey/
- OpenSSL ecparam documentation: https://docs.openssl.org/1.1.1/man1/ecparam/

## Issues Found
- Corrected RSA key size options. cert-manager allows RSA private key sizes of 2048, 4096, and 8192 bits, not 3072 bits.
- Corrected private key encoding default. cert-manager defaults `spec.privateKey.encoding` to `PKCS1`, not `PKCS8`.
- Clarified PKCS1 behavior. In cert-manager, `PKCS1` produces PKCS#1 output for RSA keys, SEC 1 output for ECDSA keys, and is ignored for Ed25519 keys.
- Replaced overly specific performance multipliers with qualitative guidance because the exact speed ratios are implementation- and workload-dependent.
- Corrected Ed25519 compatibility guidance. Publicly trusted TLS server certificates are generally limited to RSA and ECDSA key pairs under current CA/Browser Forum requirements, so Ed25519 is better described as suitable for controlled private PKI environments.
- Added missing `issuerRef` and `dnsNames` fields to abbreviated Certificate examples in the selection matrix and migration examples so the manifests are complete enough to issue certificates.
- Corrected the P-521 comparison and performance wording to reflect that larger ECDSA curves have higher cost.

## Review Notes
The corrected examples use current `cert-manager.io/v1` Certificate fields and valid `privateKey` enum values. The OpenSSL commands were also checked locally with OpenSSL 3.0.13.
