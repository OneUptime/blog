# Validation Summary: How to Spoof IPv4 Source Addresses with Scapy

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Scapy
- IPv4
- ICMP
- TCP
- UDP
- Python
- BCP38 / network ingress filtering
- Packet capture / BPF filters

## Sources Consulted
- Scapy installation documentation: https://scapy.readthedocs.io/en/latest/installation.html
- Scapy usage documentation for `send()` and routing behavior: https://scapy.readthedocs.io/en/stable/usage.html#sending-packets
- Scapy send/receive API documentation for `send()`, `sr1()`, and `sniff()`: https://scapy.readthedocs.io/en/latest/api/scapy.sendrecv.html
- Scapy 2.6 release notes on deprecated `iface=` for layer-3 helpers: https://github.com/secdev/scapy/issues/4196
- RFC 2827 / BCP38, Network Ingress Filtering: https://www.rfc-editor.org/rfc/rfc2827
- RFC 8704, Source Address Validation terminology: https://www.rfc-editor.org/rfc/rfc8704
- Python `ipaddress` module documentation: https://docs.python.org/3/library/ipaddress.html
- Python `random.randint()` documentation: https://docs.python.org/3/library/random.html#random.randint

## Issues Found
- The prerequisites did not mention libpcap/Npcap even though the post uses BPF capture filters with `sniff()`. Added a short note because Scapy's platform guidance calls out libpcap for BPF filter support.
- The BCP38 section described BCP38 as a hard requirement and implied that `send(pkt, iface="eth0")` plus local observation could prove whether a packet left the network. Updated the wording to describe BCP38 as a best-current-practice recommendation, removed deprecated layer-3 `iface=` usage, and clarified that validation requires router/firewall logs or packet capture at the edge or remote sensor.
- The UDP payload example used `/ b"\x00" * 10`, which Python parses as `(packet / b"\x00") * 10` because `/` and `*` have the same precedence and are evaluated left to right. Updated it to use `Raw(load=b"\x00" * 10)` and removed the unused `RandShort` import.
- The firewall validation example used `sr1()` and treated a missing reply as proof that the firewall blocked the packet. With a spoofed source IP, replies normally go to the spoofed source rather than the Scapy host. Updated the example to send the probe and instruct validation through firewall logs or target-side capture.
- The response-capture example used a broad `host 10.0.0.99 and icmp` filter, did not specify the capture point, and could send before the sniffer thread was ready. Updated the text and code to capture on the spoofed-IP host or a SPAN/mirror interface, filter for ICMP packets destined to the spoofed IP, and briefly wait before sending.

## Review Notes
Scapy was not installed in the local environment, and the packet-sending examples were not executed to avoid generating network traffic. The snippets were reviewed against official documentation and checked for Python syntax after the corrections.
