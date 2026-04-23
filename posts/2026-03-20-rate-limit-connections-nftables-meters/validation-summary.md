# Validation Summary: How to Rate Limit Connections Per IP with nftables Meters

## Status
validated

## Post Type
Guide

## Technologies Covered
- nftables
- Linux packet filtering / Netfilter
- Connection tracking (`ct state`)
- Shell / CLI firewall configuration

## Sources Consulted
- nftables `nft(8)` man page: https://netfilter.org/projects/nftables/manpage.html
- nftables wiki, Meters: https://wiki.nftables.org/wiki-nftables/index.php/Meters
- nftables wiki, Rate limiting matchings: https://wiki.nftables.org/wiki-nftables/index.php/Rate_limiting_matchings
- Official nftables documentation tree example showing `list meter` usage: https://git.netfilter.org/nftables/tree/doc/statements.txt?id=d8081e6183b219b2b3d1eccea07fc2e870105f08
- Local `nft` CLI help and installed `nft(8)` man page on `nftables v1.0.9`

## Issues Found
- The global SSH example paired `ct state new limit rate ... accept` with an unconditional `tcp dport 22 drop`, which would also drop established SSH traffic unless an earlier established-state rule already existed. I changed the drop rule to `ct state new drop` so the example matches the text.
- The per-IP examples used the `inet` family together with `ip saddr`, which is IPv4-specific. I changed those examples and the full ruleset to the `ip` family so the family and selector usage are technically consistent.
- The text described meters as tracking “individual counters” and as “dynamic maps,” which is imprecise. I corrected the wording to describe meters as attaching rate-limit state to dynamic keys such as source IP addresses.
- The standalone per-IP example said over-limit IPs “are dropped,” but that only happens if a later rule drops them or the chain policy is `drop`. I corrected the comment and explanatory sentence.
- The command `nft list meters inet filter` was not valid syntax for listing meters. I replaced it with `nft list meters` and kept a valid per-meter example with `nft list meter ip filter ssh_limit`.
- The exact minimum version claim for “meter support” was removed because it was not substantiated by the current official documentation consulted during review.

## Review Notes
- The post is now internally consistent and technically correct for IPv4 examples using the `ip` family. Dual-stack deployments would need corresponding IPv6 rules or an `inet` table with separate IPv4 and IPv6 selectors.
- Current nftables documentation also presents dynamic-set-based syntax for per-IP rate limiting. I did not rewrite the article around that form because the post is explicitly about meters and meter syntax remains supported in official nftables documentation.
