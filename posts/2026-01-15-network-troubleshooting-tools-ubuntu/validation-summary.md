# Validation Summary: Essential Network Troubleshooting Tools on Ubuntu

## Status
validated

## Post Type
Tutorial / Reference guide (command cookbook for Ubuntu network diagnostics)

## Technologies Covered
- Ubuntu / Debian package management (`apt`)
- ICMP connectivity tools (`ping`, `arping`)
- IP and link configuration (`ip`, `ifconfig`)
- Routing diagnostics (`traceroute`, `mtr`)
- DNS tools (`dig`, `nslookup`, `host`, `resolvectl`, systemd-resolved)
- Socket/connection analysis (`ss`, `netstat`)
- Port connectivity (`netcat`/`nc`, `telnet`, `curl`)
- Packet capture and traffic analysis (`tcpdump`, `iftop`, `nethogs`)
- Bandwidth/performance testing (`iperf3`, `speedtest-cli`)
- Network scanning (`nmap`)
- Physical-layer diagnostics (`ethtool`, `mii-tool`)
- ARP/neighbor discovery (`ip neigh`, `arp`)

## Sources Consulted
- iputils `ping(8)` man page (flags `-c`, `-i`, `-s`, `-f`, `-D`, `-b`)
- `ip(8)` / `ip-address`, `ip-route`, `ip-neighbour` man pages
- `traceroute(8)` man page (`-I`, `-T`, `-m`, `-n`)
- `mtr(8)` man page (`-r`, `-c`, `-n`, `--tcp`, `-z`)
- BIND 9 `dig(1)` and `host(1)` man pages; `nslookup(1)`
- iproute2 `ss(8)` man page (state filters, `sport`/`dport` syntax, `-m`, `-to`)
- `tcpdump(1)` and pcap-filter(7) man pages
- iperf3 documentation — https://software.es.net/iperf/invoking.html (`-R/--reverse`: server sends, client receives)
- `nmap(1)` reference — https://nmap.org/book/man.html (`-p-`, `-sV`, `-O`, `-sn`, `-F`)
- `ethtool(8)`, `iftop(8)`, `nethogs(8)`, `arping(8)` man pages
- Ubuntu package names verified: `net-tools`, `iputils-ping`, `dnsutils`, `traceroute`, `mtr-tiny`, `tcpdump`, `nmap`, `netcat-openbsd`, `iftop`, `iperf3`, `ethtool`, `nethogs`, `speedtest-cli`
- systemd `resolvectl(1)` / `systemd-resolve` documentation

## Issues Found
- **iperf3 `-R` mislabeled (line ~362):** The comment read "Test upload (reverse)". The `-R`/`--reverse` flag puts iperf3 in reverse mode where the *server* sends and the *client* receives — i.e. it measures **download** from the client's perspective. The default direction (without `-R`) is the upload test (client → server). Corrected the comment to "Test download (reverse: server sends, client receives)" to accurately describe the flag.

## Review Notes
- `sudo systemd-resolve --flush-caches` (DNS Not Resolving section) is correct and still works on current Ubuntu, but `systemd-resolve` is the legacy name now provided as a compatibility symlink. The modern equivalent is `resolvectl flush-caches`. Not changed since the command still functions and the post elsewhere already uses `resolvectl`.
- `mii-tool` is legacy and may report "no MII interfaces" on many modern NICs/drivers (it does not support newer link technologies); `ethtool` is the recommended replacement. The post already presents `ethtool` first, so this is acceptable.
- `dig ... ANY` increasingly returns minimal responses (RFC 8482 — many resolvers/authoritative servers refuse ANY), so it is less useful than it once was, but the command itself remains valid.
- All package names, command flags, and filter syntax (including `ss` `sport = :443 or dport = :443` and tcpdump BPF expressions) verified as correct and current. No other changes required.
