# Validation Summary: How to Understand the IPv6 Loopback Address (::1/128)

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- IPv6 addressing and loopback semantics
- RFC 4291 and IPv6 scoped addressing
- Linux networking tools (`ip`, `ping6`, `ip6tables`)
- Python `socket` and `ipaddress`
- NGINX reverse proxy configuration
- OpenSSH local port forwarding
- Redis networking configuration and `redis-cli`

## Sources Consulted
- RFC 4291, "IP Version 6 Addressing Architecture": https://datatracker.ietf.org/doc/html/rfc4291
- RFC 4007, "IPv6 Scoped Address Architecture": https://datatracker.ietf.org/doc/html/rfc4007
- Python `ipaddress` documentation: https://docs.python.org/3/library/ipaddress.html
- Python `socket` documentation: https://docs.python.org/3/library/socket.html
- NGINX `listen` directive documentation: https://nginx.org/r/listen
- NGINX `proxy_pass` directive documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass
- OpenSSH `ssh(1)` manual: https://man.openbsd.org/ssh.1
- Redis CLI documentation: https://redis.io/docs/latest/develop/tools/cli/
- Redis security documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/
- Redis configuration documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- Local command verification on Linux host: `ip -6 addr show lo`, `ip -6 route get ::1`, `ping -6 -c 1 ::1`, `ssh -G -6 -L '[::1]:8080:[::1]:80' localhost`
- Local Python verification for `ipaddress` loopback behavior and IPv6 socket bind/connect

## Issues Found
- The table described `::1` as not link-local because it has "its own dedicated range." RFC 4291 defines `::1` as a single loopback address that is treated as having Link-Local scope. I updated the table entry to reflect that accurately.
- The command `ip -6 route show ::1` did not reliably demonstrate that `::1` resolves to `lo`; on Linux it can return no output because the local route is in the local table. I replaced it with `ip -6 route get ::1`, which correctly shows resolution to `dev lo`.
- The Python example claimed `ipaddress.ip_address("::ffff:127.0.0.1").is_loopback` is `True`. In Python's standard library, that expression is `False`; IPv4-mapped IPv6 addresses need to be checked via `IPv6Address.ipv4_mapped`. I updated the function so the example output is correct.
- The NGINX example listened on `[::1]:9113` and proxied to `http://[::1]:9113/metrics`, which would proxy back into the same listener. I changed the listener to `[::1]:9114` so the reverse-proxy example is technically valid.

## Review Notes
- Exact `ip` route output can vary slightly by Linux distribution and kernel version, but the corrected `ip -6 route get ::1` form is the right command for demonstrating loopback resolution.
- `ping6` and `ip6tables` remain valid on many Linux systems, though some environments prefer `ping -6` and nftables-based tooling.
- `redis-cli -6` is valid, but for a literal host like `::1` the flag is mostly redundant because it primarily affects DNS lookup preference.
