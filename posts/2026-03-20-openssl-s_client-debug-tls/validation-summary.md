# Validation Summary: How to Use openssl s_client to Debug TLS Connections

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenSSL (s_client, x509 subcommands)
- TLS 1.0 / 1.1 / 1.2 / 1.3
- X.509 certificates (chain inspection, validity dates, fingerprints)
- SNI (Server Name Indication)
- OCSP stapling
- Cipher suites (e.g., TLS_AES_256_GCM_SHA384, ECDHE-RSA-AES256-GCM-SHA384)
- mTLS (mutual TLS / client certificates)
- STARTTLS (SMTP, IMAP)

## Sources Consulted
- OpenSSL `s_client` man page and `openssl s_client -help` output (OpenSSL 3.0.13)
- OpenSSL `x509` command help output (`openssl x509 -help`)
- OpenSSL official documentation: https://docs.openssl.org/master/man1/openssl-s_client/
- OpenSSL official documentation: https://docs.openssl.org/master/man1/openssl-x509/
- RFC 6066 (TLS Extensions: SNI)
- RFC 6960 (OCSP)
- RFC 8446 (TLS 1.3)

## Issues Found
- **OCSP stapling output examples were inaccurate.** The post showed fabricated output strings like `OCSP Response Data: cert NOT revoked` and a misformatted "no stapling" output. Replaced both examples with the actual format produced by `openssl s_client -status`:
  - With stapling: `OCSP response:` followed by the dashed separator, `OCSP Response Data:` block including `OCSP Response Status: successful (0x0)` and `Cert Status: good`.
  - Without stapling: a single line `OCSP response: no response sent`.

## Review Notes
- All `s_client` flags used (`-connect`, `-showcerts`, `-tls1`, `-tls1_1`, `-tls1_2`, `-tls1_3`, `-servername`, `-cipher`, `-status`, `-cert`, `-key`, `-CAfile`, `-starttls`) are valid in current OpenSSL (verified against OpenSSL 3.0.13).
- `-tls1` and `-tls1_1` flags still exist in OpenSSL 3.x but TLS 1.0/1.1 support is disabled at the security level by default; the post's framing ("should fail on modern servers") accurately reflects this from a server-side perspective.
- The Step 5 cipher example uses `-cipher ECDHE-RSA-AES256-GCM-SHA384` without forcing `-tls1_2`. This still works for setting the TLS ≤1.2 cipher list; for TLS 1.3 cipher selection, `-ciphersuites` would be required, but the post does not claim otherwise.
- `-checkend 0` exit code semantics are correct (0 = valid, 1 = expired/expiring within window).
- The grep pattern `"Protocol  :"` and `"Cipher    :"` in Step 9 correctly matches the spacing of the OpenSSL `SSL-Session:` block output.
- 2,592,000 seconds = 30 days is correct.
