# Validation Summary: How to Fix SSL Handshake Failure Errors

## Status
validated

## Post Type
Guide

## Technologies Covered
- SSL/TLS
- OpenSSL
- HTTPS
- Nginx
- Apache HTTP Server
- curl
- Java JSSE
- Node.js
- Python `ssl`
- Nmap

## Sources Consulted
- OpenSSL `s_client`: https://docs.openssl.org/3.4/man1/openssl-s_client/
- OpenSSL `x509`: https://docs.openssl.org/3.3/man1/openssl-x509/
- OpenSSL `pkey`: https://docs.openssl.org/3.1/man1/openssl-pkey/
- OpenSSL `dgst`: https://docs.openssl.org/3.4/man1/openssl-dgst/
- curl man page: https://curl.se/docs/manpage.html
- nginx `ngx_http_ssl_module`: https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- nginx `server_names`: https://nginx.org/en/docs/http/server_names.html
- Apache `mod_ssl`: https://httpd.apache.org/docs/2.4/en/mod/mod_ssl.html
- Node.js CLI docs: https://nodejs.org/api/cli.html
- Node.js TLS docs: https://nodejs.org/api/tls.html
- Oracle JSSE Reference Guide: https://docs.oracle.com/javase/8/docs/technotes/guides/security/jsse/JSSERefGuide.html
- Python `ssl` module docs: https://docs.python.org/3/library/ssl.html
- Nmap `ssl-enum-ciphers`: https://nmap.org/nsedoc/scripts/ssl-enum-ciphers.html
- RFC 8446: https://www.rfc-editor.org/rfc/rfc8446.html

## Issues Found
- The curl example claimed to force a specific TLS version, but `--tlsv1.2 --tls-max 1.3` allows both TLS 1.2 and 1.3. I changed it to `--tlsv1.2 --tls-max 1.2` so it actually pins TLS 1.2.
- The cipher-suite troubleshooting command implied it would show all common ciphers, but `openssl s_client -cipher ALL` only attempts a handshake and `-cipher` applies to TLS 1.2 and below. I changed this to show the negotiated cipher, added explicit TLS 1.2 and TLS 1.3 test commands, and noted that nginx configures TLS 1.3 ciphersuites separately.
- The certificate/key mismatch check used RSA-only modulus comparisons and `openssl md5`, which is outdated and does not work for non-RSA keys. I replaced it with public-key comparison using `openssl x509`, `openssl pkey`, and `openssl dgst -sha256`, plus a structural private-key check.
- The Nginx SNI example referred to certificate `CN/SAN` matching. I narrowed this to certificate SANs, which are the correct modern hostname source for validation.
- The Java section said clients older than Java 11 may fail with TLS 1.3. Oracle JSSE documentation shows TLS 1.3 is available in JDK 8u261 and later, so I changed this to the accurate runtime-capability statement.
- The Node.js debugging example used `NODE_DEBUG=tls`, which is valid but less precise than the current documented TLS tracing flag. I updated it to `node --trace-tls`.
- The Java debugging example used an ambiguous launcher form. I changed it to a runnable JAR example for clarity.
- The Python debugging example was incorrect: referencing `ssl.SSLContext.set_alpn_protocols` does not enable TLS debug logging. I replaced it with a documented `SSLContext.keylog_filename` example for TLS debugging.
- The alert-code table had inaccurate meanings for `certificate_unknown` and `bad_certificate`, and an overly narrow explanation for `ssl_error_rx_record_too_long`. I corrected those entries to match RFC 8446 and common browser behavior.
- The conclusion still referenced modulus comparison after the fix. I updated it to describe public-key comparison instead.

## Review Notes
- The TLS 1.1 probe remains in the post as a diagnostic example, but many modern OpenSSL builds and server configs disable TLS 1.1 entirely.
- In nginx, `ssl_protocols` has SNI/default-server caveats during virtual server selection. The post’s protocol examples are still valid, but multi-vhost deployments should keep that behavior in mind.
