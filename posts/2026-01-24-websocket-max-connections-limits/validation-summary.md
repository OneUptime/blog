# Validation Summary: How to Fix 'Max Connections' WebSocket Limits

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- WebSocket
- Node.js
- ws
- Socket.IO
- Linux sysctl and process limits
- systemd service limits
- iproute2 ss
- HAProxy
- Prometheus prom-client

## Sources Consulted
- Node.js cluster documentation: https://nodejs.org/api/cluster.html
- Node.js net server.listen documentation: https://nodejs.org/api/net.html
- ws API documentation: https://github.com/websockets/ws/blob/master/doc/ws.md
- Socket.IO cluster adapter documentation: https://socket.io/docs/v4/cluster-adapter/
- Socket.IO server options documentation: https://socket.io/docs/v4/server-options/
- Socket.IO multiple nodes documentation: https://socket.io/docs/v4/using-multiple-nodes/
- HAProxy configuration manual: https://docs.haproxy.org/2.8/configuration.html
- HAProxy WebSocket configuration tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/protocol-support/websocket/
- Linux kernel sysctl fs documentation: https://docs.kernel.org/admin-guide/sysctl/fs.html
- Linux kernel IP sysctl documentation: https://docs.kernel.org/networking/ip-sysctl.html
- systemd.exec documentation: https://www.freedesktop.org/software/systemd/man/systemd.exec.html
- prom-client documentation: https://github.com/siimon/prom-client
- Local command help for `ss` and `sysctl`

## Issues Found
- The monitoring script counted the `ss` header line as a connection. Changed the relevant `ss` commands to use `-H` so counts and state summaries exclude headers.
- The top-IP monitoring command used a simple colon split that does not handle bracketed IPv6 addresses well. Replaced it with a `sed` expression that strips a trailing port while preserving the address.
- The Node.js examples used `cluster.isMaster`, which is deprecated in current Node.js documentation. Replaced it with `cluster.isPrimary`.
- The `ws` example created a WebSocket server with `server` while also manually calling `handleUpgrade()`. Changed the WebSocket server to `noServer: true`, which matches the documented manual-upgrade pattern.
- The `ws` example removed connection bookkeeping in several paths before `close`, which could double-decrement per-IP counts when a close event followed. Added a guarded `removeConnection()` helper and let close handling perform the cleanup.
- The Node.js `server.listen()` call passed `{ backlog }` as the second argument after the port, which does not match the documented overloads. Changed it to the options-object form with `port` and `backlog`.
- The per-worker Node.js connection limit could become fractional. Wrapped it in `Math.ceil()`.
- The Socket.IO cluster example used `createAdapter()` in workers but did not call `setupPrimary()` in the primary process. Added the documented `setupPrimary()` call and import.
- The Socket.IO example declared `maxConnections` but did not apply it. Set `httpServer.maxConnections` per worker.
- The Socket.IO example enabled `connectionStateRecovery` with the cluster adapter, but the current Socket.IO cluster adapter documentation says connection state recovery is not supported. Removed that option from the clustered example.
- The HAProxy WebSocket ACL matched the `Connection` header only when it exactly equaled `upgrade`. Changed the ACLs to require `Upgrade: websocket` and a `Connection` header containing the `upgrade` token.

## Review Notes
- JavaScript snippets were syntax-checked locally with Node.js v22.22.0 after edits.
- HAProxy was not installed in the local environment, so the HAProxy snippet was reviewed against the official documentation rather than parsed with `haproxy -c`.
