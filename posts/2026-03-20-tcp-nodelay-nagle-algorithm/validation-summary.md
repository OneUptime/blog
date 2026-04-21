# Validation Summary: How to Set TCP_NODELAY to Disable Nagle's Algorithm in Socket Code

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- TCP and IPv4 sockets
- Nagle's algorithm and TCP_NODELAY
- C/POSIX socket APIs
- Python socket module
- Go net package
- Node.js net module
- Linux TCP_CORK

## Sources Consulted
- RFC 896: Congestion Control in IP/TCP Internetworks - https://www.rfc-editor.org/rfc/rfc896
- RFC 9293: Transmission Control Protocol, section 3.7.4 Nagle Algorithm - https://datatracker.ietf.org/doc/rfc9293/
- RFC 1122: Requirements for Internet Hosts, delayed ACK and Nagle requirements - https://www.ietf.org/rfc/inline-errata/rfc1122.html
- Linux tcp(7) manual page for TCP_NODELAY and TCP_CORK - https://man7.org/linux/man-pages/man7/tcp.7.html
- Linux setsockopt(2) manual page - https://man7.org/linux/man-pages/man2/setsockopt.2.html
- Linux socket(2) manual page - https://man7.org/linux/man-pages/man2/socket.2.html
- Linux inet_pton(3) manual page - https://man7.org/linux/man-pages/man3/inet_pton.3.html
- Python socket module documentation - https://docs.python.org/3/library/socket.html
- Go net.TCPConn.SetNoDelay documentation - https://pkg.go.dev/net#TCPConn.SetNoDelay
- Node.js net.Socket.setNoDelay documentation - https://nodejs.org/api/net.html#socketsetnodelaynodelay

## Issues Found
- Corrected the Nagle algorithm explanation to state that small writes are held when there is already unacknowledged data on the connection. RFC 9293 describes the algorithm as buffering user data under that condition until the outstanding data is acknowledged or a full-sized segment can be sent.
- Replaced the fixed "up to 40ms" delay wording with OS-dependent delayed-ACK wording. RFC 1122 allows delayed ACK behavior below 0.5 seconds, and common stacks often use tens of milliseconds, so a universal 40ms claim was too specific.
- Added missing C headers for `inet_pton`, `struct sockaddr_in`, `htons`, `uint16_t`, and `printf`, so the C snippet has the prototypes and types it uses.
- Clarified the Go example because Go's `net.TCPConn` defaults to no delay; calling `SetNoDelay(true)` is still valid but explicit rather than usually required.
- Reordered the Node.js example so the server starts listening before the client connects, while keeping the documented `socket.setNoDelay(true)` usage.
- Updated the TCP_CORK comment and conclusion to avoid implying that TCP_NODELAY literally flushes every `send()` call or bypasses normal TCP flow control and scheduling.

## Review Notes
The examples remain intentionally minimal and do not include production-grade error handling. `TCP_NODELAY` disables Nagle coalescing, but sends are still subject to normal TCP flow control, congestion control, socket buffers, and operating-system scheduling.
