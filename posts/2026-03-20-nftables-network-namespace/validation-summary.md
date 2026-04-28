# Validation Summary: How to Run nftables Rules Inside a Network Namespace

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- nftables (nft CLI)
- Linux network namespaces (`ip netns`)
- iproute2 (`ip link`, `ip addr`)
- veth virtual interfaces
- Linux kernel netfilter framework

## Sources Consulted
- nft(8) man page (verified options `-a`, `-s`, and command syntax)
- ip-netns(8) man page (verified `ip netns add/list/exec` syntax)
- ip-link(8) man page (verified veth pair creation and `ip link set <if> netns <ns>`)
- nftables wiki: https://wiki.nftables.org/wiki-nftables/index.php/Main_Page
- nftables wiki — Network namespaces: https://wiki.nftables.org/wiki-nftables/index.php/Main_differences_with_iptables
- nftables Quick reference: https://wiki.nftables.org/wiki-nftables/index.php/Quick_reference-nftables_in_10_minutes

## Issues Found
- **Incorrect description of `nft -s` flag**: The original post claimed `nft -s list ruleset` "shows statistics", which is the opposite of what `-s` actually does. Per `nft(8)`, `-s, --stateless` *omits* stateful information (including counter values) from rule output. Updated the comment to read "`-s` omits stateful info (counters)".
- **Non-canonical option placement for `-a`**: Changed `nft list ruleset -a` to `nft -a list ruleset` to match the documented synopsis `nft [ -nNscaeSupyjtT ] [...]` where ruleset-list formatting options precede the command. Both forms parse with getopt, but the leading-option form is what the man page documents.

## Review Notes
- The nftables config syntax in the example file (table/chain definitions, `ct state`, `icmp type echo-request`, `ip saddr`, `tcp dport`, `log prefix`) is all valid and current.
- `priority 0` is valid — modern nftables also supports the named priority `filter` (which equals 0). The numeric form used here is fine and works on all supported nftables versions.
- `nft monitor trace` is syntactically correct, but to actually emit trace events the ruleset must contain a rule like `meta nftrace set 1`. The post does not mention this prerequisite, but the command itself is valid.
- The example config does not include `flush ruleset` at the top. Re-applying the file with `nft -f` will append duplicate rules to the existing chain rather than replacing them. This is a usage caveat, not a syntax error, so it was left unchanged per scope.
- The veth pair workflow (`ip link add ... type veth peer name ...`, `ip link set <peer> netns <ns>`, addressing each end, bringing `lo` up inside the namespace) is correct and matches iproute2 documentation.
