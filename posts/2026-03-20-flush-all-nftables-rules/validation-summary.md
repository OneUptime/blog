# Validation Summary: How to Flush All nftables Rules

## Status
validated

## Post Type
Guide

## Technologies Covered
- nftables
- Linux / Netfilter firewall management
- Bash shell scripting

## Sources Consulted
- Official `nft(8)` man page: https://netfilter.org/projects/nftables/manpage.html
- Official nftables wiki, "Configuring chains": https://wiki.nftables.org/wiki-nftables/index.php/Configuring_chains
- Official nftables wiki, "Configuring tables": https://wiki.nftables.org/wiki-nftables/index.php/Configuring_tables
- Official nftables wiki, "Atomic rule replacement": https://wiki.nftables.org/wiki-nftables/index.php/Atomic_rule_replacement

## Issues Found
- The original remote-safety section incorrectly said you must set the input chain policy to `ACCEPT` before `flush ruleset`, and its example used `nft add chain ...` in a way that would fail if the base chain already existed. I corrected this to explain that `flush ruleset` removes hooked base chains and their policies, and I changed the example to an atomic replacement workflow that matches the official nftables guidance.
- The original save command used `sudo nft list ruleset > /etc/nftables.conf`, which would fail on a typical shell because the `>` redirection is performed by the non-root shell. I corrected it to `sudo nft list ruleset | sudo tee /etc/nftables.conf > /dev/null` so the file write actually runs with elevated privileges.

## Review Notes
- The post is technically correct after the fixes above.
- If this post is expanded later, it would be worth noting that `flush table` clears chains and rules but does not flush sets defined in that table.
