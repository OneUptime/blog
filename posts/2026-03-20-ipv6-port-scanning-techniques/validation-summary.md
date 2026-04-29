# Validation Summary: How to Perform IPv6 Port Scanning Techniques

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Nmap
- Masscan
- ZMap / ZMapv6
- TCP port scanning
- UDP port scanning
- Nmap Scripting Engine (NSE)
- Service and OS detection

## Sources Consulted
- Nmap IPv6 Scanning (`-6`): https://nmap.org/book/port-scanning-ipv6.html
- Nmap Port Scanning Techniques: https://nmap.org/book/man-port-scanning-techniques.html
- Nmap Firewall/IDS Evasion and Spoofing: https://nmap.org/book/man-bypass-firewalls-ids.html
- Nmap IPv6 fingerprinting: https://nmap.org/book/osdetect-ipv6-methods.html
- Nmap Version Detection: https://nmap.org/book/vscan.html
- Masscan upstream README: https://github.com/robertdavidgraham/masscan
- ZMapv6 upstream README (archived fork): https://github.com/b10n/zmap
- RFC 3849: IPv6 Address Prefix Reserved for Documentation: https://datatracker.ietf.org/doc/html/rfc3849
- Unicornscan upstream source repository: https://github.com/dneufeld/unicornscan

## Issues Found
- The post used invalid IPv6 examples such as `2001:db8::target`, `2001:db8::decoy1`, and `2001:db8::gateway`. I replaced them with valid addresses from the RFC 3849 documentation prefix so the commands are syntactically correct.
- The line labeled "All 65535 ports" used `-p 0-65535`, which explicitly includes port 0 in Nmap. I updated the description to match Nmap's documented behavior.
- The post presented `--ttl` as if it were an IPv6 hop-limit control. Nmap documents `--ttl` as setting the IPv4 TTL field, so I replaced that example with `--data-length`, which is a valid current Nmap option for altering probe packets.
- The spoofed-source example omitted `-Pn`, even though Nmap documents `-e` and `-Pn` as generally required for source spoofing. I added `-Pn` and replaced the invalid spoofed IPv6 placeholder.
- The `masscan` example incorrectly used `-6`. Upstream Masscan documents IPv6 support without a special IPv6 mode, so I updated the example to a valid IPv6 command.
- The `zmap6` example did not match upstream IPv6 ZMap usage. I replaced it with the documented `zmap`-based ZMapv6 fork syntax using `--ipv6-target-file`, `--ipv6-source-ip`, and `-M ipv6_tcp_synscan`.
- I removed the `unicornscan` example because, while the upstream source contains IPv6-related code paths, I could not verify the exact CLI target syntax used in the post from authoritative upstream documentation.

## Review Notes
- The Nmap examples are now aligned with current official documentation, but features such as decoys, source spoofing, and fragmentation still depend on local privileges, OS behavior, and whether the network permits spoofed or raw packets.
- The ZMap example depends on the archived ZMapv6 fork rather than a simple `zmap6` binary invocation, so that section should be rechecked if the tool recommendations are refreshed later.
