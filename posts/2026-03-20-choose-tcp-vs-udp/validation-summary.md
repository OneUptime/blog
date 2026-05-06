# Validation Summary: How to Choose Between TCP and UDP for Your Application

## Status
validated

## Post Type
Guide

## Technologies Covered
- TCP
- UDP
- DNS
- QUIC
- HTTP/3
- RTP
- curl

## Sources Consulted
- RFC 9293, Transmission Control Protocol (TCP): https://www.rfc-editor.org/rfc/rfc9293
- RFC 768, User Datagram Protocol (UDP): https://www.rfc-editor.org/rfc/rfc768
- RFC 8085, UDP Usage Guidelines: https://www.rfc-editor.org/rfc/rfc8085
- RFC 7766, DNS Transport over TCP - Implementation Requirements: https://www.rfc-editor.org/rfc/rfc7766.html
- RFC 6762, Multicast DNS: https://www.rfc-editor.org/rfc/rfc6762
- RFC 3550, RTP: A Transport Protocol for Real-Time Applications: https://www.rfc-editor.org/rfc/rfc3550
- RFC 9000, QUIC: A UDP-Based Multiplexed and Secure Transport: https://www.rfc-editor.org/rfc/rfc9000.html
- RFC 9308, Applicability of the QUIC Transport Protocol: https://www.rfc-editor.org/rfc/rfc9308
- curl HTTP/3 documentation: https://curl.se/docs/http3.html
- Local `curl --help all` output for `--http3`, `--http3-only`, and `--alt-svc`

## Issues Found
- The financial-transactions example implied TCP provides exactly-once semantics. Updated it to state that TCP provides reliable ordered transport, while exactly-once processing must still be implemented at the application layer.
- The DNS example claimed a fixed "1.5 RTT TCP handshake" advantage for UDP. Updated it to reflect actual DNS behavior: UDP is commonly used first to avoid connection setup, with TCP used for truncated or larger responses.
- The live-video example grouped QUIC and RTP together as equivalent transport choices for loss-tolerant media. Updated it to the more accurate and common RTP-over-UDP framing.
- The TCP performance section overstated handshake timing by saying TCP needs 1.5 RTT before application data. Updated it to distinguish request arrival at roughly 1 RTT from the first response byte at roughly 1.5 RTT.
- The QUIC section incorrectly described QUIC reliability as "per stream" and described "no kernel TCP state" as an inherent protocol property. Updated it to say QUIC provides reliable streams, ordering within each stream, and avoids head-of-line blocking between streams.
- The QUIC conclusion said QUIC is "the right answer" categorically. Updated it to a narrower, technically accurate recommendation.
- The `grep` example for checking HTTP/3 support was tightened to use `grep -E` with a clearer pattern.

## Review Notes
- The post is technically relevant and salvageable as a practical decision guide.
- Some recommendations remain intentionally simplified for blog readability. In production, transport choice also depends on middlebox behavior, NAT traversal, congestion control, operational constraints, and whether application semantics need idempotency or deduplication beyond transport guarantees.
