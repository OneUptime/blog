# Validation Summary: How to Troubleshoot TCP SYN Flood Attacks

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Linux kernel TCP stack (`net.ipv4.tcp_syncookies`, `tcp_max_syn_backlog`, `tcp_synack_retries`)
- `ss` (iproute2)
- `ip` (iproute2)
- `netstat` (net-tools)
- `dmesg`
- `tcpdump` with BPF filter syntax
- `iptables` with `hashlimit` and `limit` modules
- `nc` (netcat)
- `sysctl`

## Sources Consulted
- Linux kernel networking documentation: https://www.kernel.org/doc/Documentation/networking/ip-sysctl.txt
- `iptables-extensions(8)` man page for `hashlimit` and `limit` match modules: https://ipset.netfilter.org/iptables-extensions.man.html
- `ss(8)` and `ip(8)` man pages (iproute2)
- `tcpdump(1)` man page and pcap-filter(7) for BPF syntax
- RFC 4987 "TCP SYN Flooding Attacks and Common Mitigations"
- D.J. Bernstein's SYN cookies reference: http://cr.yp.to/syncookies.html
- Verified local behaviour: `ip -s link show lo` output format on a modern iproute2 installation.

## Issues Found
1. **`ip -s link show eth0 | grep 'RX packets'` would not match.** Modern iproute2 formats the statistics as `RX:  bytes packets errors dropped missed mcast` on a header line followed by numeric values on the next line. The literal substring "RX packets" does not appear, so the grep returns nothing. Changed to `grep -A1 'RX:'` which displays the header and the numeric stats line.
2. **`awk '{print $3}'` in the "Block Known Attack Sources" section includes the source port.** tcpdump prints source addresses as `IP.port` (e.g., `192.0.2.5.54321`), so `$3` yields a unique string per flow, defeating the `sort | uniq -c` aggregation. Replaced with an `awk` statement that splits on `.` and prints only the first four octets, so counts are grouped by source IP.

## Review Notes
- SYN cookie behaviour is correct: `net.ipv4.tcp_syncookies=1` is the mainstream default on modern distros, but the sysctl still controls it and explicitly enabling it is valid advice.
- `netstat` is deprecated in favour of `ss`/`nstat`, but `netstat -s` remains widely available and the "SYNs to LISTEN sockets dropped" counter is the canonical label produced by the kernel, so leaving it is fine.
- The `hashlimit` invocation is syntactically correct; `--hashlimit-name` is required and a single `srcip` mode produces one bucket per source IP, as described.
- `tcp_max_syn_backlog=8192` and `tcp_synack_retries=2` are reasonable tuning values and the flags exist in current kernels.
- The post does not mention that on modern kernels `nf_conntrack_max` / connection-tracking tables can also be exhausted by a SYN flood; this is optional additional context and not a correctness issue.
- `iptables` is increasingly superseded by `nftables` on recent distros, but `iptables-nft` preserves the shown syntax, so the commands remain valid. Worth revisiting if the post is updated later to cover nftables natively.
