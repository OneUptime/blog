# Validation Summary: How to Debug Router Advertisement Issues with rdisc6

## Status
validated

## Post Type
Tutorial / Debugging guide

## Technologies Covered
- rdisc6 (from the ndisc6 package)
- IPv6 Router Advertisement (RA) / Router Solicitation (RS)
- ICMPv6 (RFC 4861 - Neighbor Discovery for IPv6)
- SLAAC (Stateless Address Autoconfiguration, RFC 4862)
- RDNSS (Recursive DNS Server option, RFC 8106)
- radvd (Router Advertisement Daemon)
- tcpdump (BPF filters for ICMPv6)
- Linux `ip` command (iproute2) and `ip monitor`
- `sysctl` (`net.ipv6.conf.*.accept_ra`)
- systemd-resolved
- systemd journal / `journalctl`

## Sources Consulted
- ndisc6 project homepage and manpages: https://www.remlab.net/ndisc6/
- Local `apt-cache show ndisc6` (Ubuntu package metadata, ndisc6 1.0.7)
- RFC 4861 (Neighbor Discovery for IPv6) — RA message type 134, all-routers multicast `ff02::2`
- RFC 4862 (IPv6 SLAAC) — Autonomous flag behavior
- RFC 8106 (RDNSS / DNS Search List options in RA)
- RFC 4291 (IPv6 Addressing Architecture) — EUI-64 / U/L bit inversion
- Linux kernel networking documentation: `Documentation/networking/ip-sysctl.rst` (`accept_ra` semantics: 0/1/2)
- iproute2 documentation for `ip -6 route` and `ip monitor`
- radvd manpage and radvd.conf(5) — `debug` directive and `-d` debug level (1-5)
- tcpdump pcap-filter(7) — `ip6[40]` byte-offset filter for ICMPv6 type field

## Issues Found
No technical issues found.

Verified specifics:
- `rdisc6 -r N` (retry count, default 3) and `-w MS` (wait timeout in milliseconds, default 1000) flags match the official ndisc6 manpage.
- All-routers multicast `ff02::2` is correct (RA destination for solicited responses; RS destination is technically `ff02::2` as well).
- ICMPv6 Router Advertisement type code 134 is correct.
- EUI-64 derivation from MAC `00:11:22:33:44:55` to link-local `fe80::211:22ff:fe33:4455` is correct (insert `ff:fe`, flip U/L bit so `00` → `02`).
- Hex/decimal conversions in the example output all check out: 1800 = 0x708, 86400 = 0x15180, 14400 = 0x3840, 64 = 0x40.
- `net.ipv6.conf.<intf>.accept_ra` values (0 = off, 1 = on without forwarding, 2 = on even with forwarding) match the kernel docs.
- `proto ra` is the correct routing-protocol identifier for SLAAC-installed default routes.
- `tcpdump` filter `ip6[40] == 134` correctly targets the ICMPv6 type byte (assuming no IPv6 extension headers, which is the normal case for RAs).
- `radvd -d 5` (debug level 5) and `debug 1;` global directive in radvd.conf are valid.

## Review Notes
- `systemd-resolve --status` was deprecated in favor of `resolvectl status` starting around systemd 239 (2018). On most modern distributions `systemd-resolve` still exists as a compatibility symlink to `resolvectl`, so the example continues to work — but on newer minimal installs only `resolvectl` may be available. Not a correctness issue today, but worth keeping in mind.
- The comment "Try with a longer timeout (default is 1 second)" precedes a `-r 3` example. The default retry count in rdisc6 is already 3, so `-r 3` does not actually change behavior; the timeout change comes from the `-w 5000` example below it. The text is technically correct (the default wait is 1 s) but a reader could find the pairing slightly misleading.
- The `tcpdump` filter `ip6[40] == 134` works only when there are no IPv6 extension headers between the IPv6 and ICMPv6 headers. This is the normal case for RAs, so the filter is fine in practice; just a caveat for unusual setups.
- No version-specific caveats beyond the systemd-resolved note above.
