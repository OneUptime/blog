# Validation Summary: How to Use IPv6 UDP Sockets in Node.js

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Node.js
- JavaScript
- UDP
- IPv6
- Node.js `dgram` sockets
- IPv6 multicast

## Sources Consulted
- Node.js UDP/datagram sockets documentation: https://nodejs.org/api/dgram.html
- Node.js OS module documentation (`os.networkInterfaces()`): https://nodejs.org/api/os.html
- libuv UDP handle documentation: https://docs.libuv.org/en/v1.x/udp.html
- libuv networking guide: https://docs.libuv.org/en/v1.x/guide/networking.html
- libuv scoped-interface utilities documentation: https://docs.libuv.org/en/v1.x/misc.html
- RFC 4007, IPv6 Scoped Address Architecture: https://datatracker.ietf.org/doc/html/rfc4007

## Issues Found
- The conclusion incorrectly stated that `dgram.createSocket('udp6')` is IPv6-only by default. Node.js documents dual-stack behavior unless `ipv6Only: true` is set, so I corrected the explanation and updated the dual-socket example to create the IPv6 socket with `{ type: 'udp6', ipv6Only: true }`.
- The client example used `2001:db8::1`, which is a reserved documentation prefix and would not work as a local echo example. I changed it to `::1` so the sample matches the server example and works on the same host.
- The client example always ran its timeout and could call `client.close()` after the socket had already been closed, which throws `ERR_SOCKET_DGRAM_NOT_RUNNING` in current Node.js. I fixed that by clearing the timeout on send failure and on successful response.
- The multicast receiver used a bare interface name in `addMembership('ff02::1', ifaceName)`. In current Node.js/libuv, IPv6 multicast membership requires an interface address or a scoped IPv6 interface identifier rather than a bare interface name, so I changed the receiver to compute a scoped identifier such as `::%eth0` (or `::%2` on Windows).
- The multicast sender hardcoded `eth0` and an explicit `%eth0` destination scope. I replaced that with interface detection plus `setMulticastInterface()` so the example is portable across modern interface naming schemes while keeping an explicit zone-ID note in the conclusion.

## Review Notes
- Verified locally on Node.js v22.22.0 that binding `udp4` and `udp6` sockets to the same port fails with `EADDRINUSE` unless the IPv6 socket uses `ipv6Only: true`.
- Verified locally on Node.js v22.22.0 that the original timeout flow can throw `ERR_SOCKET_DGRAM_NOT_RUNNING` after a successful response.
- Verified locally on Node.js v22.22.0 that `addMembership('ff02::1', bareInterfaceName)` throws `EINVAL`, while a scoped IPv6 interface identifier such as `::%wlp0s20f3` succeeds.
- The post’s CommonJS `require('dgram')` style is still valid in current Node.js.
