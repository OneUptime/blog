# Validation Summary: How to Configure Nginx Dual-Stack (IPv4 and IPv6) Listeners

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Nginx (HTTP/HTTPS server, listen directive, ipv6only parameter)
- IPv6 / IPv4 dual-stack networking
- Linux kernel sysctl (`net.ipv6.bindv6only`) and the `IPV6_V6ONLY` socket option
- TLS / HTTPS configuration (ssl_certificate, ssl_protocols, ssl_ciphers)
- HTTP/2 directive
- CLI tools: `ss`, `curl`, `tail`

## Sources Consulted
- Nginx `ngx_http_core_module` documentation (`listen` directive, `ipv6only` parameter, deprecation of `http2` listen parameter): https://nginx.org/en/docs/http/ngx_http_core_module.html
- Nginx `ngx_http_v2_module` documentation (`http2` directive): https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Linux `ipv6(7)` man page (IPV6_V6ONLY semantics): https://www.man7.org/linux/man-pages/man7/ipv6.7.html
- sysctl-explorer for `net.ipv6.bindv6only`: https://sysctl-explorer.net/net/ipv6/bindv6only/
- `curl(1)` man page (`-4`, `-6`, `--interface` flags): https://curl.se/docs/manpage.html

## Issues Found

1. **Incorrect default for `ipv6only`.** The original "Understanding ipv6only Parameter" section claimed that `ipv6only=off (or omitted)` causes `[::]:80` to accept both IPv4 and IPv6, dependent on the kernel default. This is wrong: per the Nginx docs, the `ipv6only` parameter has been **on by default since 0.7.42**. Omitting it gives you IPv6-only behavior, not dual behavior. Rewrote the comment block to state the correct default and clarify that `ipv6only=off` is what enables IPv4-mapped acceptance and what causes the "Address already in use" conflict with `0.0.0.0:80`.

2. **Incorrect claim about kernel `bindv6only` overriding Nginx's setting.** The original "Check the ipv6only Linux Kernel Default" section claimed that with `bindv6only=1`, `[::]:80` only accepts IPv6 *regardless of the `ipv6only` setting*. Per the Linux ipv6(7) man page, `net.ipv6.bindv6only` is only the *default* for sockets that do not explicitly call `setsockopt(IPV6_V6ONLY, ...)`. Since Nginx calls `setsockopt` when `ipv6only=on` or `ipv6only=off` is given, the application setting overrides the kernel default. Rewrote the comments to reflect this.

3. **Deprecated `http2` parameter on `listen` directive.** The "Full Dual-Stack HTTPS Configuration" example used `listen 443 ssl http2;` and `listen [::]:443 ssl http2 ipv6only=on;`. The `http2` parameter on `listen` was deprecated in Nginx 1.25.1 in favor of the standalone `http2` directive. Updated the example to use `listen 443 ssl;` / `listen [::]:443 ssl ipv6only=on;` plus `http2 on;` and added an inline comment noting the deprecation.

## Review Notes

- The "Multiple Virtual Hosts" example correctly notes that `ipv6only` is per-socket and can only be set once for a given listen address/port. This matches the Nginx docs ("It can only be set once on start.").
- The `ss -tlnp | grep nginx` command is fine; on some distros `ss` requires elevated privileges to show the process column (`-p`), but the command itself is correct.
- `curl -4` / `curl -6` and `curl --interface <addr>` are all valid and current per the curl manpage.
- The `ssl_ciphers HIGH:!aNULL:!MD5;` is the OpenSSL "HIGH" alias minus anonymous and MD5 suites — functional, but for a public-facing server a more curated suite list (or simply relying on TLSv1.3 defaults) is generally preferred. Not changed since this matches the cipher string used widely in Nginx defaults and the post is not specifically about cipher hardening.
- Future maintenance: the `ssl_protocols` line lists TLSv1.2 and TLSv1.3, which is current best practice as of 2026.
