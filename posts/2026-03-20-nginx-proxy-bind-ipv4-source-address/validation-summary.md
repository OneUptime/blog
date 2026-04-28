# Validation Summary: How to Set proxy_bind to a Specific IPv4 Source Address in Nginx

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Nginx (`ngx_http_proxy_module`, `ngx_stream_proxy_module`)
- `proxy_bind` directive (HTTP and Stream contexts)
- IP transparency / `IP_TRANSPARENT` socket option
- Linux iptables (mangle table)
- Linux policy routing (`ip rule`, `ip route`)
- `ss` socket statistics utility

## Sources Consulted
- Nginx official `ngx_http_proxy_module` docs: https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_bind
- Nginx official `ngx_stream_proxy_module` docs: https://nginx.org/en/docs/stream/ngx_stream_proxy_module.html#proxy_bind
- F5/Nginx blog on IP Transparency / Direct Server Return: https://www.f5.com/company/blog/nginx/ip-transparency-direct-server-return-nginx-plus-transparent-proxy
- Linux kernel TPROXY documentation: https://www.kernel.org/doc/Documentation/networking/tproxy.txt

## Issues Found

1. **Incorrect iptables rule for `proxy_bind ... transparent` setup.** The original post used a TPROXY target on PREROUTING with `--dport 80`, which is the configuration for transparent inbound interception (i.e., redirecting traffic destined elsewhere into a local proxy that listens via `IP_TRANSPARENT`). However, `proxy_bind $remote_addr transparent` is about outbound spoofing of the client IP — the kernel routing problem to solve is delivering return packets from the upstream (which carry the client's IP as destination) back to Nginx via loopback. The correct rule per Nginx's official IP-transparency guide marks return traffic by upstream **source port** and uses the `MARK` target, not `TPROXY` on `--dport`. I replaced the iptables command with:
   ```
   iptables -t mangle -A PREROUTING -p tcp --sport 80 -j MARK --set-xmark 0x1/0xffffffff
   ```
   and updated the surrounding comment to describe what the rule actually does.

2. **Removed unnecessary `ip_nonlocal_bind` sysctl step.** The post enabled `net.ipv4.ip_nonlocal_bind`, but the `transparent` parameter relies on the `IP_TRANSPARENT` socket option (set by Nginx itself), which already permits binding to non-local addresses. The sysctl is unrelated to this code path and was removed to avoid confusion.

The `ip rule` / `ip route` commands were already correct (they are the standard policy-routing setup needed in both scenarios) and were retained.

## Review Notes

- The note that `transparent` requires Nginx workers to run as root is mostly accurate, but technically since Nginx 1.13.8 the master process passes `CAP_NET_RAW` to workers on Linux, so superuser is not strictly required if the capability is in place. The post's wording is acceptable as a conservative recommendation.
- All other directives, contexts, and syntax (basic `proxy_bind`, multi-homed location-based binding, use with named upstream blocks, the stream-module example, `proxy_http_version 1.1`/`Connection ""` for keepalive, and the `ss -tn sport = :8080` verification command) were verified against the official Nginx documentation and are correct.
- `proxy_bind` is available in `ngx_http_proxy_module` since 0.8.22 and in `ngx_stream_proxy_module` since 1.9.2. The `transparent` parameter was added in 1.11.0 in both modules.
