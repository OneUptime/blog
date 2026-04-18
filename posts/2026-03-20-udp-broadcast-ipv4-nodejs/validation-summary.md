# Validation Summary: How to Send UDP Broadcast Messages over IPv4 in Node.js

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Node.js `dgram` module
- UDP (User Datagram Protocol)
- IPv4 broadcast (limited `255.255.255.255` and directed subnet broadcast)
- SO_BROADCAST socket option
- Service discovery pattern (similar to mDNS/SSDP)

## Sources Consulted
- Node.js `dgram` API documentation: https://nodejs.org/api/dgram.html
- Linux `socket(7)` man page (SO_BROADCAST semantics): https://man7.org/linux/man-pages/man7/socket.7.html
- RFC 919 (Broadcasting Internet Datagrams) — limited broadcast `255.255.255.255`
- RFC 922 (Broadcasting Internet Datagrams in the Presence of Subnets) — directed subnet broadcast

## Issues Found
- **Misleading comment on receiver's `setBroadcast(true)` call.** The original code had `// Enable broadcast receiving` next to `receiver.setBroadcast(true)`. Per Node.js docs and the underlying `SO_BROADCAST` socket option (Linux/Windows), this flag only governs **sending** broadcasts; it is not required to receive them. A bound socket receives broadcasts addressed to its port regardless of this flag. I updated the comment to: `// Not required to receive broadcasts; only needed to send them.` The call itself was left in place (it is harmless and permits the receiver to also send broadcast packets if needed).

## Review Notes
- `dgram.createSocket('udp4')`, `socket.bind()`, `socket.send(buf, port, address, cb)`, `socket.setBroadcast()`, `socket.address()`, and the `message`/`error`/`listening` events all match the current Node.js `dgram` API.
- `setBroadcast()` is correctly called inside the `bind` callback (required — it throws `EBADF` on an unbound socket).
- Broadcast address semantics are correctly described: `192.168.1.255` is the directed broadcast for a `192.168.1.0/24` subnet, and `255.255.255.255` is the limited broadcast (never forwarded by routers).
- Binding the receiver with `receiver.bind(PORT)` binds to `0.0.0.0` (INADDR_ANY) by default, which correctly allows receipt of broadcasts on all interfaces.
- The unicast reply pattern shown in the receiver and the Mermaid diagram is the standard service-discovery approach.
- Minor future improvement (not a technical error): the hardcoded `host: '192.168.1.50'` reply address could be determined dynamically from `os.networkInterfaces()` rather than hardcoded.
