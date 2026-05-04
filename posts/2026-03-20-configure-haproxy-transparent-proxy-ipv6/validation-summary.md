# Validation Summary: How to Configure HAProxy Transparent Proxy with IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HAProxy (load balancer / transparent proxy configuration)
- Linux TPROXY (kernel transparent proxy facility)
- ip6tables (Netfilter for IPv6)
- iproute2 (`ip -6 rule`, `ip -6 route`)
- Linux capabilities (`getcap`, `setcap`, `CAP_NET_ADMIN`)
- PROXY protocol v2 (`send-proxy-v2`)
- IPv6 networking
- `sysctl` (`net.ipv6.conf.all.forwarding`)

## Sources Consulted
- [HAProxy Configuration Manual 2.8](https://docs.haproxy.org/2.8/configuration.html) — verified `source ... usesrc clientip`, `bind ... transparent`, and `send-proxy-v2` directives.
- [Announcing HAProxy 2.5 / nbproc removal](https://www.haproxy.com/blog/announcing-haproxy-2-5) — confirmed `nbproc` was removed in HAProxy 2.5 (June 2021); modern HAProxy uses `nbthread`.
- [pfSense Bug #12992: nbproc not supported since HAProxy 2.5](https://redmine.pfsense.org/issues/12992) — confirmed the deprecation timeline and the error users see.
- [HAProxy GitHub issue #832 (IPv6 source / accept-proxy)](https://github.com/haproxy/haproxy/issues/832) — confirmed the source address family must match the server family for IPv6 backends.
- HAProxy `source` directive documentation — verified `ipv6@::` / `::` notation for IPv6 source binding.
- iptables-extensions(8) man page — verified `TPROXY` target syntax with `--tproxy-mark` and `--on-port`.
- ip-rule(8) and ip-route(8) man pages — verified `ip -6 rule add fwmark ... lookup ...` and `ip -6 route add local default dev lo table ...` syntax used in TPROXY setups.

## Issues Found

1. **`nbproc 1` directive in `global` section.** The post included `nbproc 1` with the comment "Required for transparent proxy capabilities." This is doubly wrong: (a) `nbproc` was deprecated in HAProxy 2.3 and **removed entirely in HAProxy 2.5** (June 2021) — its presence in a modern config will cause HAProxy to fail to start with `nbproc is not supported any more since HAProxy 2.5`; (b) `nbproc` was the legacy multi-process directive and has nothing specifically to do with transparent proxy capabilities. Fixed by removing both the directive and the misleading comment.

2. **`source 0.0.0.0 usesrc clientip` used with IPv6 backend servers.** The "HAProxy Configuration for TPROXY" section used the IPv4 wildcard (`0.0.0.0`) as the source while the backend servers (`[2001:db8::10]:8080`, `[2001:db8::11]:8080`) are IPv6. HAProxy requires the `source` address family to match the destination family, so this would not work as written for IPv6 traffic. Fixed by changing to `source ipv6@:: usesrc clientip`.

3. **Same IPv6 source-family mismatch in "Option 1".** The first illustrative example also showed `source 0.0.0.0 usesrc clientip` as the active line above IPv6 backends, with the IPv6 form only present as a commented-out alternative. Reversed this so the IPv6 form is active (matching the IPv6 backends) and the IPv4 form is shown as a commented alternative; updated the explanatory comments accordingly.

4. **Summary line referenced the now-corrected syntax.** Updated the summary's reference from `source :: usesrc clientip` to `source ipv6@:: usesrc clientip` so it matches the corrected examples and uses the more explicit address-family-prefixed form.

## Review Notes

- The TPROXY routing setup (`ip -6 rule add fwmark 1 lookup 100`, `ip -6 route add local default dev lo table 100`) and the ip6tables PREROUTING rules with `--tproxy-mark 0x1/0x1 --on-port` are correct and reflect the standard Linux TPROXY pattern.
- `bind [::]:3128 transparent` is correct HAProxy syntax for binding to a non-local IPv6 address; this requires kernel TPROXY support and the `CAP_NET_ADMIN` capability, both of which the post correctly mentions.
- The capability example uses `setcap cap_net_admin+ep /usr/sbin/haproxy`. For a strictly TPROXY-only scenario this is sufficient, but in many real deployments HAProxy also benefits from `cap_net_bind_service` (privileged ports) and on some kernels `cap_net_raw`. The post's example uses non-privileged ports (3128/3129) so the narrower capability set is consistent with the example. Worth being aware of if readers extend the example to ports < 1024.
- `send-proxy-v2` (Option 2) is the correct directive name for PROXY protocol v2.
- The post does not pin a specific HAProxy version. The corrected configuration is valid for HAProxy 2.4+ (and especially 2.5+ where `nbproc` was removed). If a future revision wants to be more explicit, mentioning a minimum supported HAProxy version (e.g., 2.6 LTS or 2.8 LTS) would help readers.
- For TCP-mode TPROXY frontends, the `bind ... transparent` keyword is the historical name; modern HAProxy also supports `bind ... tfo`, `bind ... mss`, etc. The keyword `transparent` itself remains valid and is the right choice here.
