# Validation Summary: How to Set Up Nginx with Brotli Compression on Ubuntu

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Nginx (web server)
- Brotli compression algorithm
- ngx_brotli module (Google)
- Ubuntu (apt package manager)
- nginx-extras package and libnginx-mod-http-brotli-filter / libnginx-mod-http-brotli-static
- gzip (for fallback compression)
- curl (for verification)
- HTTP/2, TLS, Let's Encrypt

## Sources Consulted
- Official ngx_brotli repository and README: https://github.com/google/ngx_brotli
- Ubuntu package catalog: https://packages.ubuntu.com/search?keywords=libnginx-mod-http-brotli
- Nginx official documentation: https://nginx.org/en/docs/
- Brotli CLI tool man page (`brotli(1)`)
- gzip(1) man page

## Issues Found
- **Deprecated directive `brotli_buffers 16 8k;`**: Removed this line from the Configuring Brotli Compression example. According to the official ngx_brotli README, `brotli_buffers` is "Deprecated, ignored" — it has no functional effect in current versions, and including it with a comment claiming it controls buffer size was misleading. The remaining directives (brotli, brotli_static, brotli_comp_level, brotli_min_length, brotli_window, brotli_types) remain active and correctly documented.

## Review Notes
- The `listen 443 ssl http2;` syntax used in the server block examples is deprecated in Nginx 1.25.1+ in favor of the dedicated `http2 on;` directive, but the old syntax still works for backward compatibility, so no change was made.
- The Ubuntu packages `libnginx-mod-http-brotli-filter` and `libnginx-mod-http-brotli-static` are confirmed available starting in Ubuntu 24.04 (Noble). Older Ubuntu releases (e.g., 22.04 Jammy) do not ship these dedicated module packages, but `nginx-extras` is the documented fallback in the post, which is correct.
- The `ngx_brotli` repository at `github.com/google/ngx_brotli` is the canonical/official source and is correctly referenced.
- The `brotli_window 512k` value matches the module's default and is the maximum useful window size for typical web content.
- The compression level guidance (level 4–6 for dynamic, 11 for static pre-compression) aligns with common Brotli tuning practice.
- The `brotli --quality=11 --force` and `gzip --best --keep --force` commands are all valid per their respective man pages.
- The example NGINX_VERSION=1.26.0 is a real, released Nginx version (stable branch).
