# Validation Summary: How to Perform IPv6 Network Enumeration

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- DNS and `dig`
- Nmap
- `scan6` from the SI6 Networks IPv6 Toolkit
- Whois, IRR, and RIR registry data
- NDP and ICMPv6
- `iproute2`
- `ping`
- `traceroute`
- `mtr`
- `tcpdump`
- Python 3 `xml.etree.ElementTree`

## Sources Consulted
- RFC 4291, IP Version 6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291
- Nmap NSEDoc, `dns-brute`: https://nmap.org/nsedoc/scripts/dns-brute.html
- Nmap NSEDoc, `targets-ipv6-multicast-mld`: https://nmap.org/nsedoc/scripts/targets-ipv6-multicast-mld.html
- Nmap Reference Guide, Target Specification: https://nmap.org/book/man-target-specification.html
- Nmap Network Scanning, IPv6 fingerprinting: https://nmap.org/book/osdetect-ipv6-methods.html
- Debian man page for `scan6`: https://manpages.debian.org/testing/ipv6toolkit/scan6.1.en.html
- ARIN, Using Whois: https://www.arin.net/resources/registry/whois/
- ARIN, Searching Whois Using a CLI: https://www.arin.net/resources/registry/whois/rws/cli/
- BIND 9 man pages (`dig`): https://bind9.readthedocs.io/en/v9.18.33/manpages.html
- Debian man page for `ping6` / `ping`: https://manpages.debian.org/testing/iputils-ping/ping6.8.en.html
- Linux `traceroute(8)` man page: https://man7.org/linux/man-pages/man8/traceroute.8.html
- Debian man page for `mtr(8)`: https://manpages.debian.org/testing/mtr/mtr.8.en.html
- RIPE Database docs, query types for `route`/`route6` origin lookups: https://docs.db.ripe.net/Tables-of-Query-Types-Supported-by-the-RIPE-Database/

## Issues Found
- The RADB `whois` example was described as checking a BGP routing table, but the command actually queries IRR `route6` objects by origin AS. I corrected the wording to match what the command really does.
- The ARIN example used `whois -h whois.arin.net example.com | grep IPv6`, which does not match ARIN's documented CLI query syntax. I replaced it with a documented organization search example.
- The `dns-brute` example used `nmap -6`, which unnecessarily tied a DNS brute-force example to IPv6 target resolution. I changed it to the documented `nmap --script dns-brute example.com` form.
- The `scan6` remote-scan example used undocumented or incorrect flags (`--tgt-ipv4-mapped` and `--tgt-word`). I replaced it with a documented `--tgt-low-byte` pattern scan.
- The active host discovery example referenced `discovered-prefixes.txt`, but the command probes explicit targets rather than prefixes in the general sense used in the text. I changed it to `ipv6-hosts.txt` to match the workflow described later in the post.
- The NDP section referred to IPv6 "broadcast". IPv6 does not use broadcast; `ff02::1` is the all-nodes multicast address. I corrected the wording and updated the command to `ping -6`.
- Several commands used `2001:db8::target` as if it were a valid IPv6 literal. It is not syntactically valid. I replaced those placeholders with the documentation-safe address `2001:db8::10`.
- The full service-scan example expanded the host file with shell substitution instead of using Nmap's documented host-list input. I changed it to `-iL ipv6-hosts.txt`.
- The XML parsing example selected the first `<address>` element rather than explicitly selecting the IPv6 address. I updated it to select `address[@addrtype='ipv6']`.
- The passive `tcpdump` pipeline originally watched all IPv6 traffic, which would mix transport ports into the extracted endpoint fields for TCP/UDP traffic. I narrowed the filter to `icmp6` so the extracted fields remain IPv6 addresses.
- The first NDP cache comment said it would dump the cache, but the command only lists `REACHABLE` entries. I adjusted the comment to describe the actual behavior.

## Review Notes
- The commands are technically correct after the fixes, but several tools (`nmap`, `scan6`, `traceroute`, `mtr`) are not installed by default on many systems and may require elevated privileges.
- The RADB/IRR lookup is useful for prefix discovery, but IRR data is not the same as live BGP announcements. If the post later needs a live-routing example, a BGP data source such as RIPE RIS or a similar routing dataset would be a better fit.
- DNS brute force, zone transfer attempts, multicast discovery, and service enumeration should remain limited to authorized assessments as the post already states.
