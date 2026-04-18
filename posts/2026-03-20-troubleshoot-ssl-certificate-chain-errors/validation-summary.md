# Validation Summary: How to Troubleshoot SSL Certificate Chain Errors

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- SSL/TLS certificates and PKI concepts
- OpenSSL (`s_client`, `x509`, `verify` commands)
- Nginx TLS configuration (`ssl_certificate`, `ssl_certificate_key`)
- Apache TLS configuration (`SSLCertificateFile`, `SSLCertificateKeyFile`, `SSLCertificateChainFile`)
- Certificate error codes (OpenSSL return codes, Chrome `ERR_CERT_*`, Node.js error codes)
- AIA (Authority Information Access) extension for fetching intermediates
- DER / PEM certificate encoding

## Sources Consulted
- OpenSSL 3.0 `verify(1)` manual — https://docs.openssl.org/3.0/man1/openssl-verify/
- OpenSSL `s_client(1)` manual — https://docs.openssl.org/3.0/man1/openssl-s_client/
- OpenSSL `x509(1)` manual — https://docs.openssl.org/3.0/man1/openssl-x509/
- `openssl verify -help` output from OpenSSL 3.0.13 (local)
- Nginx `ngx_http_ssl_module` docs — https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- Apache `mod_ssl` directives — https://httpd.apache.org/docs/2.4/mod/mod_ssl.html
- RFC 5280 (X.509 PKI) — AIA extension definition
- Chromium net error list (`ERR_CERT_AUTHORITY_INVALID`)

## Issues Found
1. **Step 3 — `openssl verify` command was incorrect.** The original command was:
   ```
   openssl verify -CAfile /etc/ssl/certs/ca-certificates.crt fullchain.pem
   # fullchain.pem: OK
   ```
   Per the OpenSSL `verify(1)` manual, when a file contains multiple certificates, each is verified as an independent leaf against `-CAfile` / `-CApath` / `-untrusted`. Other certificates in the same input file are **not** used as intermediates for chain building. With a typical `fullchain.pem` (server cert + intermediate), the server cert verification would fail with `error 20 at 0 depth lookup: unable to get local issuer certificate` because the intermediate is not in the trust store. Replaced with the documented pattern using `-untrusted` for the intermediate and verifying the leaf explicitly, which is the correct idiom and yields `server.crt: OK`.

## Review Notes
- `SSLCertificateChainFile` (Step 5) is deprecated since Apache httpd 2.4.8 in favor of putting the full chain in `SSLCertificateFile`. It still works, and the post also shows the combined `fullchain.pem` form, so the guidance is not wrong — just slightly dated. Left as-is since the directive remains supported.
- The `openssl s_client` commands in Steps 1, 2, and 7 omit `</dev/null` on stdin, so they will wait for user input after the handshake completes unless Ctrl-C is pressed. Piping to `grep`/`wc` only closes the pipe's write end when s_client exits, so this affects the standalone forms. Not a correctness bug — many tutorials write it this way — but adding `</dev/null` would be more ergonomic.
- The DigiCert AIA URL shown (`http://cacerts.digicert.com/DigiCertTLSRSASHA2562020CA1.crt`) is illustrative; real AIA URLs should always be copied from the actual certificate's `CA Issuers` extension since DigiCert uses several suffix variants (e.g. `-1.crt`).
- Error-code mapping in the table is a mix of OpenSSL verify codes, Node.js/`node-tls` error strings, and Chromium browser errors. All are real and map to the meanings given; labeling the origin of each would help readers but isn't a correctness issue.
