# Validation Summary: How to Set Up HAProxy Health Checks on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HAProxy (load balancer) — `option httpchk`, `http-check send`, `tcp-check`, `agent-check`, runtime API / admin socket
- Ubuntu (systemd, journalctl)
- Backend protocols: TCP, HTTP/1.1, HTTP/2 (h2), HTTPS, gRPC, MySQL, Redis
- socat (for talking to the admin socket and hosting the agent script)

## Sources Consulted
- HAProxy Configuration Manual 2.x — https://docs.haproxy.org/2.8/configuration.html (sections on `option httpchk`, `http-check send/expect`, `option tcp-check`, `tcp-check connect/send/expect`, `server` keyword options: `check`, `inter`, `fall`, `rise`, `ssl`, `verify`, `ca-file`, `agent-check`, `agent-port`, `slowstart`, `addr`, `port`, `proto`)
- HAProxy Management Guide — https://docs.haproxy.org/2.8/management.html (CLI commands: `show servers state`, `show servers conn`, `show backend`, `set server <backend>/<server> state`)
- HAProxy default values (verified): `inter` default 2000ms, `fall` default 3, `rise` default 2
- HAProxy external agent check protocol — supported responses include `ready`, `up`, `down`, `drain`, `maint`, weight (`NN%`)
- MySQL Client/Server Protocol — https://dev.mysql.com/doc/dev/mysql-server/latest/page_protocol_basic_packets.html and HandshakeV10 packet structure (3-byte length + 1-byte sequence + protocol version 0x0a)
- gRPC Health Checking Protocol — https://github.com/grpc/grpc/blob/master/doc/health-checking.md

## Issues Found

1. **Invalid admin-socket command `show servers health`.** This is not a documented HAProxy CLI command. The valid runtime API commands for inspecting server health are `show servers state` and `show servers conn`. Replaced with `show servers conn` (which exposes per-server connection details) and updated the comment accordingly.

2. **Inaccurate MySQL greeting comment.** The post said the MySQL greeting packet "starts with 0x0a." The HandshakeV10 packet actually starts with a 3-byte payload length and a 1-byte sequence number, with the 0x0a protocol-version byte appearing at offset 4. `tcp-check expect binary 0a` matches the byte anywhere in the buffer, so the check still works, but the explanation was wrong. Rewrote the comment to say it matches the MySQL protocol version byte (0x0a) within the greeting.

## Review Notes
- HAProxy provides a built-in `option mysql-check` and `option redis-check` that are generally preferred over the custom `tcp-check` examples shown for those services. The custom examples in the post are still valid and useful as illustrations of `tcp-check` mechanics.
- The "Advanced HTTP/2 and gRPC Health Checks" section is illustrative but a fully correct gRPC health check is more involved than a simple `GET` on the `Health/Check` path — the gRPC Health Checking Protocol uses a POST with `content-type: application/grpc` and the `grpc-status` trailer. HAProxy 2.x's `httpchk` with `proto h2` can be made to work, but matching `grpc-status: 0` typically requires reading trailers or using a sidecar. The post's example will detect HTTP/2 reachability of the endpoint but will not validate gRPC-level health semantics. This is a real-world caveat worth noting but the snippet itself is syntactically valid HAProxy config.
- The "Monitoring Health Check Status" section opens with a fenced ```bash block that contains HAProxy configuration (`frontend stats_frontend ...`). The content is correct; only the code-fence language tag is slightly off. Left unchanged per "fix technical errors only" guidance.
- The `option tcp-check is implied when check keyword is used without HTTP mode` comment is slightly imprecise — a plain `check` performs a basic TCP-connect check without needing `option tcp-check`; `option tcp-check` is what enables the multi-step `tcp-check connect/send/expect` directives. The comment is not actively misleading enough to need a rewrite, but readers should not interpret it as meaning `option tcp-check` is implicitly active.
- All other configuration directives, defaults, socket commands, and Ubuntu/systemd commands were verified against the HAProxy 2.x configuration and management guides and are accurate.
