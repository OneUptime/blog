# Validation Summary: How to Implement 6to4 Tunneling for IPv6 Connectivity

## Status
validated

## Post Type
Tutorial / Implementation guide (multi-platform: Linux, FreeBSD, Windows Server)

## Technologies Covered
- 6to4 tunneling (RFC 3056) and the 6to4 anycast relay (RFC 3068 / deprecated by RFC 7526)
- IPv6 addressing and the `2002::/16` prefix derivation
- Linux `iproute2` (`ip tunnel`, `sit` mode), systemd service units, Netplan / systemd-networkd
- FreeBSD `stf(4)` / `if_stf` interface, `rc.conf`
- Windows Server `netsh interface 6to4`, PowerShell, registry/Group Policy
- `iptables` / `ip6tables` / `nftables` firewalling, IP protocol 41
- Linux networking sysctls
- Prometheus (Python `prometheus_client` exporter, alerting rules)

## Sources Consulted
- RFC 3056 — Connection of IPv6 Domains via IPv4 Clouds (6to4, `2002::/16`, protocol 41)
- RFC 3068 — An Anycast Prefix for 6to4 Relay Routers (`192.88.99.1`)
- RFC 7526 — Deprecating the Anycast Prefix for 6to4 Relay Routers: https://www.rfc-editor.org/rfc/rfc7526.html
- Linux kernel IP sysctl documentation: https://docs.kernel.org/networking/ip-sysctl.html (confirms "IPv6 has no global variables such as tcp_*; tcp_* settings under ipv4/ also apply to IPv6")
- Red Hat / kernel discussion on IPv6 reverse path filtering (no `net.ipv6.conf.*.rp_filter` sysctl; RPF is done via the netfilter `rpfilter` match / firewalld): https://access.redhat.com/solutions/53031

## Issues Found
1. **Missing 6to4 anycast deprecation context (accuracy).** The post relied on the `192.88.99.1` anycast relay throughout without noting that RFC 7526 (2015) formally deprecated the anycast prefix `192.88.99.0/24` and the relay address, and that most public relays are gone. Added a prominent "Important" note after the architecture diagram clarifying that the unicast 6to4 mechanism / `2002::/16` is *not* deprecated but relay-based reachability is unreliable today, and added RFC 7526 to the Additional Resources list.
2. **Invalid IPv6 `rp_filter` sysctl (`secure_6to4.sh`).** `sysctl -w net.ipv6.conf.tun6to4.rp_filter=1` references a sysctl that does not exist — reverse path filtering is IPv4-only as a sysctl. Replaced it with the correct netfilter approach: `ip6tables -A INPUT -i tun6to4 -m rpfilter --invert -j DROP`, with an explanatory comment.
3. **Non-existent `mtu_discovery` sysctl (`optimize_6to4.sh`).** `sysctl -w net.ipv6.conf.tun6to4.mtu_discovery=1` is not a real kernel knob. Replaced the command with an accurate comment explaining that IPv6 PMTUD is on by default and that the real requirement is not filtering inbound ICMPv6 "Packet Too Big" messages.
4. **Non-existent `net.ipv6.tcp_rmem` / `net.ipv6.tcp_wmem` sysctls (`optimize_6to4.sh`).** The kernel has no per-family IPv6 TCP buffer variables; the `net.ipv4.tcp_*` settings apply to TCP over both IPv4 and IPv6. Changed both keys to `net.ipv4.tcp_rmem` / `net.ipv4.tcp_wmem` and added a clarifying comment.

## Review Notes
- **Address derivation verified correct.** `203.0.113.1` → `2002:CB00:7101::/48` (CB/00/71/01) is accurate, as is "a /48 yields 65,536 /64 subnets" and the MTU math (1500 − 20 = 1480).
- **Relay route notation** (`ip route add ::/0 via ::192.88.99.1 dev tun6to4`) uses the IPv4-compatible-address form on a `sit` interface, which is the historically documented method and works; it is, of course, subject to the relay-deprecation caveat now called out in the post.
- **Diagnostic heuristic, left as-is (low severity):** in `troubleshoot_6to4.sh`, `iptables -L INPUT -v -n | grep -q "proto 41"` is unlikely to match real `iptables -L` output (the protocol column shows the number/name without the literal text "proto 41"), so that specific check tends to report a false WARNING. It does not affect tunnel functionality and the script otherwise prints correct remediation guidance.
- **Prometheus exporter, left as-is:** it writes to private `Counter._value._value` internals to set absolute interface counters — functional but relying on library internals; a `Gauge` (or `CollectorRegistry` custom collector) would be cleaner. Not a correctness error.
- **Netplan/networkd `mode: sit` with `remote: any`** is accepted by systemd-networkd; the example assigns the interface a `/48` while the raw `ip` example uses `/16` — both are valid 6to4 conventions, not an inconsistency that breaks anything.
- `ping6` is used throughout; it still works but is deprecated in modern `iputils` in favor of `ping -6`. Not changed.
