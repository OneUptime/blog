# Validation Summary: How to Set Up NAT Masquerading on a Linux Gateway

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Linux networking (IP forwarding via `net.ipv4.ip_forward`)
- iptables (NAT POSTROUTING with MASQUERADE target, FORWARD chain rules, conntrack state matching)
- nftables (inet filter and nat tables, masquerade statement)
- dnsmasq (DHCP/DNS for LAN clients, DHCP options 3 and 6)
- conntrack-tools (`conntrack -L`)
- iproute2 (`ip addr`, `ip route`)
- systemd / cron (`@reboot` startup)

## Sources Consulted
- iptables-extensions(8) man page — MASQUERADE target and `-m state` matching
- netfilter.org documentation: https://www.netfilter.org/documentation/HOWTO/NAT-HOWTO.html
- nftables wiki: https://wiki.nftables.org/wiki-nftables/index.php/Performing_Network_Address_Translation_(NAT)
- nftables wiki on standard priorities: filter forward = 0, nat postrouting = 100 (srcnat)
- dnsmasq man page (dnsmasq.conf options): https://thekelleys.org.uk/dnsmasq/docs/dnsmasq-man.html
- RFC 2132 (DHCP Options) — option 3 (Router) and option 6 (Domain Name Server)
- Linux kernel networking docs: `Documentation/networking/ip-sysctl.rst` (`net.ipv4.ip_forward`)
- iproute2 documentation for `ip addr`, `ip route`

## Issues Found
No technical issues found.

All commands, syntax, and explanations were verified:
- iptables MASQUERADE on POSTROUTING with `-o eth1` is the canonical pattern.
- The state-match rule (`-m state --state RELATED,ESTABLISHED`) is correct; `conntrack` (`-m conntrack --ctstate ...`) would be the more modern alternative but the legacy state match still works on current iptables.
- nftables syntax is correct: `type nat hook postrouting priority 100;` corresponds to the `srcnat` standard priority, and `type filter hook forward priority 0;` matches the standard `filter` priority.
- dnsmasq `dhcp-option=3,...` (Router) and `dhcp-option=6,...` (DNS server) match RFC 2132.
- `dhcp-range=192.168.1.100,192.168.1.200,24h` is valid dnsmasq syntax.
- `/etc/crontab` line `@reboot root /etc/network/nat-gateway.sh` is valid (system crontab requires the user field, which is included).

## Review Notes
- `-m state` is technically a legacy module that has been superseded by `-m conntrack --ctstate`. Both still work and produce identical results in current iptables, so the post is not incorrect; future revisions could mention `conntrack` as the preferred form.
- `/etc/rc.local` is deprecated on modern systemd-based distributions; the post correctly mentions systemd as the alternative.
- The nftables example uses `policy drop` on the forward chain, which is stricter than the iptables example (which leaves FORWARD policy as ACCEPT). This is a deliberate hardening choice and is fine, but worth noting that the two examples are not strictly equivalent in default-deny posture.
- The post overwrites `/etc/resolv.conf` directly on the client; on systems running `systemd-resolved` or `resolvconf`, that file may be a symlink and the change can be reverted on reboot. This is a minor caveat, not a technical error.
