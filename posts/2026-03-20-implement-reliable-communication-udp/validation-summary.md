# Validation Summary: How to Implement Reliable Communication Over UDP

## Status
validated

## Post Type
Guide

## Technologies Covered
- UDP
- Python socket API
- Python struct module
- Stop-and-wait ARQ
- Sliding window retransmission
- TCP and QUIC transport behavior

## Sources Consulted
- Python `socket` documentation: https://docs.python.org/3/library/socket.html
- Python `struct` documentation: https://docs.python.org/3/library/struct.html
- RFC 768, User Datagram Protocol: https://www.rfc-editor.org/rfc/rfc768
- RFC 9000, QUIC: A UDP-Based Multiplexed and Secure Transport: https://www.rfc-editor.org/rfc/rfc9000.html
- RFC 9293, Transmission Control Protocol: https://www.rfc-editor.org/rfc/rfc9293

## Issues Found
- The original `recv_reliable()` example ACKed retransmissions but still returned duplicate payloads to the application when an ACK was lost. I updated the receiver to track the next expected sequence number, re-ACK duplicates, and only deliver each sequence once so the stop-and-wait example matches reliable-delivery behavior.
- The original sender accepted any datagram as a potential ACK, and the packet parser raised on short packets without being handled. I updated the example to ignore malformed packets and packets from unexpected source addresses so the sample does not mis-handle unrelated or truncated UDP datagrams.
- The introduction implied QUIC is built on UDP for the same custom-reliability reasons as an application-specific protocol. I tightened that wording to the narrower verified claim that QUIC runs over UDP and implements its own reliability and congestion control.
- The conclusion used “selective acknowledgment” to describe acknowledging and retransmitting only some messages. I corrected this to “selective reliability,” which is the accurate term in this context.
- The sliding-window throughput formula and sample numbers were presented as exact. I changed them to approximate values because they are illustrative upper-bound estimates rather than exact transport throughput calculations.

## Review Notes
- The post is technically correct after these fixes, but it still describes a teaching example rather than a production-ready transport. Real deployments also need congestion control, path MTU and fragmentation strategy, peer validation, and usually authentication or encryption.
