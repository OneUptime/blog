# Validation Summary: How to Diagnose TCP Window Full Errors in Wireshark

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- TCP flow control
- Wireshark TCP analysis and TCP stream graphs
- tcpdump
- awk
- Linux sysctl TCP receive-buffer tuning
- strace
- Linux procfs socket statistics

## Sources Consulted
- RFC 9293: Transmission Control Protocol (TCP), especially TCP window semantics and zero-window behavior: https://datatracker.ietf.org/doc/html/rfc9293
- RFC 7323: TCP Extensions for High Performance, especially TCP Window Scale behavior: https://datatracker.ietf.org/doc/html/rfc7323
- Wireshark Display Filter Reference for TCP analysis fields: https://www.wireshark.org/docs/dfref/t/tcp.html
- Wireshark User's Guide, TCP Analysis and TCP Stream Graphs: https://www.wireshark.org/docs/wsug_html/
- tcpdump(1) manual page: https://man7.org/linux/man-pages/man1/tcpdump.1.html
- tcpdump TCP printer source (`print-tcp.c`) for the printed `win` field: https://github.com/the-tcpdump-group/tcpdump/blob/master/print-tcp.c
- Linux kernel IP sysctl documentation for `tcp_rmem`, `tcp_moderate_rcvbuf`, and receive-buffer limits: https://www.kernel.org/doc/html/v6.9/networking/ip-sysctl.html
- GNU awk manual noting the third `match()` argument is a `gawk` extension: https://www.gnu.org/software/gawk/manual/html_node/String-Functions.html
- strace(1) manual page for `-p` and `-e trace=` syntax: https://man7.org/linux/man-pages/man1/strace.1.html
- GitHub author profile link: https://github.com/nawazdhandala

## Issues Found
- The introduction said the sender must wait for an ACK with an updated larger window. Updated this to say ACKs must advance or reopen the usable send window, because TCP can resume when acknowledgments move `SND.UNA`, not only when the advertised window value increases.
- The tcpdump/awk pipeline used `match($0, /.../, a)`, which is a GNU awk extension and fails on common non-gawk implementations such as `mawk`. Rewrote it to use POSIX-style `match()` with `RSTART` and `RLENGTH`.
- The tcpdump section treated `win` values as directly comparable without a scaling caveat. Added a note that tcpdump prints the 16-bit TCP header window field and that the negotiated window scale must be applied to determine the effective receive window.
- The Linux receive-buffer tuning example increased only `net.ipv4.tcp_rmem`. Added `net.core.rmem_max` because the Linux kernel documentation states `tcp_rmem[2]` does not override the core receive-buffer cap.
- The Wireshark timeline section equated flat Time-Sequence graph sections with Window Full pauses. Updated it to require correlation with Window Full or Zero Window packets, since flat sequence-number periods can also come from application idle time or other causes.

## Review Notes
The commands are Linux-oriented and assume privileges for packet capture, `strace -p`, and sysctl writes. The tcpdump threshold of 1000 bytes remains a heuristic; it should be interpreted with negotiated window scaling and the full TCP stream context.
