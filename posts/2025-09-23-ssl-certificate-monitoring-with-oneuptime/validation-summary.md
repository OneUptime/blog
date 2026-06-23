# Validation Summary: Monitor SSL Certificate with OneUptime: Never Let a Certificate Expire Again

## Status
validated

## Post Type
Guide / Tutorial (product-focused walkthrough of OneUptime SSL certificate monitoring)

## Technologies Covered
- SSL/TLS certificates
- Certificate chains and Certificate Authorities (CAs)
- OpenSSL CLI (`s_client`, `verify`)
- OneUptime SSL certificate monitoring
- Standard service ports (HTTPS 443, PostgreSQL 5432, SMTPS 465, HTTPS-alt 8443)
- Certificate properties (CN, SAN, issuer, fingerprints, signature algorithm, key size)

## Sources Consulted
- OpenSSL documentation — `openssl s_client` (https://docs.openssl.org/master/man1/openssl-s_client/)
- OpenSSL documentation — `openssl verify` (https://docs.openssl.org/master/man1/openssl-verify/)
- IANA Service Name and Transport Protocol Port Number Registry (https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml) — confirms 443 (https), 5432 (postgresql), 465 (submissions/SMTPS), 8443 (HTTPS alt)
- RFC 5280 (Internet X.509 PKI Certificate and CRL Profile) — certificate fields (Subject, Issuer, SAN, validity, self-signed where issuer == subject)
- RFC 8446 (TLS 1.3) — TLS handshake behavior

## Issues Found
No technical issues found.

The following claims were verified as accurate:
- `openssl s_client -connect domain.com:443` — correct syntax for inspecting a server's SSL certificate.
- `openssl verify -verbose certificate.crt` — correct syntax for verifying a certificate against the trust store.
- Standard ports cited (443 HTTPS, 5432 PostgreSQL, 465 SMTPS, 8443 HTTPS-alt) are all correct per IANA.
- Self-signed detection described as "cert issuer equals subject" — accurate per RFC 5280.
- Certificate property descriptions (CN, SAN, issuer, valid from/to, fingerprints, signature algorithm, key size) are accurate; SHA-1 correctly framed as a legacy fingerprint and SHA-256 as the modern one.
- Troubleshooting causes/solutions (incomplete chain / missing intermediates causing trust failures, load-balancer certificate mismatch, DNS round-robin) are technically sound.

## Review Notes
- The post is primarily a product guide; the "configuration" snippets are illustrative pseudo-config (rendered as `text`/`yaml` blocks describing UI fields and alert conditions) rather than literal machine-parsed config, which is appropriate for the content.
- Minor (non-blocking) nuance: a fingerprint identifies a certificate but is not the same as the certificate's signature; the post keeps these distinct and does not conflate them, so no change is needed.
- No version-specific or deprecation concerns. The OpenSSL commands and TLS concepts remain current.
