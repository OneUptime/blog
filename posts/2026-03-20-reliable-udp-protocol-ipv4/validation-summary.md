# Validation Summary: How to Build a Reliable Protocol on Top of IPv4 UDP

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python 3
- IPv4
- UDP
- Stop-and-wait ARQ
- Binary packet encoding with Python `struct`
- File transfer over UDP

## Sources Consulted
- Python `socket` module documentation: https://docs.python.org/3/library/socket.html
- Python `struct` module documentation: https://docs.python.org/3/library/struct.html
- RFC 768, User Datagram Protocol: https://www.rfc-editor.org/rfc/rfc768
- RFC 8085, UDP Usage Guidelines: https://www.rfc-editor.org/rfc/rfc8085
- RFC 1350, The TFTP Protocol (Revision 2): https://www.rfc-editor.org/rfc/rfc1350
- RFC 9000, QUIC: A UDP-Based Multiplexed and Secure Transport: https://www.rfc-editor.org/rfc/rfc9000.html
- KCP official repository: https://github.com/skywind3000/kcp

## Issues Found
- **Unused imports in the implementation snippet**: `threading` and `time` were imported but never used. Removed them to keep the example technically clean and avoid suggesting dependencies the code does not need.
- **Fixed UDP payload size was too aggressive for a generic IPv4 example**: The post used `MAX_SIZE = 1024` without any PMTU handling. Updated it to `512` so the example stays within the conservative IPv4 EMTU_S guidance from RFC 8085 and is less likely to rely on IP fragmentation.
- **Sender accepted ACKs without validating the peer address**: The original sender logic would accept any matching ACK value from any source. Updated it to keep waiting until timeout unless the ACK comes from the configured destination address, which aligns with RFC 8085 guidance to check sender address/port information.
- **File-transfer demo could report success even if EOF delivery failed**: The original code ignored the return value of `sender.send(b"")`. Updated it to treat EOF-marker failure as a transfer failure.
- **File-transfer demo did not reliably close the socket on early return**: Wrapped the send loop in `try/finally` so `sender.close()` always runs.
- **Conclusion described QUIC as a library**: QUIC is a transport protocol over UDP, not a library by itself. Reworded the sentence to refer to an established UDP-based transport implementation and specifically say "a QUIC library".

## Review Notes
- The core explanation of stop-and-wait ARQ, retransmission on timeout, duplicate detection with sequence numbers, and ACKing duplicates is technically correct. RFC 1350 (TFTP) is a standard example of the same lock-step ACK pattern.
- The Python APIs used in the post are current and correct: `socket.socket(AF_INET, SOCK_DGRAM)`, `settimeout()`, `sendto()`, `recvfrom()`, `struct.pack()`, `struct.unpack_from()`, and `struct.calcsize()`.
- UDP itself remains unreliable and unordered, as described in RFC 768 and RFC 8085. The post is accurate as an educational stop-and-wait reliability layer, but production transports would also need to consider congestion control, PMTU discovery, integrity/authentication, and longer-term handling of delayed duplicates or sequence wraparound.
- The updated code was sanity-checked locally with `python3` on loopback, including multi-packet transfer and EOF delivery.
