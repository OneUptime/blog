# Validation Summary: How to Configure NAT on Linux Using nftables

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- nftables (nft CLI)
- Linux netfilter (NAT, MASQUERADE, SNAT, DNAT)
- IPv4 forwarding via sysctl
- conntrack (connection tracking)
- systemd service management (nftables.service)

## Sources Consulted
- nftables wiki — Main page and Quick Reference: https://wiki.nftables.org/wiki-nftables/index.php/Main_Page
- nftables wiki — Performing NAT: https://wiki.nftables.org/wiki-nftables/index.php/Performing_Network_Address_Translation_(NAT)
- nftables wiki — Configuring chains (priorities): https://wiki.nftables.org/wiki-nftables/index.php/Configuring_chains
- nft(8) man page — syntax for `add table/chain/rule`, `masquerade`, `snat to`, `dnat to`, `list ruleset -a`, `delete rule ... handle`
- netfilter source — `NF_IP_PRI_NAT_DST = -100`, `NF_IP_PRI_NAT_SRC = 100`
- Linux kernel 5.2 release notes — addition of NAT support for the `inet` table family
- Debian/RHEL package documentation for `nftables.service` (ExecReload behavior)
- conntrack-tools documentation for `conntrack -L`

## Issues Found
No technical issues found. All commands, syntax, chain priorities, and configuration directives are accurate per current nftables documentation.

## Review Notes
- The post uses `table inet nat` (the unified IPv4/IPv6 family). NAT in the `inet` family was only added in Linux kernel 5.2 (July 2019). The post lists support for "Debian 10+, RHEL 8+", but Debian 10 ships with kernel 4.19 and RHEL 8 with 4.18, where `inet nat` is not supported — those would require `table ip nat` instead. In practice, by 2026 most readers are on Debian 11+ (kernel 5.10) or RHEL 9 (kernel 5.14), where `inet nat` works fine, so this is a minor caveat rather than an error. A future revision could mention this kernel requirement explicitly.
- The chain priority numbers `-100` and `100` are correct (matching `NF_IP_PRI_NAT_DST` and `NF_IP_PRI_NAT_SRC`). nftables also accepts named priorities (`priority dstnat;` / `priority srcnat;`), which can be more readable; either form is valid.
- The forward chain in the complete configuration relies on conntrack establishing the related/established state for return traffic and matches the post-DNAT destination (`ip daddr 192.168.1.10`) — this is the correct order of evaluation, as DNAT happens in prerouting before the forward hook.
- For persistent IP forwarding across reboots, readers should also add `net.ipv4.ip_forward=1` to `/etc/sysctl.conf` or a file under `/etc/sysctl.d/` — `sysctl -w` only sets it for the current boot. The post does not mention this, but it's a common omission rather than a technical error.
