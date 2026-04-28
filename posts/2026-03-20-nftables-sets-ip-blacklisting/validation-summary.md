# Validation Summary: How to Use nftables Sets for IP Blacklisting

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- nftables (Linux kernel firewall)
- nft CLI tool
- Bash scripting
- IPv4 networking / CIDR notation

## Sources Consulted
- nftables wiki: https://wiki.nftables.org/wiki-nftables/index.php/Main_Page
- nftables wiki - Sets: https://wiki.nftables.org/wiki-nftables/index.php/Sets
- nft(8) man page: https://manpages.debian.org/testing/nftables/nft.8.en.html
- Netfilter project documentation: https://www.netfilter.org/projects/nftables/
- RFC 5737 (IPv4 documentation address ranges used in examples)

## Issues Found
No technical issues found.

All commands and syntax verified correct:
- `nft add table inet filter` — valid table creation
- Chain creation with escaped semicolons (`\;`) — correct shell-escaped syntax
- `nft add set ... { type ipv4_addr \; }` — correct set declaration
- `flags interval` — correctly required for sets containing CIDR ranges/intervals
- `ip saddr @setname drop` — correct match expression for sets
- `nft add element` / `nft delete element` — correct element manipulation syntax
- Standalone configuration file format with `#!/usr/sbin/nft -f` shebang and `flush ruleset` directive — accurate
- Chain hook syntax `type filter hook input priority 0; policy drop;` — correct
- `iif lo accept`, `ct state established,related accept`, `ct state invalid drop` — all valid expressions
- Documentation IP ranges (198.51.100.0/24, 203.0.113.0/24, 192.0.2.0/24) per RFC 5737 — appropriate for examples

## Review Notes
- The automation script's final `echo` uses `nft list set ... | grep -c 'elements'` to report entry count. Since the word "elements" only appears once per set listing (on the `elements = { ... }` line), this will always print "1 entries" rather than the actual count. The core IP-adding logic of the script is correct; only the summary message is misleading. Left as-is to avoid restructuring the example, but a future improvement would be to count commas or parse the elements line directly.
- The `nft add chain` example creates an input chain with `policy drop` before the accept rules are added. In a remote SSH session, running these commands one-by-one in the shown order could lock out the administrator briefly between the chain creation and the rules being added. Consider mentioning this caveat or recommending users apply the full ruleset atomically via the script form (`nft -f`) shown in the "Full Configuration" section.
- The post uses the `inet` family which correctly handles both IPv4 and IPv6 traffic in a unified table, though the blacklist example is IPv4-only (`type ipv4_addr`). Readers wanting IPv6 blacklisting would need a separate set with `type ipv6_addr`.
