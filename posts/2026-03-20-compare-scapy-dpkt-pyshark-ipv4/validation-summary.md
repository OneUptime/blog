# Validation Summary: How to Compare Scapy, dpkt, and PyShark for IPv4 Packet Analysis

## Status
validated

## Post Type
Guide / Comparison

## Technologies Covered
- Python
- Scapy
- dpkt
- PyShark
- TShark / Wireshark
- PCAP parsing
- IPv4
- TCP

## Sources Consulted
- Scapy usage documentation: https://scapy.readthedocs.io/en/stable/usage.html
- Scapy `sendrecv` API reference: https://scapy.readthedocs.io/en/latest/api/scapy.sendrecv.html
- dpkt documentation index: https://dpkt.readthedocs.io/en/stable/index.html
- dpkt `pcap` module reference: https://dpkt.readthedocs.io/en/latest/_modules/dpkt/pcap.html
- dpkt packet-reading example: https://dpkt.readthedocs.io/en/latest/print_packets.html
- PyShark GitHub README: https://github.com/KimiNewt/pyshark
- PyShark FileCapture parameters: https://pyshark-packet-analysis.readthedocs.io/en/latest/parameters/file_capture_parameters/
- PyShark LiveCapture parameters: https://pyshark-packet-analysis.readthedocs.io/en/latest/parameters/live_capture_parameters/
- Wireshark `tshark` manual page: https://www.wireshark.org/docs/man-pages/tshark.html
- Wireshark display filter reference: https://www.wireshark.org/docs/man-pages/wireshark-filter

## Issues Found
- The comparison table said `dpkt` had only "Limited" packet crafting and a "Via pcap lib" live-capture capability. The official `dpkt` docs describe it as a module for packet creation and parsing, while its documented `pcap.Reader` support is for savefiles rather than built-in live capture. I changed the table to describe `dpkt` as basic manual packet creation with no built-in capture.
- The table used exact protocol-count claims and a "Display filters" row that overstated equivalence across the libraries. I replaced those entries with technically accurate descriptions of protocol coverage and filtering models based on the Scapy, PyShark, and Wireshark documentation.
- The performance section presented exact packets-per-second figures without a documented benchmark method or authoritative source. I changed that section to relative throughput guidance, which is accurate across workloads without implying fixed benchmark results.
- The section title and code comment "Scapy Only" incorrectly implied that only Scapy can craft packets. I changed that wording to the narrower and accurate claim that Scapy provides high-level packet crafting and packet sending.

## Review Notes
- The Scapy and dpkt code snippets were syntax-checked and executed locally against a temporary PCAP generated during review; both produced the expected IPv4/TCP source and destination output.
- The PyShark example was validated against the project README and parameter documentation, but it was not executed locally because `pyshark` and `tshark` are not installed in this environment.
- Exact throughput for all three libraries depends heavily on packet mix, capture format, hardware, Python version, and how much protocol dissection is enabled.
