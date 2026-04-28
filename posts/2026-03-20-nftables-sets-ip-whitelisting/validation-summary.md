# Validation Summary: How to Use nftables Sets for IP Whitelisting

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- nftables (named sets, anonymous sets)
- Linux netfilter framework
- IPv4 addressing and CIDR subnets
- nft CLI

## Sources Consulted
- nftables wiki: https://wiki.nftables.org/wiki-nftables/index.php/Sets
- nftables wiki — Quick reference: https://wiki.nftables.org/wiki-nftables/index.php/Quick_reference-nftables_in_10_minutes
- nft(8) man page: https://www.netfilter.org/projects/nftables/manpage.html
- netfilter.org official documentation: https://www.netfilter.org/projects/nftables/

## Issues Found
- **"Sets with CIDR Subnets" introductory sentence**: The text incorrectly stated "declare it as a `prefix` type". nftables does not have a `prefix` type; CIDR/subnet matching is enabled via the `interval` flag on a regular `ipv4_addr` (or `ipv6_addr`) type set, which the code example itself uses correctly. Updated the sentence to "declare it with the `interval` flag" so prose matches the code and matches official documentation.

## Review Notes
- All `nft` CLI invocations (add set / add element / add rule / delete element / list set) are syntactically correct, including the shell-escaped `\;` separators inside braces, which are required when typing nested statements on the command line.
- The full ruleset script using the `inet filter` family with hooks at `priority 0` and `policy drop` is valid nftables syntax.
- Anonymous-set syntax (`ip saddr { ... }`) and named-set reference syntax (`@setname`) are both correct.
- The claim that the `interval` flag is what enables CIDR/range matching is accurate.
- Note for future readers: with `priority 0` the post is using a numeric priority that still works, but modern nftables also accepts the named priority `filter` which is equivalent. Either form is valid; no change needed.
