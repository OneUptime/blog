# Validation Summary: How to Set Up a Full PKI Infrastructure on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenSSL (Certificate Authority, x509, req, genrsa, ca)
- Ubuntu (update-ca-certificates, /usr/local/share/ca-certificates)
- X.509 certificates, CSRs, CRLs
- PKI hierarchy concepts (Root CA, Intermediate CA, end-entity)
- Bash scripting (renewal monitoring)

## Sources Consulted
- OpenSSL `openssl ca` documentation (https://docs.openssl.org/master/man1/openssl-ca/)
- OpenSSL `openssl req` documentation (https://docs.openssl.org/master/man1/openssl-req/)
- OpenSSL `config` documentation for `ca` section options including `copy_extensions` (https://docs.openssl.org/master/man5/config/)
- OpenSSL x509v3 extension config (https://docs.openssl.org/master/man5/x509v3_config/)
- Ubuntu `update-ca-certificates` man page
- RFC 5280 (Internet X.509 Public Key Infrastructure Certificate and CRL Profile) — SAN requirements
- Verified locally against OpenSSL 3.0.13

## Issues Found

1. **Missing `csr` directory in Root CA setup.** The Root CA `mkdir -p /opt/root-ca/{certs,crl,newcerts,private}` did not create a `csr` subdirectory, but a later step (`cp /opt/intermediate-ca/csr/intermediate-ca.csr /opt/root-ca/csr/`) copies the intermediate CSR into that path. Without the directory, the `cp` would fail. Fix: added `csr` to the brace expansion so the directory is created up front.

2. **Server certificate SANs would not appear in the issued certificate.** The intermediate CA `[ CA_default ]` section did not include `copy_extensions = copy`. The post adds `subjectAltName` to the CSR via process substitution, but `openssl ca` does not propagate extensions from the CSR into the issued cert unless `copy_extensions = copy` is set (and the `[ server_cert ]` extension section did not declare a SAN either). Modern TLS clients (Chrome, Firefox, curl, Go, etc.) reject certificates without a matching SAN, so the issued cert would have been unusable for `web.example.com`. Fix: added `copy_extensions = copy` to the intermediate CA's `[ CA_default ]` section so the SAN extension from the CSR is carried through to the signed certificate.

## Review Notes

- The `RANDFILE` directive in both configs is silently ignored by OpenSSL 1.1.1+ and 3.x — harmless but no longer functional.
- The `nsCertType` and `nsComment` X.509v3 extensions (Netscape) are legacy and largely ignored by modern TLS implementations; they remain harmless when included but could be dropped in a future revision.
- The server CSR command passes `-config` twice (once with the on-disk config, once with the process substitution that appends `[SAN]`). The second `-config` overrides the first, which is the intent, but the first is redundant. Functional, so left as-is.
- Using `copy_extensions = copy` is the standard way to make this workflow function, but it does carry the well-known caveat that any extension the requester places in the CSR is copied through. For an internal PKI where the operator controls CSR creation this is acceptable; for a PKI that accepts CSRs from third parties, restricting extensions in `[ server_cert ]` directly is safer.
- Key length of 4096 bits for the Root/Intermediate and 2048 for end-entity certs is a reasonable, conservative choice as of 2026; ECDSA (P-256/P-384) is an increasingly common alternative for end-entity keys but RSA remains broadly compatible.
- 20-year root validity (7300 days) and 10-year intermediate (3650 days) are typical for internal PKI; 375 days for server certs aligns with the CA/Browser Forum's current public-trust maximum, though internal PKIs are not bound by that limit.
