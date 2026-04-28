# Validation Summary: How to Use the ipv6only Parameter in Nginx

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Nginx (listen directive, ipv6only parameter)
- IPv6 / IPv4-mapped IPv6 addresses
- Linux kernel `net.ipv6.bindv6only` sysctl
- `IPV6_V6ONLY` socket option (RFC 3493)
- Dual-stack networking

## Sources Consulted
- Nginx official documentation, ngx_http_core_module `listen` directive: https://nginx.org/en/docs/http/ngx_http_core_module.html#listen
- Nginx CHANGES file (1.3.4 default-on change, 28 Aug 2012): https://nginx.org/en/CHANGES
- RFC 3493 (Basic Socket Interface Extensions for IPv6) - `IPV6_V6ONLY` socket option semantics
- Linux kernel `ip-sysctl.txt` documentation for `bindv6only`: https://www.kernel.org/doc/Documentation/networking/ip-sysctl.txt
- Linux `ipv6(7)` man page describing `IPV6_V6ONLY` and `bindv6only` interaction

## Issues Found

1. **Incorrect claim that `bindv6only=1` overrides nginx's `ipv6only`**
   - The original line `# If bindv6only=1, [::]:80 only accepts IPv6 regardless of ipv6only setting in nginx` was wrong. Nginx always calls `setsockopt(IPV6_V6ONLY)` per socket using the `ipv6only` value (default `1`/`on` since 1.3.4), so it overrides the kernel default in either direction.
   - Replaced with a note clarifying that `bindv6only` only affects sockets that do not explicitly set `IPV6_V6ONLY`, and that nginx always sets it.

2. **Missing default-value information**
   - The post never stated that `ipv6only=on` has been the default since nginx 1.3.4 (Aug 2012), which is foundational context for the rest of the post.
   - Added a sentence to the introduction and updated the in-code comment, the "ipv6only=off" bullet list, the "Common Error" section, and the summary to mention this.

3. **Misleading bullet point: "Behavior depends on system `bindv6only` setting"**
   - When `ipv6only=off` is set explicitly in nginx, `bindv6only` does not affect that socket.
   - Replaced with a correct note that `ipv6only=off` must be explicit since the default is `on`.

4. **"Common Error" example was inaccurate for modern nginx**
   - The original example `listen 80; listen [::]:80;` does NOT cause "Address already in use" on nginx 1.3.4+ because the default `ipv6only=on` already prevents `[::]:80` from binding to the IPv4 wildcard.
   - Reframed the example to clarify that the conflict only occurs in nginx pre-1.3.4 or when `ipv6only=off` is explicitly set with `bindv6only=0`. The corrected example now shows `listen [::]:80 ipv6only=off;` to make the conflict actually occur.

5. **Misleading table row about `bindv6only=1` "forced by OS"**
   - The OS does not force nginx behavior; nginx overrides the kernel default per-socket.
   - Removed the `bindv6only=1 on host` row since it conveyed an incorrect interaction; the remaining rows accurately summarize the recommended values. Also added "(default)" / "(must be explicit)" annotations to the kept rows.

6. **Summary contained the same incorrect claim**
   - The original closing line said `bindv6only` "sets the default behavior when `ipv6only` is not specified," but in modern nginx, `ipv6only` always has a value and nginx always calls `setsockopt(IPV6_V6ONLY)`.
   - Rewrote the summary to state that nginx sets `IPV6_V6ONLY` explicitly per-socket and overrides the kernel default.

## Review Notes

- The `cat /proc/sys/net/ipv6/bindv6only`, `sysctl net.ipv6.bindv6only`, and `sysctl -w` commands are all syntactically correct and standard on Linux.
- Persisting via `echo '...' >> /etc/sysctl.d/60-nginx-ipv6.conf` works (creates file if missing, appends if present); a single `>` would be cleaner for new files but the post's form is acceptable.
- The IPv4-mapped IPv6 representation `::ffff:192.168.1.1` is correctly used as an example of how IPv4 clients appear when `ipv6only=off`.
- The error message format `nginx: [emerg] bind() to [::]:80 failed (98: Address already in use)` matches actual nginx output (errno 98 = EADDRINUSE on Linux).
- The dual-stack recommendation (separate `listen 0.0.0.0:80;` and `listen [::]:80 ipv6only=on;`) aligns with current nginx best practice and is preferred for clean `$remote_addr` values without IPv4-mapped prefixes.
