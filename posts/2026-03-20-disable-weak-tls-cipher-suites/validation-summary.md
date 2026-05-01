# Validation Summary: How to Disable Weak TLS Cipher Suites on a Web Server

## Status
validated

## Post Type
Guide / server hardening tutorial

## Technologies Covered
- TLS cipher suites
- TLS 1.2 and TLS 1.3
- Nginx `ngx_http_ssl_module`
- Apache HTTP Server `mod_ssl`
- OpenSSL `s_client` and cipher string syntax
- Nmap `ssl-enum-ciphers`
- testssl.sh
- Mozilla SSL Configuration Generator

## Sources Consulted
- Nginx `ngx_http_ssl_module` documentation: https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- Apache HTTP Server `mod_ssl` documentation: https://httpd.apache.org/docs/2.4/en/mod/mod_ssl.html
- OpenSSL `s_client` documentation: https://docs.openssl.org/3.0/man1/openssl-s_client/
- OpenSSL cipher string documentation: https://docs.openssl.org/3.4/man1/openssl-ciphers/
- Nmap `ssl-enum-ciphers` script documentation: https://nmap.org/nsedoc/scripts/ssl-enum-ciphers.html
- Mozilla SSL Configuration Generator: https://ssl-config.mozilla.org/
- RFC 8446, The Transport Layer Security (TLS) Protocol Version 1.3: https://datatracker.ietf.org/doc/rfc8446/
- RFC 5288, AES Galois Counter Mode (GCM) Cipher Suites for TLS: https://www.rfc-editor.org/rfc/rfc5288
- RFC 7465, Prohibiting RC4 Cipher Suites: https://www.rfc-editor.org/rfc/rfc7465
- Local CLI verification with `openssl s_client -help` and `openssl ciphers -V`

## Issues Found
- The cipher suite component breakdown was written as a generic TLS explanation, but that specific naming breakdown applies to TLS 1.2 and earlier. TLS 1.3 cipher suites are defined differently and do not encode key exchange and certificate authentication in the suite name the same way. Updated the wording in the introduction and component section to scope that explanation correctly.

## Review Notes
- The Nginx and Apache configuration examples are valid for restricting TLS 1.2 suites to AEAD-based ECDHE suites. TLS 1.3 suite handling is different, and the post correctly treats the shown allowlists as TLS 1.2-focused.
- The `openssl s_client` examples use current flags. `-cipher` applies to TLS 1.2 and below, while `-ciphersuites` would be the TLS 1.3-specific option if explicit TLS 1.3 suite testing were needed.
- The `nmap --script ssl-enum-ciphers -p 443` example is valid. Nmap was not installed in the local review environment, so that command was verified against Nmap's official NSE documentation rather than local `--help` output.
