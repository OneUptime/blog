# Validation Summary: How to Capture IPv4 Packets with tcpdump on Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- `tcpdump`
- `libpcap` / BPF capture filters
- Linux packet capture
- Wireshark `dumpcap`
- PCAP / PCAPNG capture files

## Sources Consulted
- The Tcpdump Group `tcpdump(1)` upstream man page source: https://raw.githubusercontent.com/the-tcpdump-group/tcpdump/master/tcpdump.1.in
- The Tcpdump Group `pcap-filter(7)` upstream man page source: https://raw.githubusercontent.com/the-tcpdump-group/libpcap/master/pcap-filter.manmisc.in
- Wireshark `dumpcap(1)` manual page: https://www.wireshark.org/docs/man-pages/dumpcap.html

## Issues Found
- The filter `src 192.168.1.0/24 and dst port 443` was invalid on current `tcpdump`/`libpcap`; it was changed to `src net 192.168.1.0/24 and dst port 443` because CIDR mask syntax requires a network match.
- The snapshot-length explanation said the default capture was the full packet and that `-s 0` meant full packets. Upstream `tcpdump(1)` documents a default snaplen of `262144` bytes, and `-s 0` resets to that default, so the wording was corrected.
- The DHCP example described the traffic as broadcast on ports `67/68`. DHCP uses UDP ports `67/68`, but not all DHCP traffic is broadcast, so the note was corrected.
- The non-root setup hardcoded `/usr/sbin/tcpdump`, which is not portable across Linux distributions. It was changed to `$(command -v tcpdump)` so the commands target the actual installed binary path.
- The `dumpcap` example wrote to `/tmp/capture.pcap`, but `dumpcap` writes `pcapng` by default. The filename was changed to `/tmp/capture.pcapng` to match the documented default format.
- The practical HTTP example claimed to watch HTTP requests, but the byte pattern specifically matches `GET `. The comment was corrected to HTTP GET requests, and the filter was tightened to `tcp port 80`.

## Review Notes
- Local filter compilation with `tcpdump -d` confirmed the corrected BPF examples compile successfully.
- The non-root `tcpdump` and `dumpcap` workflows remain distribution-dependent in practice; group membership changes typically require a new login session before they take effect.
