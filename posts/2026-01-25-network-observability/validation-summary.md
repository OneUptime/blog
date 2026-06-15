# Validation Summary: How to Implement Network Observability

## Status
validated

## Post Type
Technical implementation guide

## Technologies Covered
- NetFlow, IPFIX, and sFlow
- softflowd, nfdump, and nfcapd
- tcpdump and tshark
- Linux eBPF with BCC
- Prometheus configuration, exporters, metrics, and alerting rules
- Linux `/proc/net/tcp`, `/proc/net/dev`, and `/proc/net/snmp`
- Python

## Sources Consulted
- BCC reference guide: https://github.com/iovisor/bcc/blob/master/docs/reference_guide.md
- BCC installation guide: https://github.com/iovisor/bcc/blob/master/INSTALL.md
- BCC tcpconnect example: https://github.com/iovisor/bcc/blob/master/examples/tracing/tcpv4connect.py
- Prometheus Python client Counter documentation: https://prometheus.github.io/client_python/instrumenting/counter/
- Prometheus Python client Gauge documentation: https://prometheus.github.io/client_python/instrumenting/gauge/
- Prometheus metric types documentation: https://prometheus.io/docs/concepts/metric_types/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Linux kernel SNMP counter documentation: https://docs.kernel.org/networking/snmp_counter.html
- Linux `/proc/net/dev` manual page: https://www.man7.org/linux/man-pages/man5/proc_pid_net.5.html
- tcpdump local help output, version 4.99.4
- nfdump package/man page overview: https://www.mankier.com/package/nfdump
- Wireshark man pages index for tshark: https://www.wireshark.org/docs/man-pages/

## Issues Found
- The BCC example said `pip install bcc`, which points readers at the wrong installation path for the BPF Compiler Collection on Debian/Ubuntu systems. Updated the requirement comment to use `bpfcc-tools`, `python3-bpfcc`, and matching kernel headers.
- The BCC kretprobe attempted to read the original `tcp_v4_connect` socket argument with `PT_REGS_PARM1(ctx)` on function return. BCC documents kretprobe return access through `PT_REGS_RC(ctx)`, so the example now tracks connect start time by thread ID and reads the return code correctly.
- The BCC example calculated latency but never exported it to user space. Added `latency_ns` to the event structure and changed the output to print milliseconds.
- The Prometheus exporter used a Gauge named `tcp_connections_total` for a point-in-time connection count. Renamed it to `tcp_connections` and updated the alert rule to check the current `SYN_RECV` count instead of applying `rate()` to a gauge.
- The Prometheus exporter incremented `network_packets_dropped_total` by the cumulative `/proc/net/dev` drop value on every loop, which would overcount. Changed it to increment by the observed delta after the first sample.
- The alert rule referenced `tcp_segments_sent_total`, but the exporter did not define or collect it. Added TCP `OutSegs` collection from `/proc/net/snmp` along with `RetransSegs`, using deltas for Prometheus counters.

## Review Notes
The flow collection and packet capture commands are plausible for the tools discussed. The examples still assume Linux interface names such as `eth0`; readers on systems using predictable interface names will need to substitute their actual interface.
