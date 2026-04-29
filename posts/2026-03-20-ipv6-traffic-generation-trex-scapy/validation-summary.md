# Validation Summary: How to Generate IPv6 Traffic with TRex and Scapy

## Status
validated

## Post Type
Guide

## Technologies Covered
- Scapy
- Python
- IPv6
- ICMPv6 Neighbor Discovery Protocol (NDP)
- Cisco TRex stateless traffic generation
- TCP socket testing

## Sources Consulted
- Scapy usage documentation: https://scapy.readthedocs.io/en/stable/usage.html
- Scapy send/receive API reference: https://scapy.readthedocs.io/en/latest/api/scapy.sendrecv.html
- Scapy IPv6 layer API reference: https://scapy.readthedocs.io/en/latest/api/scapy.layers.inet6.html
- Python `ipaddress` documentation: https://docs.python.org/3/library/ipaddress.html
- Python `threading` documentation: https://docs.python.org/3/library/threading.html
- TRex stateless support documentation: https://trex-tgn.cisco.com/trex/doc/trex_stateless.html
- TRex console documentation: https://trex-tgn.cisco.com/trex/doc/trex_console.html
- TRex stateless Python API documentation: https://trex-tgn.cisco.com/trex/doc/cp_stl_docs/
- RFC 4291, IPv6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://datatracker.ietf.org/doc/html/rfc4861
- RFC 2464, Transmission of IPv6 Packets over Ethernet Networks: https://datatracker.ietf.org/doc/html/rfc2464

## Issues Found
- The ICMPv6 ping example treated any response packet as a successful echo reply. I changed it to verify `ICMPv6EchoReply` explicitly and report unexpected ICMPv6 responses separately.
- The Scapy UDP flood example tried to build `list(network.hosts())` for a `/64`, which is not practical, used the invalid IPv6 literal `2001:db8::server`, and sent layer-2 frames without resolving a destination MAC. I changed it to rotate source addresses arithmetically, use a valid documentation-prefix destination, and resolve the next-hop MAC with `getmacbyip6()`.
- The TRex example showed `trex-console` as the server start command, which is incorrect according to TRex docs. I changed the command flow to start the server with `sudo ./t-rex-64 -i` and then connect with `./trex-console`.
- The TRex stream combined a 1 Mpps load stream with `STLFlowLatencyStats`, even though TRex documents latency streams as RX-software-constrained and intended for low-rate probing. I removed the latency flow stats from the high-rate example.
- The NDP example omitted `time` import, derived the solicited-node multicast address by string slicing compressed IPv6 text, hard-coded the destination multicast MAC incorrectly, and did not set IPv6 hop limit to `255` as required for ND validation. I replaced it with RFC-based address and MAC derivation using `ipaddress`, interface MAC lookup, and an explicit `hlim=255`.
- The TCP connection rate example updated shared counters from multiple threads without synchronization and did not guarantee socket cleanup on exceptions. I changed it to use `threading.Event`, `threading.Lock`, and context-managed sockets.
- The conclusion made a specific Scapy throughput claim that is not supported by official Scapy documentation. I replaced it with a docs-aligned statement that Scapy is flexible for protocol work but not intended for line-rate throughput.

## Review Notes
- The Python code blocks were syntax-checked locally with `ast.parse`, but the Scapy and TRex examples were not executed in this workspace because those tools are not installed here.
- TRex official documentation still contains some older examples that import `trex_stl_lib.api`, but the current stateless API docs and generated profile examples use `trex.stl.api`.
- Scapy documentation explicitly notes that it is not designed to be blazing fast; for replay-oriented higher-rate transmission, TRex or Scapy workflows based on `sendpfast()` are more appropriate than a Python `sendp()` loop.
