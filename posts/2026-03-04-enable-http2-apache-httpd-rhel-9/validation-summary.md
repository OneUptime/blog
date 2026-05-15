# Validation Summary: How to Enable HTTP/2 on Apache httpd in RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Apache HTTP Server httpd 2.4
- Apache mod_http2
- HTTP/2, ALPN, and TLS
- curl
- OpenSSL s_client
- systemd

## Sources Consulted
- Apache HTTP Server HTTP/2 guide: https://httpd.apache.org/docs/2.4/howto/http2.html
- Apache mod_http2 documentation: https://httpd.apache.org/docs/2.4/en/mod/mod_http2.html
- Apache core Protocols directive documentation: https://httpd.apache.org/docs/current/en/mod/core.html#protocols
- Red Hat Enterprise Linux 9 web server documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/deploying_web_servers_and_reverse_proxies/deploying_web_servers_and_reverse_proxies
- Red Hat advisory showing RHEL 9 httpd and mod_http2 packaging: https://access.redhat.com/errata/RHSA-2023:6403
- RFC 9113, HTTP/2: https://www.rfc-editor.org/rfc/rfc9113.html
- curl man page: https://curl.se/docs/manpage.html
- OpenSSL s_client documentation: https://docs.openssl.org/3.4/man1/openssl-s_client/

## Issues Found
- The post described HTTP/1.1 as strictly limited to one request per connection at a time. I changed this to describe the practical browser behavior more accurately, because HTTP/1.1 has pipelining semantics but browsers commonly avoid relying on it.
- The post said HTTP/2 adds server push without caveat. I added that modern browser support is limited, because server push remains a protocol/module feature but is no longer broadly useful for browser performance.
- The post checked `/etc/httpd/conf.modules.d/10-h2.conf` but did not tell readers what to do if the RHEL `mod_http2` package is not installed. I added `sudo dnf install mod_http2`.
- The OpenSSL ALPN verification command omitted SNI. I added `-servername www.example.com` so the command checks the intended TLS virtual host on name-based Apache configurations.

## Review Notes
- Apache's upstream documentation says `mod_http2` can run under prefork with severe restrictions, while RHEL deployments commonly report it as unsupported for practical use. The post's recommendation to use event or worker MPM is appropriate.
- The `Protocols h2 http/1.1` examples are correct for TLS virtual hosts. `h2c` is correctly described as cleartext HTTP/2 and mostly useful outside browser-facing HTTPS traffic.
- The tuning directives listed are valid Apache mod_http2 directives, but most installations should leave them at defaults unless measured workload requirements justify changes.
