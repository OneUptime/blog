# Validation Summary: How to Configure Squid with iptables for Transparent IPv4 Interception

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Squid HTTP proxy
- Squid `http_port`, `acl`, and `http_access` configuration
- iptables NAT `REDIRECT`
- iptables mangle `TPROXY`
- Linux policy routing with `ip rule` and `ip route`
- IPv4 transparent HTTP interception

## Sources Consulted
- Squid `http_port` directive reference: https://www.squid-cache.org/Doc/config/http_port/
- Squid `acl` directive reference: https://www.squid-cache.org/Doc/config/acl/
- Squid `http_access` directive reference: https://www.squid-cache.org/Doc/config/http_access/
- Squid TPROXY v4 feature documentation: https://wiki.squid-cache.org/Features/Tproxy4
- Squid interception proxy FAQ: https://wiki.squid-cache.org/SquidFaq/InterceptionProxy
- Squid local Linux interception example: https://wiki.squid-cache.org/ConfigExamples/Intercept/LinuxLocalhost
- Linux kernel transparent proxy documentation: https://docs.kernel.org/networking/tproxy.html
- iptables extensions manual page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- GitHub author profile: https://github.com/nawazdhandala

## Issues Found
- The REDIRECT Squid listener was bound to `127.0.0.1`, but PREROUTING `REDIRECT` maps packets to the incoming interface address. Changed it to `0.0.0.0:3129 intercept` so the redirected LAN traffic can reach Squid.
- The REDIRECT rules used `-m owner --uid-owner proxy` in `nat` PREROUTING. The iptables owner match is for locally generated packets and is only valid in OUTPUT and POSTROUTING, so the invalid rule was removed.
- The proxy self-bypass rule matched destination `127.0.0.1`, which does not represent LAN clients connecting to the proxy host. Added `PROXY_LAN_IP` and used it as the destination to bypass.
- The REDIRECT option used the noncanonical `--to-port` form. Changed it to the documented `--to-ports` option.
- The TPROXY Squid listener used `tproxy intercept` together. Squid documents `tproxy` as a dedicated mode that cannot be combined with `intercept`, so the listener now uses only `tproxy`.
- The TPROXY comment said it requires `nfqueue`. Replaced that with kernel TPROXY support and routing marks, matching the Squid and Linux kernel documentation.
- The verification note always expected both ports 3128 and 3129 even though the TPROXY snippet only defines 3129. Updated the note to say 3128 appears only if the explicit proxy port is configured.
- The bypass examples appended RETURN rules after interception rules, which would not bypass an earlier terminal REDIRECT rule. Changed them to insert at the start of PREROUTING and clarified that the examples are for REDIRECT.
- The conclusion recommended excluding traffic by proxy process owner, which was tied to the invalid PREROUTING owner rule. Reworded it to exclude traffic to the proxy server itself.

## Review Notes
Squid was not installed in the local environment, so Squid configuration syntax was checked against upstream Squid documentation rather than parsed with `squid -k parse`. Local iptables 1.8.10 help/man output and `iptables-translate` were used to sanity-check the firewall option syntax. TPROXY deployments may need topology-specific routing, reverse-path-filter, SELinux, and bypass rules beyond this short example.
