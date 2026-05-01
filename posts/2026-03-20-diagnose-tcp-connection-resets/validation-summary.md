# Validation Summary: How to Diagnose and Fix TCP Connection Resets (RST Packets)

## Status
validated

## Post Type
Guide

## Technologies Covered
- TCP
- Wireshark
- tcpdump/libpcap filters
- Linux TCP keepalive sysctls
- iptables/netfilter conntrack
- Python socket API
- `nstat`
- `ss`

## Sources Consulted
- RFC 9293, Transmission Control Protocol (TCP): https://www.rfc-editor.org/rfc/rfc9293
- `tcpdump(8)`: https://man7.org/linux/man-pages/man8/tcpdump.8.html
- `pcap-filter(7)`: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- Wireshark Display Filter Reference, TCP: https://www.wireshark.org/docs/dfref/t/tcp.html
- Wireshark User’s Guide, TCP Analysis: https://www.wireshark.org/docs/wsug_html_chunked/ChAdvTCPAnalysis.html
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- `iptables-extensions(8)`: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- `conntrack` man page: https://netfilter.org/projects/conntrack-tools/conntrack-manpage.html
- RFC 4022, TCP-MIB counter definitions: https://datatracker.ietf.org/doc/html/rfc4022
- `nstat(8)`: https://man7.org/linux/man-pages/man8/nstat.8.html
- Python `socket` documentation: https://docs.python.org/3/library/socket.html
- Python `errno` documentation: https://docs.python.org/3/library/errno.html

## Issues Found
- The Wireshark capture example saved only RST packets to the pcap file, but later steps required the full stream to inspect packets before the reset. I changed the save command to capture the full conversation for the target host with `-s 0`.
- The filter `tcp.analysis.idle_time` is not a valid Wireshark TCP display field. I replaced it with `tcp.time_delta > 60`, which is an official TCP-stream time field.
- The filter `tcp.seq > 1` was not a reliable way to exclude port-closed responses. I replaced it with a handshake-completeness filter based on Wireshark’s `tcp.completeness.*` fields.
- Several causal explanations overstated when TCP RSTs are guaranteed to occur. I narrowed the wording for application aborts, firewall rejects, load balancer timeouts, keepalive failures, and NAT state expiry so the post no longer treats those outcomes as unconditional.
- The conntrack section said it was checking for expired states, but `conntrack -L` lists current entries. I changed the commands to explicit TCP state filters and adjusted the explanation to focus on current state counts and timeout review.
- The keepalive section said Linux sends “9 probes before RST”. Kernel documentation defines `tcp_keepalive_probes` as the number of probes sent before the connection is declared broken, so I corrected that wording and clarified that keepalive defaults matter only for sockets that enable `SO_KEEPALIVE`.
- The Python example caught `ConnectionResetError` around `connect()`, which does not accurately model the common reset/refusal cases described in the post. I replaced it with a request/retry example using `socket.create_connection()` and handling established-connection resets plus connection refusal explicitly.
- The `nstat` section was described as watching resets over time, but `nstat -z` is a one-shot read that merely includes zero counters. I changed it to `nstat -az -d 1` for continuous sampling and corrected the meaning of `TcpAttemptFails` to match RFC 4022.
- The `ss` example included the header row in the state count. I added `-H` so the command counts socket states only.

## Review Notes
- The `tcp.completeness.*` display fields used in the revised Wireshark filter depend on a relatively recent Wireshark release.
- Some infrastructure closes idle connections with FIN rather than RST, so idle-time problems do not always appear as reset packets.
