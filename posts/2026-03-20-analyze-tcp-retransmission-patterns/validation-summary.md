# Validation Summary: How to Analyze TCP Retransmission Rates and Patterns

## Status
validated

## Post Type
Guide

## Technologies Covered
- TCP congestion control and retransmission behavior
- Linux kernel TCP SNMP counters
- `nstat` from iproute2
- Wireshark TCP analysis filters and stream graphs
- Linux `sysctl` TCP reordering tuning

## Sources Consulted
- Linux kernel SNMP counter documentation: https://docs.kernel.org/networking/snmp_counter.html
- Linux kernel IP sysctl documentation (`tcp_reordering`): https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- RFC 5681, TCP Congestion Control: https://www.rfc-editor.org/rfc/rfc5681
- RFC 6298, Computing TCP's Retransmission Timer: https://www.rfc-editor.org/rfc/rfc6298
- Wireshark User's Guide, TCP Analysis: https://www.wireshark.org/docs/wsug_html_chunked/ChAdvTCPAnalysis.html
- Wireshark display filter reference for TCP analysis fields: https://www.wireshark.org/docs/dfref/t/tcp.html
- Wireshark User's Guide, TCP Stream Graphs: https://www.wireshark.org/docs/wsug_html_chunked/ChStatTCPStreamGraphs
- Local `nstat --help` and `man nstat` output from the review environment

## Issues Found
- The post used `nstat -z` as if it returned absolute counters. In iproute2, `-z` only shows zero-valued counters, while the default mode reports increments since the previous use. I changed the commands to `nstat -asz` so they read absolute counters safely.
- The post described `TcpExtTCPSlowStartRetrans` as timeout retransmissions. Linux documents this counter as retransmissions sent while congestion control is in the `Loss` state, which is not the same as counting RTO expirations. I corrected the description and added `TcpExtTCPTimeouts` for actual RTO events.
- The post described `TcpExtTCPSpuriousRtxHostQueues` as a generic spurious retransmission counter. Linux documents it as retransmits avoided because the original packet was still stuck in a local qdisc or driver queue. I corrected that description and added `TcpExtTCPSpuriousRTOs` for spurious RTO detection.
- The retransmission-rate script used `TcpOutSegs` as the denominator and initialized previous counters to zero, which could produce misleading rates. I changed it to use `TcpExtTCPOrigDataSent`, initialize from the current counter values, and compute the percentage with `awk`.
- The retransmission table and conclusion overstated congestion-window behavior for SACK/spurious cases and treated timeout-related events too absolutely. I softened that wording to match RFC and kernel behavior more closely.
- The Wireshark section treated `tcp.analysis.retransmission` as if it matched every retransmission-like event. Wireshark documents fast and spurious retransmissions as separate, superseding flags, so I corrected the filters and clarified the spurious retransmission meaning.

## Review Notes
- Linux TCP counter names and meanings are kernel-specific; other operating systems will not expose the same metrics.
- Wireshark marks these analysis flags as suspected inferences, not protocol-level ground truth.
- The `tcp_reordering` advice is specifically about Linux sender behavior and should only be applied when reordering is actually the cause.
