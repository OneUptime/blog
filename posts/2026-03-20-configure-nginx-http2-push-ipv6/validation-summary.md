# Validation Summary: How to Configure Nginx HTTP/2 Push with IPv6

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Nginx (HTTP/2 module / `ngx_http_v2_module`)
- HTTP/2 Server Push (`http2_push`, `http2_push_preload`)
- IPv6 socket listeners (`listen [::]:...`, `listen [2001:db8::1]:...`)
- TLS / OpenSSL (`s_client`)
- curl (HTTP/2, IPv6 flags)
- nghttp / nghttp2 client tools (`nghttp`, `h2load`)
- HTTP `Link: rel=preload` headers

## Sources Consulted
- Nginx `ngx_http_v2_module` documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Nginx Trac #2432 (deprecate HTTP/2 Server Push): https://trac.nginx.org/nginx/ticket/2432
- Nginx 1.25.1 changelog / nginx-devel mailing list (HTTP/2 server push removed): https://mailman.nginx.org/pipermail/nginx-devel/2023-June/
- Chrome for Developers, "Removing HTTP/2 Server Push": https://developer.chrome.com/blog/removing-push
- Chrome Status feature 6302414934114304: https://chromestatus.com/feature/6302414934114304
- nghttp2 `h2load(1)` man page: https://nghttp2.org/documentation/h2load.1.html
- OpenSSL `s_client` documentation: https://www.openssl.org/docs/manmaster/man1/s_client.html
- RFC 9113 (HTTP/2) — server push obsolescence guidance

## Issues Found
1. **Missing deprecation notice for the entire feature.** As of Nginx 1.25.1 (June 2023), the `http2_push`, `http2_push_preload`, and `http2_max_concurrent_pushes` directives are obsolete and ignored with warnings. Major browsers (Chrome 106+, late 2022) also stopped honoring server pushes by default. The post taught the feature without warning the reader. **Fix:** Added an "Important" callout near the top noting the deprecation status, the affected Nginx versions/browsers, and pointing to `103 Early Hints` + `Link: rel=preload` as the modern alternative.

2. **Non-existent `$http2_stream_id` variable in `log_format`.** The `ngx_http_v2_module` only exposes a single embedded variable, `$http2`. There is no built-in `$http2_stream_id`. Using it would produce an empty value (or fail config validation depending on Nginx). **Fix:** Replaced `$http2_stream_id` with the real `$request_time` variable, which is more useful for performance monitoring, and added a comment explaining what `$http2` actually contains.

3. **Invalid `--h2` flag for `h2load`.** Per the official `h2load(1)` documentation, h2load has `--h1` and `--h3` shortcuts but no `--h2` flag. HTTP/2 is selected by default via the ALPN list `h2,http/1.1`. To force HTTP/2 explicitly, the correct flag is `--alpn-list=h2`. **Fix:** Replaced `--h2` with `--alpn-list=h2` and added a clarifying comment.

## Review Notes
- The `listen ... ssl http2;` syntax used throughout the post is **deprecated** in Nginx 1.25.1+ in favor of the new `http2 on;` directive (e.g. `listen 443 ssl; http2 on;`). The old syntax still parses with a `[warn]`, so the configs will load on current Nginx but log warnings. Did not rewrite every example because the post is now explicitly framed (via the deprecation callout) as targeting Nginx older than 1.25.1, where the legacy syntax was current. Future updates should switch to `http2 on;` if the post is ever modernized away from server push.
- The IPv6 syntax (`[::]:443`, `[2001:db8::1]:443`, bracketed IPv6 with `openssl s_client -connect`) is correct per OpenSSL and Nginx docs.
- The `Dynamic HTTP/2 Push Based on Request Path` example contains a `map` and `if` block whose body is empty — the example illustrates structure rather than a working push trigger. This is stylistically weak but not technically wrong, so left as-is.
- The `curl --write-out "%{remote_ip}"` and `nghttp -nv` flags are valid.
- `gzip_static on;` requires the `ngx_http_gzip_static_module`, which is not built by default in stock Nginx. Did not flag inline since this is widely known and beyond the post's scope.
