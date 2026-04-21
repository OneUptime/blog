# Validation Summary: How to Configure TLS 1.3 on Nginx for Secure IPv4 Connections

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- TLS 1.3 and TLS 1.2
- Nginx HTTP SSL module
- OpenSSL
- curl
- SSLyze
- testssl.sh
- SSL Labs

## Sources Consulted
- NGINX ngx_http_ssl_module documentation: https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- OpenSSL ciphers command documentation: https://docs.openssl.org/3.6/man1/openssl-ciphers/
- OpenSSL s_client documentation: https://docs.openssl.org/master/man1/openssl-s_client/
- OpenSSL SSL_CTX_set_cipher_list and SSL_CTX_set_ciphersuites documentation: https://docs.openssl.org/3.5/man3/SSL_CTX_set_cipher_list/
- TLS 1.3 specification, RFC 8446: https://datatracker.ietf.org/doc/html/rfc8446
- curl TLS version documentation: https://everything.curl.dev/usingcurl/tls/versions.html
- SSLyze README and current source package: https://github.com/nabla-c0d3/sslyze
- testssl.sh README: https://github.com/testssl/testssl.sh
- SSL Labs SSL Server Rating Guide: https://github.com/ssllabs/research/wiki/SSL-Server-Rating-Guide

## Issues Found
- The post overstated TLS 1.3 by saying there is "no negotiation needed" and that all key exchanges use ephemeral keys. Updated the wording to reflect AEAD cipher suites, reduced legacy negotiation choices, and the forward secrecy caveat for 0-RTT and PSK-only modes.
- The Nginx support requirement omitted the HTTP SSL module. Added that Nginx must be built with the HTTP SSL module as well as OpenSSL 1.1.1+.
- The command `openssl ciphers -v TLSv1.3` is invalid because `TLSv1.3` is parsed as a cipher string. Replaced it with `openssl ciphers -v -s -tls1_3`.
- The Nginx cipher comments implied `ssl_ciphers` controlled TLS 1.3 suites. Clarified that it applies to TLS 1.2 and older, and that the example uses OpenSSL's default TLS 1.3 ciphersuites.
- The session ticket comment claimed disabling tickets was required for perfect forward secrecy. Reworded it to the narrower ticket-key resumption risk.
- The DH parameters section implied DH parameters were generally needed for TLS 1.2 fallback. Clarified they are only needed if DHE cipher suites are enabled, and that the ECDHE-only list shown does not need the file.
- The verification commands did not force IPv4 despite the post's IPv4 scope. Added `-4` to the OpenSSL and curl examples.
- The expected TLS 1.3 cipher output implied a single guaranteed cipher. Updated it to allow any enabled TLS 1.3 suite.
- The SSLyze command used the removed `--regular` option. Updated it to the current `python3 -m sslyze example.com:443` invocation and used `pip install --upgrade sslyze`.
- The SSL Labs A+ statement incorrectly said TLS 1.3 is required. Updated it to describe A-grade configuration, HSTS, strong key exchange/ciphers, and absence of grade-capping vulnerabilities.

## Review Notes
- `curl --tlsv1.3` sets TLS 1.3 as the minimum version in curl; with current TLS versions this is suitable for the post, but `--tls-max 1.3` could be added if exact protocol pinning is needed later.
- In larger Nginx deployments, `ssl_protocols` can interact with default-server selection, so keeping protocol policy consistent at the `http` or default-server level is preferable.
