# Validation Summary: How to Configure Apache HTTP/2 with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Apache HTTP Server
- HTTP/2
- IPv6
- TLS
- `mod_http2`
- `mod_ssl`
- `mod_rewrite`
- `mod_headers`
- `mod_status`
- OpenSSL
- `curl`

## Sources Consulted
- Apache HTTP Server HTTP/2 guide: https://httpd.apache.org/docs/current/howto/http2.html
- Apache `mod_http2` reference: https://httpd.apache.org/docs/current/mod/mod_http2.html
- Apache binding and `Listen` directive documentation: https://httpd.apache.org/docs/current/bind.html
- Apache `mod_ssl` reference: https://httpd.apache.org/docs/2.4/en/mod/mod_ssl.html
- Apache `mod_log_config` reference: https://httpd.apache.org/docs/current/en/mod/mod_log_config.html
- Apache `mod_status` reference: https://httpd.apache.org/docs/current/mod/mod_status.html
- Local `curl --help all` output for `--http2` and `-6`
- Local `openssl s_client -help` output for `-connect` and `-alpn`

## Issues Found
- The `ports.conf` example used overlapping `Listen` directives (`Listen 80` with `Listen [::]:80`, and likewise for 443). Apache documents that overlapping `Listen` directives can prevent the server from starting. I replaced them with `Listen 80` and `Listen 443` and clarified that dual-stack builds include IPv6.
- The HTTPS virtual host enabled `h2c` alongside `h2`. Apache’s HTTP/2 guide uses `Protocols h2 http/1.1` for TLS virtual hosts and reserves `h2c` for cleartext HTTP/2. I removed `h2c` from the TLS example.
- The Let’s Encrypt certificate example used `SSLCertificateChainFile`. Apache `mod_ssl` documents this directive as deprecated since 2.4.8 because intermediate certificates can be loaded from `SSLCertificateFile`. I switched the example to `fullchain.pem` and removed `SSLCertificateChainFile`.
- The post used `RewriteEngine`, `Header`, and `server-status` examples without enabling the corresponding modules. I added `a2enmod rewrite`, `a2enmod headers`, and `a2enmod status`.
- The IPv6-only example declared a `<VirtualHost [2001:db8::1]:443>` without a matching `Listen` directive. I added `Listen [2001:db8::1]:443` so the example actually binds the IPv6 address shown.
- The `mod_http2` tuning block included unsupported or incorrect directives/comments: `H2SessionExtraFiles`, `H2Timeout`, and `H2KeepAliveTimeout` are not documented current `mod_http2` directives, and `H2TLSWarmUpSize` was incorrectly described as HPACK-related. I replaced them with documented directives (`H2MaxSessionStreams`, `H2StreamTimeout`) and corrected the `H2TLSWarmUpSize` description.
- The `openssl s_client` validation example grepped the TLS protocol line instead of the negotiated ALPN result. I changed it to check for `ALPN protocol: h2`, which is the relevant confirmation for HTTP/2 over TLS.
- The access log example used `%{ALPN}e`, which is not a documented `mod_log_config` token or standard `mod_ssl` environment variable. I changed it to `%H` to log the request protocol.
- The `mod_status` section described the output as protocol statistics, but the official docs describe server activity and performance statistics. I corrected the wording to match what `mod_status` actually provides.
- The introduction and TLS comments stated or implied that TLS is universally required for HTTP/2. Apache’s HTTP/2 docs distinguish `h2` (TLS) from `h2c` (cleartext). I narrowed the wording to browser-facing `h2` and TLS virtual hosts.

## Review Notes
- `H2StreamTimeout` is documented as available in Apache HTTP Server 2.4.55 and later.
- Apache still documents HTTP/2 server push, but it is client-dependent; the post now scopes that example to clients that support it.
- I did not run a live `apache2ctl configtest` in this environment because the repository does not include a runnable Apache installation or the referenced certificate files.
