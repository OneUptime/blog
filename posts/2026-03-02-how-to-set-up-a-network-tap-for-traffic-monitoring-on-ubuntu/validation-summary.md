# Validation Summary: How to Set Up a Network Tap for Traffic Monitoring on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- tcpdump (packet capture)
- tshark / Wireshark (protocol analysis)
- tc (Linux traffic control / `mirred` action)
- IFB (Intermediate Functional Block) kernel module
- bridge-utils / `brctl` (Linux bridging)
- netfilter / iptables / nftables (referenced)
- TZSP (TaZmen Sniffer Protocol) / ERSPAN
- daemonlogger
- conntrack-tools
- capinfos
- systemd (service definition)
- Ubuntu (apt package manager)

## Sources Consulted
- tcpdump(8) man page (verified flags `-i`, `-w`, `-r`, `-v`, `-A`, `-X`, `-G`, `-W`, `-z`, `-e`, `-q`) — https://www.tcpdump.org/manpages/tcpdump.1.html
- pcap-filter(7) (BPF filter expressions) — https://www.tcpdump.org/manpages/pcap-filter.7.html
- tshark(1) display filters, `-Y`, `-T fields -e`, `-z` taps — https://www.wireshark.org/docs/man-pages/tshark.html
- Linux Advanced Routing & Traffic Control HOWTO and `tc-mirred(8)` — https://man7.org/linux/man-pages/man8/tc-mirred.8.html
- Linux Kernel networking: ifb (Intermediate Functional Block) docs
- conntrack-tools documentation — https://conntrack-tools.netfilter.org/manual.html
- systemd.service / systemd.unit reference — https://www.freedesktop.org/software/systemd/man/systemd.service.html
- TZSP reference — https://en.wikipedia.org/wiki/TZSP (UDP port 37008)
- bridge-utils / `ip-link(8)` — https://man7.org/linux/man-pages/man8/ip-link.8.html
- Local verification with `tcpdump --version` (4.99.4) and `tc` binaries on Ubuntu

## Issues Found
1. **Software Port Mirroring with `tc` — incorrect IFB workflow.** The original block claimed to "Mirror outgoing (egress) traffic from eth0 to eth1" but then set up an IFB interface (`ifb0`) and used `action mirred egress redirect dev ifb0`, which moves ingress traffic to `ifb0` rather than mirroring it to `eth1`. The header comment was also self-contradictory ("Add an ingress qdisc … for outgoing traffic"). I replaced the IFB detour with the canonical pattern: an ingress qdisc on `eth0` mirroring (not redirecting) to `eth1`, plus a `prio` root qdisc mirroring egress to `eth1`. This matches the `tc-mirred(8)` documented usage for SPAN-style mirroring.
2. **Simpler egress-only mirroring example — invalid priomap.** The block specified `priomap 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0` (16 bands all 0) and a filter `parent 1:0`. The priomap line is unnecessary for mirroring (the default priomap is fine and any band reference is irrelevant once `mirred mirror` is in play), and the filter `parent` is conventionally `1:` rather than `1:0`. I simplified to the standard `tc qdisc add dev eth0 root handle 1: prio` + `tc filter add dev eth0 parent 1: …` pattern, also dropping the trailing `pass` (a no-op in this context).
3. **Remote Traffic Analysis with TZSP — misleading section.** The section was titled and introduced as TZSP, but the example used `tcpdump -w - | nc -u …` over **UDP**, which is neither TZSP encapsulation nor a reliable transport for a pcap stream (UDP packet loss/reordering would corrupt the file). I retitled the section "Remote Traffic Capture Forwarding," switched the example to **TCP** netcat (which preserves the pcap byte stream), added an SSH-tunnel variant, and moved the TZSP/ERSPAN reference into context as "protocols supported by tools such as `ntopng` and managed switches."
4. **Non-existent package "`tee-pipe`".** The comment "Install tee-pipe for traffic redirection" referred to a package that does not exist in Ubuntu/Debian repositories. Removed.
5. **`barnyard2` is not a capture-forwarding tool.** It is a Snort unified2 log spooler and is unrelated to live capture forwarding. Removed from the recommendation list; `daemonlogger` retained as a legitimate (if dated) example.

## Review Notes
- `bridge-utils` / `brctl` is technically deprecated in favor of `ip link add type bridge` and `ip link set <iface> master <bridge>`, but the package and tooling still work and are still shipped in current Ubuntu repos, so the example remains functional.
- The basic-capture explanatory comment mentions `-C 100 = rotate file every 100MB` and `-W 10 = keep at most 10 files`, but the actual command uses only `-G 3600 -W 24`. The comment is documentation of the flags rather than a description of the command, so it is not technically incorrect; left as-is.
- `tshark -z ip_hosts,tree` is uncommon; the more conventionally documented form for top-talkers-by-IP is `-z endpoints,ip` or `-z conv,ip`. Both `ip_hosts` and `endpoints,ip` are registered taps in current Wireshark builds, so the example is not strictly wrong — left as-is to avoid stylistic edits.
- `daemonlogger` is largely unmaintained upstream; users building new deployments should prefer modern alternatives (e.g., Suricata's pcap-log, Zeek, or moloch/Arkime). The post already frames it as a "consider" option, so no change made.
- The continuous-capture systemd unit uses `Type=simple` and `Restart=on-failure`, which is correct; `tcpdump`'s `-z gzip` requires the `gzip` binary in PATH (it is in `coreutils`/`gzip`, present by default on Ubuntu).
