# Validation Summary: How to Set Up NAT with nftables (Masquerade)

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- nftables (Linux packet filtering framework)
- Linux kernel networking (IP forwarding via sysctl)
- Netfilter hooks (postrouting, forward)
- conntrack (connection tracking)
- systemd (nftables service persistence)

## Sources Consulted
- nftables wiki: https://wiki.nftables.org/wiki-nftables/index.php/Main_Page
- nftables wiki - Performing Network Address Translation (NAT): https://wiki.nftables.org/wiki-nftables/index.php/Performing_Network_Address_Translation_(NAT)
- nftables wiki - Configuring chains (priority/hook semantics): https://wiki.nftables.org/wiki-nftables/index.php/Configuring_chains
- nftables wiki - Quick reference / scripting: https://wiki.nftables.org/wiki-nftables/index.php/Quick_reference-nftables_in_10_minutes
- nft(8) man page (Debian/Arch package documentation)
- Linux kernel documentation - `Documentation/networking/ip-sysctl.txt` (`net.ipv4.ip_forward`)
- Netfilter project documentation: https://www.netfilter.org/projects/nftables/

## Issues Found
No technical issues found.

Verified specifics:
- `sysctl -w net.ipv4.ip_forward=1` and persistence in `/etc/sysctl.d/99-forwarding.conf` are correct.
- `nft add table ip nat` correctly uses the `ip` family for IPv4 NAT.
- Postrouting chain at priority `100` (alias `srcnat`) is the conventional and correct priority for SNAT/masquerade.
- The shell-escaped chain creation syntax `nft add chain ip nat postrouting { type nat hook postrouting priority 100 \; }` is correct.
- `oif "eth0" masquerade` is the correct rule expression for masquerading egress traffic.
- Forward chain rules using `iif`/`oif` with `ct state new,established,related accept` (LAN→WAN) and `ct state established,related accept` (WAN→LAN) follow the standard stateful firewall pattern.
- The full configuration file uses valid nftables script syntax including the `#!/usr/sbin/nft -f` shebang, `flush ruleset`, and `policy accept`/`policy drop` declarations.
- Persistence via `nft list ruleset > /etc/nftables.conf` and `systemctl enable nftables` matches the upstream nftables service unit behavior on common distributions.

## Review Notes
- The post uses a separate `ip nat` table for NAT and `inet filter` for filtering. Since Linux kernel 5.2, the `inet` family supports NAT chains too, so users on newer kernels could consolidate everything into a single `inet` table if preferred. The split approach in the post remains correct and is broadly compatible with older kernels.
- The comment "must use priority 100 for NAT" is practically accurate for the standard SNAT/masquerade case (priority `srcnat` = 100). DNAT/redirect at prerouting uses priority `dstnat` = -100. The wording is fine for an intro tutorial.
- `policy accept;` on the nat postrouting chain is redundant (NAT chains accept by default and only `accept` is valid), but it is not incorrect.
- `conntrack -L` requires the `conntrack-tools` package, which is not always installed by default — readers may need to install it separately, but this is a minor packaging note rather than a technical error.
