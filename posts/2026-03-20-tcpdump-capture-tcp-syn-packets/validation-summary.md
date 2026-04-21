# Validation Summary: How to Use tcpdump to Capture Only TCP SYN Packets

## Status
validated

## Post Type
Tutorial / command-line guide

## Technologies Covered
- tcpdump
- libpcap / pcap-filter BPF expressions
- TCP flags and connection setup
- Linux shell pipelines with awk, grep, timeout, sort, uniq, wc

## Sources Consulted
- Local `tcpdump --help`, `tcpdump(8)`, and `pcap-filter(7)` man pages for tcpdump 4.99.4 and libpcap 1.10.4.
- tcpdump manual page mirror: https://man7.org/linux/man-pages/man1/tcpdump.1.html
- pcap-filter manual page mirror: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- RFC 9293, Transmission Control Protocol (TCP): https://datatracker.ietf.org/doc/html/rfc9293
- GNU Coreutils `timeout` manual: https://www.gnu.org/software/coreutils/manual/html_node/timeout-invocation.html
- GNU Grep manual for `-P` / PCRE mode: https://www.gnu.org/software/grep/manual/html_node/grep-Programs.html
- GNU Awk User's Guide for records and `NR`: https://www.gnu.org/software/gawk/manual/html_node/Records.html

## Issues Found
- Clarified that tcpdump/libpcap `tcp[...]` arithmetic filters apply to IPv4 TCP packets and do not match IPv6 TCP packets. This matches the `pcap-filter(7)` documentation.
- Reworded "pure SYN" and "new connection attempt" phrasing to "initial SYN" / "initial SYN packet" because the filter checks SYN set and ACK unset, not that every other flag is unset.
- Replaced the SYN rate command. The original command counted batches of 100 output lines, not packets per second. The updated command uses `tcpdump -tt` timestamps, `tcpdump -l` line buffering, and `awk` second buckets.
- Fixed the SYN-RST capture command from `dst port 22` to `port 22`. A refused connection usually has the SYN destined to port 22 and the RST/RST-ACK response sourced from port 22, so `dst port 22` would miss the response direction.
- Softened the final "90%+" capture reduction claim because the exact reduction depends on traffic patterns.

## Review Notes
- All tcpdump filter expressions in the post were syntax-checked with `tcpdump -d`.
- Live packet capture was not run in this environment because the current shell lacks packet capture permissions without sudo; command behavior was verified through tcpdump/libpcap documentation and filter compilation.
- `grep -P` is GNU grep / PCRE mode. That is appropriate for the Linux-focused post, but it is less portable to non-GNU grep implementations.
