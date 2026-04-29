# Validation Summary: How to Create IPv6 Sockets in Node.js

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Node.js
- `net` module
- `dgram` module
- `os` module
- IPv6
- TCP
- UDP
- Dual-stack networking

## Sources Consulted
- Node.js `net` API documentation: https://nodejs.org/api/net.html
- Node.js `dgram` API documentation: https://nodejs.org/api/dgram.html
- Node.js `os` API documentation: https://nodejs.org/api/os.html
- IANA Service Name and Transport Protocol Port Number Registry (`mdns` / port `5353`): https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml?search=mdns

## Issues Found
- The introduction incorrectly implied that Node.js TCP sockets use a `'tcp6'` type string. I changed this to the documented TCP approach: bind or listen on an IPv6 address and use `family: 6` for IPv6 client connections.
- The IPv6 TCP and dual-stack server notes described dual-stack behavior too loosely. I clarified them to match the documented `ipv6Only` behavior: the default is `false`, and IPv4 clients can appear as IPv4-mapped IPv6 addresses on dual-stack systems.
- The UDP server and client used port `5353`, which is the registered mDNS port and can already be in use on many systems. I changed both examples to use `41234` to make the example safer to run.
- The UDP client left its timeout active after success or send failure, which could keep the process alive unnecessarily and fire after the promise had already settled. I added timeout cleanup and socket error handling.

## Review Notes
- The code examples were checked against current Node.js documentation and exercised locally with Node.js `v22.22.0`.
- In current Node.js releases, `socket.remoteFamily`, `rinfo.family`, and `os.networkInterfaces()` report address families as strings such as `'IPv4'` and `'IPv6'`.
