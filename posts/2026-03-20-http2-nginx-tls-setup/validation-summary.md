# Validation Summary: How to Set Up HTTP/2 on Nginx with TLS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Nginx
- HTTP/2
- TLS/HTTPS
- OpenSSL
- curl

## Sources Consulted
- Nginx `ngx_http_v2_module` documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Nginx `ngx_http_ssl_module` documentation: https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- Nginx 1.25.1 release announcement: https://mailman.nginx.org/pipermail/nginx-announce/2023/BYSVLPUZESCZHJMTDD25QD7ZKZYADAR2.html
- curl man page: https://curl.se/docs/manpage.html
- RFC 9113 (HTTP/2): https://www.rfc-editor.org/rfc/rfc9113.html

## Issues Found
- The introduction described server push as a core performance benefit. I removed that claim because current Nginx removed HTTP/2 server push support in 1.25.1, so keeping it in an Nginx setup guide was outdated and misleading.
- The prerequisites omitted the OpenSSL ALPN requirement for HTTP/2 over TLS. I added OpenSSL 1.0.2 or later because Nginx documents ALPN support as necessary for accepting HTTP/2 over TLS connections.
- The setup guidance mixed the new and old enablement styles. I corrected the wording to reflect that `http2 on;` is the current standalone directive in Nginx 1.25.1+, and clarified that older versions need `http2` on each TLS `listen` directive.
- The OCSP stapling example was incomplete. I added `resolver`, `resolver_timeout`, and `ssl_trusted_certificate` because Nginx documents those as required or recommended for OCSP stapling and stapling verification to work correctly.
- The TLS explanation overstated the requirement by implying HTTP/2 itself mandates TLS everywhere. I corrected the language to scope the TLS requirement to HTTP/2 over TLS and to align the cipher guidance with RFC 9113.
- The `http2_chunk_size` comment said the default was `16k`. I corrected it to `8k`, which matches the current Nginx documentation.
- The verification section said to look for `HTTP/2 200`, which is not guaranteed if the origin returns a different status. I changed it to look for an `HTTP/2` status line such as `HTTP/2 200`.

## Review Notes
- The `ssl_trusted_certificate` path in the example uses the common Debian/Ubuntu CA bundle path `/etc/ssl/certs/ca-certificates.crt`; other distributions may use a different CA bundle location.
- `curl --http2` is a valid verification command, but it requires a libcurl build with HTTP/2 support.
- Nginx still supports HTTP/2, but the old `listen ... http2` parameter is deprecated as of Nginx 1.25.1.
