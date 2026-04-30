# Validation Summary: How to Diagnose and Fix Slow Network Caused by TCP Window Size Issues

## Status
validated

## Post Type
Guide

## Technologies Covered
- TCP
- Linux kernel `sysctl` networking parameters
- `iperf3`
- Wireshark
- Windows TCP auto-tuning with `netsh`
- Python `socket` API

## Sources Consulted
- ESnet `iperf3` documentation: https://software.es.net/iperf/invoking.html
- Linux kernel IP sysctl documentation: https://docs.kernel.org/6.1/networking/ip-sysctl.html
- Linux `tcp(7)` manual page: https://man7.org/linux/man-pages/man7/tcp.7.html
- Linux `socket(7)` manual page: https://man7.org/linux/man-pages/man7/socket.7.html
- Wireshark Display Filter Reference for TCP: https://www.wireshark.org/docs/dfref/t/tcp.html
- Wireshark User’s Guide, TCP Stream Graphs: https://www.wireshark.org/docs/wsug_html_chunked/ChStatTCPStreamGraphs
- Microsoft Learn `netsh interface` reference: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-interface
- Microsoft Learn TCP/IP performance known issues: https://learn.microsoft.com/en-us/troubleshoot/windows-server/networking/tcpip-performance-known-issues
- Python socket library documentation: https://docs.python.org/3/library/socket.html
- RFC 7323, TCP Extensions for High Performance: https://datatracker.ietf.org/doc/html/rfc7323
- Red Hat Enterprise Linux network performance tuning guide: https://docs.redhat.com/documentation/red_hat_enterprise_linux/10/html/network_troubleshooting_and_performance_tuning/tuning-tcp-connections-for-high-throughput

## Issues Found
- The `iperf3 -w` comments said the flag "forces" a 4 MB or 256 KB window. I changed them to say it requests a socket buffer/window size and noted that Linux can make the effective value about 2x the request.
- The BDP example output did not match the code. The snippet prints `3.6 MiB`, not `3.7 MB`, so I corrected both the unit and the sample output.
- The Linux sysctl comments implied `net.core.rmem_default` and `net.core.wmem_default` were the TCP defaults. I clarified that those are generic socket defaults and that TCP min/default/max are controlled by `net.ipv4.tcp_rmem` and `net.ipv4.tcp_wmem`.
- The Wireshark "Window Size Updates" filter was incorrect because it matched many ordinary packets. I replaced it with the documented `tcp.analysis.window_update` filter and switched zero-window detection to `tcp.analysis.zero_window`.
- The throughput graph note implied flat throughput alone proves window exhaustion. I changed it to say a low throughput ceiling plus `window_full` or `zero_window` events suggests window exhaustion.
- The Windows `experimental` auto-tuning level was presented as a general recommendation for high-latency links. I reworded it to reflect Microsoft’s documentation that `experimental` is for testing or unusual scenarios.
- The Python socket example now notes that Linux may report roughly double the requested buffer size when you read it back with `getsockopt()`.

## Review Notes
- The `/etc/sysctl.conf` approach used in the post is still valid, although many current Linux distributions also support persistent drop-ins under `/etc/sysctl.d/`.
- Buffer values should be sized to the actual bandwidth-delay product and memory budget. Oversized buffers can waste memory and may increase latency.
