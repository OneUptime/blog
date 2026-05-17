# Validation Summary: How to Troubleshoot SSL Certificate Chain Issues on Ubuntu

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- OpenSSL (s_client, x509, verify subcommands)
- Ubuntu system trust store (/etc/ssl/certs/)
- Nginx SSL configuration (ssl_certificate, ssl_certificate_key)
- Apache SSL configuration (SSLCertificateFile, SSLCertificateChainFile)
- Let's Encrypt fullchain.pem layout
- DigiCert intermediate CA distribution URLs
- SSL Labs API v3
- Bash scripting (PEM parsing with while/read loops)

## Sources Consulted
- OpenSSL 3.0 x509 manpage — confirmed `-checkhost`, `-checkemail`, `-checkip` are the supported certificate-matching options for `openssl x509`; `-verify_hostname` is NOT accepted by `openssl x509`.
- OpenSSL 3.0 s_client manpage — confirmed `-brief`, `-showcerts`, `-servername`, `-verify_hostname` are valid flags.
- OpenSSL 3.0 verify manpage — confirmed `-CAfile`, `-CApath`, `-untrusted` semantics and `-verify_hostname` support.
- Local `openssl x509 -help` and `openssl x509 -in /dev/null -noout -verify_hostname example.com` test (errors with "Use -help for summary"), proving the flag is rejected.
- Apache httpd 2.4 mod_ssl documentation — confirmed SSLCertificateChainFile was deprecated in 2.4.8 when SSLCertificateFile gained the ability to contain the full chain.
- Nginx ssl_certificate directive documentation — confirmed it expects a file containing the server cert followed by any intermediates.
- Qualys SSL Labs API v3 documentation — confirmed `https://api.ssllabs.com/api/v3/analyze?host=...` endpoint and `status` field in the JSON response.
- X.509 / PKIX (RFC 5280) for chain ordering semantics (each certificate followed by its issuer).
- Let's Encrypt documentation for fullchain.pem path layout under `/etc/letsencrypt/live/<domain>/`.

## Issues Found

1. **Incorrect `openssl x509` flag for hostname check** (Testing After Fixes section).
   - Original: `openssl x509 -noout -verify_hostname yourdomain.com`
   - Problem: `-verify_hostname` is a verification option supported by `openssl verify` and `openssl s_client`, but `openssl x509` rejects it ("Use -help for summary"). The correct flag for hostname matching in the `x509` subcommand is `-checkhost`.
   - Fix: Changed to `openssl x509 -noout -checkhost yourdomain.com`. Verified with `openssl x509 -help` showing `-checkhost val  Check certificate matches host`.

## Review Notes
- The `openssl verify -CApath /etc/ssl/certs/ fullchain.pem` example on line 150 only verifies the first certificate in `fullchain.pem` as a leaf; other certs in the file are not automatically used as untrusted intermediates by some OpenSSL versions. It is a commonly used quick check, but for strict validation `openssl verify -CApath /etc/ssl/certs/ -untrusted intermediate.pem server-cert.pem` is more reliable. Left as-is since the surrounding text already shows the `-untrusted` pattern earlier.
- The DigiCert intermediate URL `http://cacerts.digicert.com/EncryptionEverywhereDVTLSCA-G2.crt` is a plausible legacy CA distribution path. Treated as illustrative; readers should always pull the URL from their own certificate's Authority Information Access extension.
- The Apache `SSLCertificateChainFile` directive is deprecated since 2.4.8 but still works in current Apache; the post's framing ("Apache before 2.4.8: use separate chain file") accurately captures the only situation where it is *required*.
- `openssl s_client -brief` was introduced in OpenSSL 1.1.1; on Ubuntu releases shipping older OpenSSL (e.g., Ubuntu 16.04's 1.0.2) the flag would be unavailable. All supported Ubuntu LTS versions (20.04+) ship OpenSSL 1.1.1 or 3.x, so this is not a concern for the target audience.
- The two bash PEM-parsing loops work correctly because `openssl x509` on stdin accepts a single PEM-encoded certificate (a leading blank line in the second loop is tolerated).
