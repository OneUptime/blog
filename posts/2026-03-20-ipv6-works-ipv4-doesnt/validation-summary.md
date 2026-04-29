# Validation Summary: How to Troubleshoot IPv6 Connectivity Works But IPv4 Does Not

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4
- IPv6
- Dual-stack Linux networking
- DHCPv4
- IPv6 SLAAC and Router Advertisements
- `iproute2`
- `ping` / `iputils`
- `iptables`
- `traceroute`
- `curl`
- `ifupdown`
- `systemd-networkd`
- DNS troubleshooting with `nslookup`

## Sources Consulted
- `ip-route(8)` Linux man page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- `route(8)` Linux man page: https://man7.org/linux/man-pages/man8/route.8.html
- `ping(8)` / `ping6(8)` Debian man page: https://manpages.debian.org/testing/iputils-ping/ping6.8.en.html
- `traceroute(8)` Linux man page: https://man7.org/linux/man-pages/man8/traceroute.8.html
- `systemd.network(5)` official documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html
- `curl` man page: https://curl.se/docs/manpage.html
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://datatracker.ietf.org/doc/html/rfc4861
- RFC 4862, IPv6 Stateless Address Autoconfiguration: https://datatracker.ietf.org/doc/html/rfc4862
- BIND 9 Administrator Reference Manual (`nslookup` syntax/behavior): https://bind9.readthedocs.io/_/downloads/en/v9_18_0/pdf/
- Local CLI verification with current tools in the review environment: `ping -h`, `curl --help all`, `ip route help`, `nslookup google.com 8.8.8.8`, `nslookup google.com 2001:4860:4860::8888`

## Issues Found
- The IPv4 default-route repair example was broken: it tried to derive a gateway from an already-missing default route. I replaced it with an explicit `ip route replace default via ... dev ...` example.
- The IPv6 gateway ping example was unreliable for common link-local default gateways and used legacy `ping6` form. I updated it to `ping -6` with `%interface` scope so the example works with typical `fe80::/64` next hops.
- The original `&& ... || ...` gateway checks could incorrectly print “No gateway found” when the route existed but the ping failed. I replaced them with explicit `if` blocks.
- The ifupdown persistence example appended a `post-up` line outside an interface stanza and used the legacy `route` command. I replaced it with a valid ifupdown snippet using `ip route replace`.
- The config-file write examples targeted `/etc/...` without using a privilege-safe write pattern. I changed them to `sudo tee ... << 'EOF'` so the commands work as shown.
- The systemd-networkd example did not actually add an IPv4 default gateway. I updated it to include an explicit `Gateway=` entry.
- The ISP troubleshooting section used `traceroute6`, which is legacy compatibility syntax. I updated it to `traceroute -6`, which matches current traceroute documentation.
- The protocol-specific Google HTTP endpoints were replaced with `curl -4` and `curl -6` against `https://www.google.com/`, which is simpler and currently valid while still forcing the desired IP family.
- A few explanatory sentences were overly absolute, especially around “completely separate” protocol behavior and “most common cause”. I softened those claims to technically defensible wording.
- NAT guidance was clarified so MASQUERADE is presented as a router/NAT-gateway check, not something every dual-stack host should configure.

## Review Notes
- `nslookup` is still usable for quick diagnostics, but BIND documentation recommends `dig` for more consistent behavior.
- The `iptables` examples remain valid on systems using the iptables compatibility layer, but some modern Linux distributions primarily manage firewall and NAT rules with `nftables`.
- The persistence examples cover ifupdown and systemd-networkd only. Systems managed by NetworkManager or netplan would need equivalent configuration in those tools.
