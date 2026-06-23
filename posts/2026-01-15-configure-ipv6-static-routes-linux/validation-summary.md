# Validation Summary: How to Configure IPv6 Static Routes on Linux

## Status
validated

## Post Type
Tutorial / Guide (hands-on configuration walkthrough)

## Technologies Covered
- IPv6 networking and routing concepts (GUA, ULA, link-local, default/host routes)
- iproute2 `ip -6 route` / `ip -6 rule` commands
- Netplan (YAML network configuration on Ubuntu)
- systemd-networkd `.network` files
- NetworkManager (`nmcli`)
- Legacy RHEL/CentOS network scripts (`route6-*`)
- sysctl IPv6 tuning (forwarding, security hardening)
- ip6tables, tcpdump, ping6/traceroute6/mtr diagnostics
- Ansible automation

## Sources Consulted
- Netplan reference documentation — https://netplan.io/reference (default routes vs. deprecated gateway4/gateway6)
- Canonical cloud-init issue confirming gateway4/gateway6 deprecation — https://github.com/canonical/cloud-init/issues/4031
- `man systemd.network` (Route section: Destination, Gateway, Metric, Type=blackhole/unreachable/prohibit, PreferredSource, MTUBytes, IPForward/IPv6Forwarding)
- `man ip-route` / iproute2 documentation (`ip -6 route add/replace/del/get`, table/rule syntax, on-link, mtu, proto)
- RFC 8200 (IPv6) and RFC 4861 (Neighbor Discovery) for addressing/routing fundamentals

## Issues Found
- **Deprecated Netplan `gateway4`/`gateway6` keys (fixed).** The "Basic Netplan Configuration" example used `gateway4: 192.168.1.1` and `gateway6: 2001:db8:1::1`. These keys have been deprecated in Netplan since 0.103 and emit warnings ("gateway4 has been deprecated, use default routes instead"). Replaced them with `to: default` entries inside the existing `routes:` block, which is the current recommended approach and is consistent with the post's own "Advanced Netplan Configuration" example that already uses `to: default`. Added a short clarifying comment noting the deprecation. No other content was changed.

## Review Notes
- **`IPForward=ipv6` (systemd-networkd):** Still valid and functional. As of systemd v256, `IPForward=` is deprecated in favor of per-family `IPv4Forwarding=`/`IPv6Forwarding=` keys, but `IPForward=ipv6` continues to work and is correct for the systemd versions most readers run. Left as-is; consider migrating in a future update.
- **`ping6` / `traceroute6`:** These remain available on most distributions but are increasingly superseded by `ping -6` / `ping`/`traceroute -6` from modern iputils/inetutils. The post's usage is still accurate and works today.
- **Crontab path `/var/spool/cron/root`:** This is the Red Hat/CentOS location; on Debian/Ubuntu the path is `/var/spool/cron/crontabs/root`. It is presented as an example, so not a hard error, but `crontab -e` is the portable approach.
- All `ip -6 route`/`ip -6 rule` syntax, systemd-networkd `[Route]` types (blackhole/unreachable/prohibit), `nmcli` route format (`"dest gateway metric"`), legacy `route6-eth0` format, sysctl keys, and security-hardening parameters were verified correct.
- Addressing facts (2000::/3 GUA, fe80::/10 link-local, fc00::/7 ULA, ::/0 default, /128 host) are accurate.
