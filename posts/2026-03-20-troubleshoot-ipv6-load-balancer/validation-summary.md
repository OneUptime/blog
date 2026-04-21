# Validation Summary: How to Troubleshoot IPv6 Load Balancer Connectivity

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- IPv6
- Linux networking tools: iproute2, ss, ping, nc, tcpdump
- ip6tables, xtables-monitor, and netfilter TRACE
- HAProxy
- IPVS/LVS and ipvsadm
- nginx stub_status
- keepalived VIP ownership

## Sources Consulted
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://datatracker.ietf.org/doc/html/rfc3849
- RFC 3986, URI Generic Syntax: https://www.ietf.org/rfc/rfc3986.html
- curl man page: https://curl.se/docs/manpage.html
- HAProxy Runtime API `show stat`: https://www.haproxy.com/documentation/haproxy-runtime-api/reference/show-stat/
- HAProxy Statistics dashboard documentation: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/alerts-and-monitoring/statistics/
- NGINX `ngx_http_stub_status_module`: https://nginx.org/en/docs/http/ngx_http_stub_status_module.html
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/v6.12/networking/ip-sysctl.html
- iptables extensions manual, including TRACE and MASQUERADE: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- xtables-monitor manual: https://man7.org/linux/man-pages/man8/xtables-monitor.8.html
- ipvsadm manual page: https://manpages.ubuntu.com/manpages/bionic/man8/ipvsadm.8.html
- ss manual page: https://manpages.debian.org/bookworm/iproute2/ss.8.en.html
- ping manual/help output and OpenBSD nc manual: https://manpages.debian.org/testing/iputils-ping/ping.8.en.html, https://man.openbsd.org/nc.1
- Local command help output for `ip`, `ss`, `ip6tables`, `xtables-monitor`, `ping`, `nc`, `sysctl`, and `tcpdump`

## Issues Found
- The post used invalid IPv6 placeholder addresses such as `2001:db8::vip` and `2001:db8::server1`. Replaced them with valid RFC 3849 documentation-prefix literals such as `2001:db8::100` and `2001:db8::101`.
- The HTTP test used an unbracketed IPv6 literal in a URL. Updated it to `https://[2001:db8::100]/health`, which matches RFC 3986 URI syntax, and quoted IPv6 URLs where shell metacharacters could interfere.
- The post used `ping6`. Updated examples to `ping -6`, which is the current portable iputils form.
- The HAProxy stats CSV example used `http://localhost:8404/stats?csv`. Updated it to the quoted `http://localhost:8404/stats;csv` form used with a `stats uri /stats` endpoint.
- The nginx status example used the pre-1.7.5 `stub_status on;` syntax. Updated it to the current `stub_status;` directive.
- The firewall section implied that listing NAT PREROUTING rules traces packets. Updated the comment to describe it as checking NAT counters.
- The TRACE output guidance only used `dmesg`. Added `xtables-monitor --trace` for iptables-nft systems and kept `dmesg` as the legacy backend note.
- The forwarding language implied all IPVS modes require IPv6 forwarding. Narrowed it to NAT or routed IPVS modes.
- The common fix for missing masquerade was too narrow. Updated it to cover either a return route or POSTROUTING SNAT/MASQUERADE, depending on topology.

## Review Notes
- The guide remains Linux-focused and assumes an iptables/ip6tables workflow. On systems managed primarily through nftables or firewalld, the diagnostic concepts are still valid but command syntax may differ.
- `2001:db8::/32` is documentation-only address space and should be replaced with real deployment addresses before running the examples.
