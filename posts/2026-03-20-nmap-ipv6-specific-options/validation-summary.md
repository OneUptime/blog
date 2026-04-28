# Validation Summary: How to Use nmap IPv6 Specific Options

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- nmap (IPv6 scanning, NSE scripts, host discovery, firewall evasion)
- IPv6 (link-local addresses, multicast, zone identifiers)
- ICMPv6, MLD (Multicast Listener Discovery)
- NSE scripts: ipv6-node-info, ipv6-multicast-mld-list, ipv6-ra-flood, dns-brute, http-server-header
- RFC 4620 (IPv6 Node Information Queries)

## Sources Consulted
- nmap NSE script documentation: https://nmap.org/nsedoc/scripts/ipv6-node-info.html
- nmap NSE script documentation: https://nmap.org/nsedoc/scripts/ipv6-multicast-mld-list.html
- nmap NSE script documentation: https://nmap.org/nsedoc/scripts/ipv6-ra-flood.html
- nmap target specification manual: https://nmap.org/book/man-target-specification.html
- nmap firewall/IDS bypass manual: https://nmap.org/book/man-bypass-firewalls-ids.html
- nmap port scanning options: https://nmap.org/book/port-scanning-options.html
- RFC 4620 (IPv6 Node Information Queries)

## Issues Found

1. **Invalid IPv6 range syntax (`2001:db8::1-100`)** — The post used octet-range notation for IPv6 in the `--exclude` example. The official nmap target specification documentation explicitly states "Octet ranges aren't yet supported for IPv6." Replaced with CIDR notation (`2001:db8::/120`) which is the supported way to specify multiple IPv6 targets.

2. **Misleading description for `ipv6-ra-flood`** — The post described this script as testing "for IPv6 Router Advertisement responses." Per nmap's official NSE documentation, this script is a denial-of-service attack tool that floods the link with Router Advertisements with random source MAC addresses and prefixes, and the docs explicitly warn it "is dangerous and is very likely to bring down a server or network appliance." Updated the comment to accurately describe it as a DoS flood and removed the bogus target argument (the script is a prerule script that doesn't take a target host).

3. **Invalid IPv6 literal placeholders** — The post used names like `2001:db8::scanner`, `2001:db8::spoof-src`, `2001:db8::decoy1`, `2001:db8::decoy2`, and `2001:db8::router` as illustrative placeholders. These contain non-hexadecimal characters (`s`, `c`, `n`, `r`, `p`, `o`, `f`, `u`, `y`) and would fail to parse if a reader copy-pasted them. Replaced with valid hex placeholders (`2001:db8::1`, `2001:db8::beef`, `2001:db8::a`, `2001:db8::b`).

## Review Notes

- All other NSE script names (`ipv6-node-info`, `ipv6-multicast-mld-list`, `dns-brute`, `http-server-header`) are confirmed to be real nmap NSE scripts with the documented behavior.
- The `-6`, `-S`, `-e`, `-iL`, `-PE`, `-PS`, `-T2`, `-T4`, `-f`, `--ttl`, `--max-retries`, `--host-timeout`, `--randomize-hosts`, `-D`, `-d`, `-v`, `-vv`, `--packet-trace`, and `--exclude` options are all real and documented.
- The link-local zone identifier syntax (`fe80::1%eth0`) is correct, as are the `ff02::1` (all-nodes) and `ff02::2` (all-routers) multicast addresses.
- The note that "IPv6 fragmentation is performed at source only" is technically accurate per the IPv6 specification (RFC 8200 deprecated intermediate fragmentation).
- The claim that nmap fails or queries DNS when given an IPv6 literal without `-6` is accurate — nmap will treat the address as a hostname and attempt resolution.
- Author/style: technical depth and tone preserved; only factual corrections were applied without restructuring or adding sections.
