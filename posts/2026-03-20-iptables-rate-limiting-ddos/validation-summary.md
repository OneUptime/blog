# Validation Summary: How to Set Up Rate Limiting with iptables to Prevent DDoS

## Status
validated

## Post Type
Guide

## Technologies Covered
- `iptables`
- Linux IPv4 packet filtering
- `conntrack`
- `hashlimit`
- `connlimit`
- `recent`
- Linux `sysctl`

## Sources Consulted
- `man iptables` from the installed `iptables v1.8.10 (nf_tables)` userspace tools
- `man iptables-extensions` from the installed `iptables v1.8.10 (nf_tables)` userspace tools
- `man sysctl` from the installed userspace tools
- Netfilter `iptables` man page: https://ipset.netfilter.org/iptables.man.html
- Netfilter `iptables-extensions` man page: https://ipset.netfilter.org/iptables-extensions.man.html
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html

## Issues Found
- The post used the legacy `state` match for new connections. I replaced it with `-m conntrack --ctstate NEW` so the examples use the current connection-tracking match syntax.
- Several comments described `limit` and `hashlimit` as hard per-second or per-minute caps, but the rules used token-bucket bursts. I updated the wording to reflect the actual average-rate-plus-burst behavior.
- The HTTP `hashlimit` example claimed to rate-limit connections, but it did not restrict matching to new connections and did not explicitly drop excess new connections. I added `-m conntrack --ctstate NEW` and a follow-up drop rule so the example enforces the limit as described.
- The `connlimit` examples matched all TCP packets instead of just new handshakes. I added `--syn`, matching the documented usage for limiting new connection attempts once the concurrent connection threshold is exceeded.
- The SYN flood example accepted matching SYN packets directly in `INPUT`, which would bypass later service-specific rules in the same chain. I changed it to a dedicated `SYN_FLOOD` chain that uses `RETURN` below the rate and `DROP` above it.
- The port-scan example used `recent --update` before any rule ever added an address to the list, so the logic could not work as written. I rewrote it as a small tracking chain that first checks whether the source has exceeded the threshold and otherwise records the source IP.
- The combined anti-DDoS script had the same early-`ACCEPT` issue as the SYN example and also used the legacy `state` match. I corrected the chain flow, updated it to `conntrack`, added an explicit drop for excess new SSH connections, and restricted the `connlimit` rules to SYN packets.

## Review Notes
- The post is technically valid after correction, but the `recent` example remains a coarse heuristic for rapid SYN bursts from a source IP rather than a full port-scan detector.
- On many modern Linux distributions, `iptables` is implemented through the `nf_tables` compatibility layer. The reviewed commands remain valid, but operational behavior should still be tested on the target distro.
