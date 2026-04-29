# Validation Summary: How to Log IPv6 Firewall Events with nftables

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- nftables
- IPv6 firewalling
- ICMPv6 / Neighbor Discovery
- NFLOG
- ulogd2
- systemd-journald / journalctl
- rsyslog

## Sources Consulted
- nftables man page: https://netfilter.org/projects/nftables/manpage.html
- nftables wiki — Logging traffic: https://wiki.nftables.org/wiki-nftables/index.php/Logging_traffic
- nftables wiki — Matching packet headers: https://wiki.nftables.org/wiki-nftables/index.php/Matching_packet_headers
- nftables wiki — Meters / dynamic set rate limiting: https://wiki.nftables.org/wiki-nftables/index.php/Meters
- systemd `journalctl` manual: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- rsyslog filters documentation: https://www.rsyslog.com/doc/configuration/filters.html
- rsyslog `omfwd` module documentation: https://www.rsyslog.com/doc/modules/omfwd.html
- rsyslog `omfile` module documentation: https://www.rsyslog.com/doc/reference/parameters/omfile-file.html
- RFC 4861 — Neighbor Discovery for IP version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc4861.html
- IANA IPv6 Special-Purpose Address Space registry: https://www.iana.org/assignments/iana-ipv6-special-registry/iana-ipv6-special-registry.xhtml
- ulogd2 sample configuration and JSON plugin updates: https://git.netfilter.org/ulogd2/tree/ulogd.conf.in?h=ulogd-2.0.8 and https://git.netfilter.org/ulogd2/commit/?id=e0ae1870e5b15138c12071d9d96522a2720bf44a

## Issues Found
1. **Basic `nft add rule` example had the terminal action before `log`.**
   - Before: `nft add rule ip6 filter input drop log prefix "IPv6-DROP: "`
   - After: `nft add rule ip6 filter input log prefix "IPv6-DROP: " drop`
   - Why: In nftables, logging must appear before the terminating verdict in the rule. The "correct order" block also lacked the `drop` verdict and was updated to match the explanation.

2. **Overview overstated JSON support for packet logging.**
   - Before: The post said nftables logging "supports JSON format output."
   - After: The post now distinguishes between `nft -j` ruleset export and JSON packet logs produced by an NFLOG consumer such as ulogd2.
   - Why: nftables itself can emit rulesets as JSON, but packet logs are not directly emitted as JSON by the `log` statement.

3. **Routing-header example used the wrong match for the stated goal.**
   - Before: `ip6 nexthdr 43 log prefix "IPv6-RH-HDR: " level crit drop`
   - After: `rt type 0 log prefix "IPv6-RH0: " level crit drop`
   - Why: `ip6 nexthdr 43` only checks the immediate next-header value and does not specifically mean Routing Header Type 0. The revised rule matches the deprecated RH0 explicitly using the IPv6 routing-header expression.

4. **ICMPv6 rules were more brittle than necessary and the Neighbor Discovery allow-rule was too restrictive.**
   - Before: Several rules used `ip6 nexthdr icmpv6 ...`, and ND accepts were limited to `ip6 saddr fe80::/10`.
   - After: The rules use `icmpv6 type ...`, and the general ND allow-rule no longer hard-codes a link-local source restriction.
   - Why: The nftables docs recommend matching `icmpv6 type` directly instead of relying on `ip6 nexthdr`, and RFC 4861 allows valid ND traffic with source-address patterns beyond `fe80::/10` for all message types.

5. **Rate-limited logging examples were inconsistent with the text and current nftables guidance.**
   - Before: Method 1 described "log+drop" but omitted `drop`. Method 2 used an older meter-style example.
   - After: Method 1 now ends with `drop`, and Method 2 uses a dynamic set with `update @log_limit { ip6 saddr limit rate 1/second }`.
   - Why: The first snippet did not actually perform the stated terminal action, and current nftables guidance favors dynamic sets for this style of per-source rate limiting.

6. **NFLOG / ulogd2 example used an outdated or incorrect stack and a broken JSON viewing pipeline.**
   - Before: The sample stack ended with `of1:OFILE`, and the post suggested `tail -f /var/log/ulogd.json | python3 -m json.tool`.
   - After: The stack now uses the JSON plugin directly with a file target in `[json1]`, and the viewing example was simplified to `tail -f /var/log/ulogd.json`.
   - Why: Current ulogd2 JSON examples configure the output file in the JSON plugin block, and `python3 -m json.tool` is not a practical fit for a never-ending `tail -f` stream.

7. **Sample JSON packet log contained an invalid IPv6 destination address.**
   - Before: `"orig.ip6.daddr": "2001:db8:server::1"`
   - After: `"orig.ip6.daddr": "2001:db8:1::1"`
   - Why: `server` is not valid hexadecimal content in an IPv6 address.

8. **rsyslog forwarding example used legacy action syntax.**
   - Before: `@@siem.internal:514` and `:omfile:/var/log/ipv6-fw.log`
   - After: `action(type="omfwd" ...)` and `action(type="omfile" ...)`
   - Why: The original lines are legacy syntax. The updated form matches current rsyslog documentation for new configurations while preserving the same behavior.

## Review Notes
- The "special-use sources" example includes `fc00::/7`, which is valid only as an Internet-edge filtering policy choice, not as a universal "bogon" rule for every interface. The post was adjusted to make that scope explicit.
- The ICMPv6 allow-list remains an example, not a complete IPv6 policy. Depending on host/router role, additional ICMPv6 types such as MLD-related traffic may also need to be allowed.
- Local verification confirmed that `journalctl` currently supports `-g/--grep`. Direct `nft -c` runtime checks were not possible in this environment because Netlink access is restricted for the session, so nft syntax was validated against the official man page and wiki documentation instead.
