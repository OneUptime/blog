# Validation Summary: How to Identify TCP Retransmissions in Wireshark

## Status
validated

## Post Type
Tutorial / Reference guide (Wireshark display filters and diagnostic workflow for TCP retransmissions)

## Technologies Covered
- Wireshark (display filters, Expert Information, coloring rules)
- tshark (command-line Wireshark)
- TCP retransmission semantics (RTO, fast retransmit, duplicate ACKs, out-of-order, spurious retransmission)

## Sources Consulted
- Wireshark TCP display filter reference: https://www.wireshark.org/docs/dfref/t/tcp.html
- Wireshark tshark man page: https://www.wireshark.org/docs/man-pages/tshark.html
- Wireshark source code (epan/dissectors/packet-tcp.c) for Expert Info severity registration
- Default Wireshark coloring rules: https://gitlab.com/wireshark/wireshark/-/raw/master/resources/share/wireshark/colorfilters
- RFC 5681 (TCP Congestion Control) for the 3-duplicate-ACK fast-retransmit trigger

## Issues Found
1. **Expert Information severity levels were incorrect.** The post listed retransmissions and connection resets under "Error" and duplicate ACKs/out-of-order under "Warning". Per the Wireshark source (packet-tcp.c expert info registration), the actual mappings are:
   - Note (PI_NOTE): retransmission, fast retransmission, spurious retransmission, duplicate ACK
   - Warning (PI_WARN): out-of-order, connection RST, previous segment not captured, zero window
   - No TCP analysis event is registered at Error severity.
   I rewrote the severity table to reflect what Wireshark actually emits.

2. **Color coding descriptions were inaccurate.** The post described "Bad TCP" as "dark purple" and TCP RST as having a black background. Per the default `colorfilters` file, "Bad TCP" uses a salmon/pink background with near-black foreground, and "TCP RST" uses a pale yellow background with dark red foreground. I corrected the section to match the default coloring rules.

## Review Notes
- All display filter names (`tcp.analysis.retransmission`, `fast_retransmission`, `out_of_order`, `duplicate_ack`, `flags`, `spurious_retransmission`) are valid per the official display filter reference.
- tshark invocations (`-r`, `-q`, `-z io,stat,1,<filter>`, `-Y <filter>`) match the documented man-page syntax.
- The claim that fast retransmit triggers on 3 duplicate ACKs matches RFC 5681 §3.2.
- The `TOTAL=$(tshark -r capture.pcap | wc -l)` line counts all packets including any tshark status/header output; for a more precise rate, `-Y 'tcp'` or `capinfos -c` would be cleaner, but the example is correct as written for a rough estimate.
