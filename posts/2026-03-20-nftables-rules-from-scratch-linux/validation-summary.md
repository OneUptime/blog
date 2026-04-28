# Validation Summary: How to Write nftables Rules from Scratch on Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- nftables (Linux firewall framework)
- Linux netfilter hooks (input, output, forward, prerouting, postrouting)
- IPv4 packet filtering
- Connection tracking (`ct state`)
- NAT (masquerade, DNAT)
- nftables sets (static and dynamic with timeout)
- systemd (`nftables.service`)
- `sysctl` for `net.ipv4.ip_forward`

## Sources Consulted
- nftables wiki: https://wiki.nftables.org/
- nftables wiki — Performing NAT: https://wiki.nftables.org/wiki-nftables/index.php/Performing_Network_Address_Translation_(NAT)
- nftables wiki — Meters (dynamic sets): https://wiki.nftables.org/wiki-nftables/index.php/Meters
- nftables wiki — Simple ruleset for a server: https://wiki.nftables.org/wiki-nftables/index.php/Simple_ruleset_for_a_server
- nftables wiki — Scripting / atomic reloads
- `nft(8)` man page (META EXPRESSIONS, CHAINS / standard priority table, RULES grammar, SETS specification)

## Issues Found
1. **Incorrect placement of `comment` keyword.** The original line was:
   `sudo nft add rule ip firewall inbound tcp dport 3000 comment "NodeJS app" accept`
   Per the `nft(8)` RULES grammar, `comment` is a trailing rule attribute that must come after all statements/actions. Placing it before `accept` is invalid syntax. Fixed to:
   `sudo nft add rule ip firewall inbound tcp dport 3000 accept comment "NodeJS app"`

2. **Save command does not prepend `flush ruleset`.** The original line was:
   `sudo nft list ruleset > /etc/nftables.conf`
   `nft list ruleset` does not emit `flush ruleset` at the top, so reloading the resulting file with `nft -f` against a system that already has rules produces "File exists" / duplicate-rule errors. The official "Simple ruleset for a server" wiki page begins the file with `flush ruleset`. Fixed to:
   `sudo sh -c '{ echo "flush ruleset"; nft list ruleset; } > /etc/nftables.conf'`

## Review Notes
- `oif "eth0" masquerade` in the postrouting NAT example is technically valid (nft resolves the interface name to its index at rule load time), and the official NAT wiki uses this same form. However, `oifname "eth0"` is more robust for dynamically created interfaces (tun/tap, ppp, etc.) and is the more idiomatic modern form. Left as written because it matches the official wiki example.
- The set declaration uses `flags dynamic, timeout` together with `timeout 1h`. Specifying `timeout 1h` already implies the `timeout` flag, so listing it explicitly is redundant but not incorrect. Most official examples use `flags dynamic` alone in this case. Left as written.
- The chain priorities used in the NAT example (`-100` for prerouting / dstnat, `100` for postrouting / srcnat) are correct for the `ip` family. Note that the bridge family uses different standard priorities (`-300` / `300`) — out of scope for this IPv4-focused post but worth keeping in mind.
- Numeric priorities like `priority 0` are still accepted, but modern nftables (≥ 0.9.0) also supports named priorities such as `priority filter;` — neither was changed since both are valid.
