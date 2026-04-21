# Validation Summary: How to Interpret TCP Zero Window Events in Packet Captures

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- TCP flow control and zero-window probing
- Wireshark TCP analysis display filters
- tcpdump/libpcap capture filters
- Linux networking and system diagnostics
- awk, strace, top, pgrep, iostat, sysctl

## Sources Consulted
- RFC 9293: Transmission Control Protocol (TCP): https://www.rfc-editor.org/rfc/rfc9293
- Wireshark User's Guide, TCP Analysis: https://www.wireshark.org/docs/wsug_html_chunked/ChAdvTCPAnalysis.html
- Wireshark Display Filter Reference for TCP: https://www.wireshark.org/docs/dfref/t/tcp.html
- tcpdump and pcap-filter Linux man pages: https://man7.org/linux/man-pages/man1/tcpdump.1.html and https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- Linux tcp(7) manual page: https://man7.org/linux/man-pages/man7/tcp.7.html
- Linux Kernel PSI documentation: https://www.kernel.org/doc/html/v6.10/accounting/psi.html
- POSIX awk reference for match(), RSTART, and RLENGTH: https://bs2manuals.ts.fujitsu.com/psPOSIXV210en/awk-pattern-scanning-and-processing-language-posix-commands-2025-09-54-13638212.html
- Local command help/output for tcpdump 4.99.4, libpcap 1.10.4, strace 6.8, mawk 1.3.4, procps top/pgrep, and sysstat iostat.

## Issues Found
- The introduction and sequence said the sender stops transmitting completely and waits for a Zero Window Probe. Updated this to say the sender stops sending new data, sends periodic probes itself, and waits for a non-zero Window Update, matching RFC 9293.
- The probe timing was described as "every few seconds." Updated it to note periodic probes with timer backoff, which is more accurate for TCP persist behavior.
- The Wireshark Window Update comment implied it only means recovery from zero window. Clarified that it means the receiver advertised more space.
- The tcpdump live pipeline omitted `-l`, which can delay awk output because stdout is block-buffered when piped. Added `-l`.
- The tcpdump awk pattern looked for `win 0 `, but tcpdump commonly prints the field as `win 0,`. Updated the pattern to match comma, space, or end-of-line after zero.
- The tcpdump SYN exclusion used `tcp[tcpflags] != tcp-syn`, which only excludes pure SYN packets and can still match SYN-ACK. Replaced it with a bit-mask check that excludes any packet with the SYN bit set.
- The Linux memory pressure path `/proc/sys/vm/pressure_cache` is not a valid PSI file. Replaced it with `/proc/pressure/memory`.
- The `top -p $(pgrep your-app)` example can break when `pgrep` returns multiple PIDs. Changed it to use `pgrep -d,` for top's PID list format.
- The strace example used `$(pgrep your-app)`, which can produce multiple PIDs for a single `-p`, and traced only a narrow set of receive calls. Updated it to attach to one process with `pgrep -n` and include common socket read syscalls.
- The awk example used GNU awk's non-POSIX third argument to `match()`, which fails on mawk. Rewrote it using POSIX `match()`, `RSTART`, `RLENGTH`, and `substr()`.
- The duration analysis measured from the first zero-window probe, which can undercount because the first probe may occur after the zero-window condition starts. Updated it to measure from the first Zero Window packet.
- The fixed thresholds for "serious" and "acceptable" zero-window durations were too absolute. Reworded them as context-dependent operational guidance.
- The final fix item said to "enable socket-level flow control" with non-blocking sockets. TCP flow control is already built into TCP, so this was corrected to improving socket read scheduling.

## Review Notes
The post is technically relevant and useful after correction. Future improvements could include adding a note that `tcp[14:2]` reads the raw TCP window field and that libpcap TCP header accessors are IPv4-focused, while Wireshark's calculated window accounts for TCP window scaling.
