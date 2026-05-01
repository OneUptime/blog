# Validation Summary: How to Extract TCP Streams from IPv4 Traffic with dpkt

## Status
validated

## Post Type
Guide

## Technologies Covered
- Python 3
- dpkt
- PCAP
- Ethernet
- IPv4
- TCP
- HTTP/1.x

## Sources Consulted
- dpkt project documentation: https://kbandla.github.io/dpkt/
- dpkt "Print Packets" example: https://kbandla.github.io/dpkt/print_packets.html
- dpkt "Print HTTP Requests" example: https://kbandla.github.io/dpkt/print_http_requests.html
- dpkt GitHub repository: https://github.com/kbandla/dpkt
- dpkt release history: https://github.com/kbandla/dpkt/releases
- RFC 9293, Transmission Control Protocol: https://www.rfc-editor.org/rfc/rfc9293
- RFC 9112, HTTP/1.1: https://www.rfc-editor.org/rfc/rfc9112.html

## Issues Found
- The original stream "normalization" inferred client/server direction by comparing port numbers. That is not a valid way to identify TCP direction, so I changed the example to keep each 4-tuple direction separate.
- The original reassembly logic stored one payload per sequence number and concatenated payloads after sorting by `seq`. That can lose retransmissions or overlapping data and does not match TCP's byte-sequence model, so I replaced it with a best-effort per-direction reassembler that trims overlaps.
- The original HTTP example appended payloads in capture order instead of reusing sequence-ordered stream data. I changed it to filter from the reassembled payloads and to identify common HTTP/1.x start-lines on port 80.
- The original text implied generic PCAP handling, but the code explicitly unpacks each record as `dpkt.ethernet.Ethernet(...)`. I clarified that the examples assume an Ethernet PCAP.
- The original stream preview used `decode(..., errors='replace')` inside a `try`/`except`, which made the binary fallback unreachable. I changed it to strict UTF-8 decoding with a hex fallback.
- The extracted-stream filename example used a `.txt` extension even though HTTP payloads can contain binary bodies. I changed the output extension to `.bin`.

## Review Notes
- The examples are accurate for classic PCAP files read with `dpkt.pcap.Reader`. If PCAPNG support is needed, newer dpkt releases also provide `dpkt.pcap.UniversalReader`, but this post is specifically about PCAP.
- The reassembly example is intentionally best-effort. It now handles common out-of-order, retransmitted, and overlapping segments, but it still assumes the capture does not cross TCP's 32-bit sequence-number wrap-around.
