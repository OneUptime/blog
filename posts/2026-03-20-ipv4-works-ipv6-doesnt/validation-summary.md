# Validation Summary: How to Troubleshoot IPv4 Works but IPv6 Doesn't

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- IPv4
- Linux networking
- ICMPv6
- DNS and AAAA records
- `curl`
- `iproute2`
- `iptables` / `ip6tables`
- `nginx`
- Apache HTTP Server

## Sources Consulted
- Linux kernel IPv6 documentation: https://www.kernel.org/doc/html/latest/networking/ipv6.html
- Linux kernel IP sysctl documentation (`accept_ra`, `accept_ra_defrtr`): https://www.kernel.org/doc/html/v6.8/networking/ip-sysctl.html
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc4861.html
- RFC 4862, IPv6 Stateless Address Autoconfiguration: https://www.rfc-editor.org/rfc/rfc4862
- RFC 4443, ICMPv6 for IPv6: https://www.rfc-editor.org/rfc/rfc4443
- RFC 3596, DNS Extensions to Support IPv6 (AAAA records): https://www.rfc-editor.org/rfc/rfc3596.html
- Apache HTTP Server core documentation (`NameVirtualHost` deprecated): https://httpd.apache.org/docs/current/en/mod/core.html
- Apache HTTP Server binding documentation (`Listen` syntax, IPv6 brackets): https://httpd.apache.org/docs/current/bind.html
- nginx `listen` directive documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html#listen
- Local CLI help output checked for `ip`, `curl`, `ss`, `ping`/`ping6`, `dig`, `ip6tables`, and `journalctl`
- Live endpoint checks performed for `https://icanhazip.com` and `https://ipv6.google.com`

## Issues Found
- The quick-check script used `https://api4.my-ip.io/ip` and `https://api6.my-ip.io/ip`. During validation both endpoints returned `503 Service Unavailable`, so I replaced them with `https://icanhazip.com`, which returned valid IPv4 and IPv6 responses with `curl -4` and `curl -6`.
- The DHCPv6 check used `systemctl status dhclient`, which is not a reliable or universal indicator of DHCPv6 state and assumes a specific client/service model. I replaced it with a DHCPv6 log check using `journalctl`, which better matches the troubleshooting intent on systemd-based Linux systems.
- The route and first-hop examples implied the router address is always `fe80::1`. I kept the example syntax but added explicit notes that `fe80::1` and `eth0` must be replaced with the actual router and interface learned from the host's IPv6 routing state.
- The Apache configuration check grepped for `NameVirtualHost`, which Apache 2.4 documents as deprecated and without effect. I updated the command to look for IPv6 `Listen` and `<VirtualHost>` syntax instead.
- The application test used `curl -6 -I http://localhost/` with a comment implying it verified any IPv6 listener. I changed it to `http://[::1]/` and clarified that it tests the IPv6 loopback listener specifically.
- The introduction said IPv6 has a "completely separate stack" from IPv4. I tightened that wording to the more precise claim that IPv6 has separate addressing, routing, and neighbor discovery from IPv4.

## Review Notes
- The post is Linux-centric and assumes common Linux tooling such as `ip`, `ss`, `ip6tables`, and `journalctl`.
- Modern Linux systems may use `nftables`, `firewalld`, or `ufw` as the primary firewall interface even when `ip6tables` compatibility commands exist. The diagnostic flow is still valid, but exact firewall inspection commands may differ by distribution.
- `rdisc6` is useful for Router Advertisement inspection but is not installed by default on every distribution, so marking it as optional improves accuracy.
