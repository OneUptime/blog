# Validation Summary: How to Configure HAProxy Layer 4 TCP Load Balancing on IPv4

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- HAProxy
- TCP load balancing
- IPv4 networking
- Redis
- MySQL client
- PostgreSQL
- MQTT

## Sources Consulted
- HAProxy 3.2 Configuration Manual: https://docs.haproxy.org/3.2/configuration.html
- HAProxy 3.2 Management Guide: https://docs.haproxy.org/3.2/management.html
- HAProxy Runtime API `show info`: https://www.haproxy.com/documentation/haproxy-runtime-api/reference/show-info/
- HAProxy Runtime API `show servers state`: https://www.haproxy.com/documentation/haproxy-runtime-api/reference/show-servers-state/
- Redis protocol specification: https://redis.io/docs/latest/develop/reference/protocol-spec/
- Redis `PING` command reference: https://redis.io/docs/latest/commands/ping/
- MySQL client options reference: https://dev.mysql.com/doc/refman/9.6/en/mysql-command-options.html

## Issues Found
- The introduction said HAProxy `tcp` mode is "faster" than `http` mode. I changed this to "has lower overhead" because the documented distinction is that TCP mode avoids layer 7 examination; "faster" is too absolute.
- The custom health-check section described Redis as a protocol that sends a banner on connect. I changed the sentence to describe request/response health checks instead, because the example actively sends `PING` and expects `+PONG`.
- The MQTT example comment said `balance source` means the same client "always" goes to the same broker. I changed it to source-IP hash wording because HAProxy documents that this affinity can change when the set of running servers changes.
- The connection-limits example used `maxconn 100` inside a `backend`, which is not a valid backend directive for limiting total backend connections. I replaced it with a frontend-level `maxconn 100` and kept the valid per-server `maxconn` limits.
- The `timeout queue` comment implied it triggers whenever any `maxconn` is reached. I clarified that it covers time spent waiting for a server connection slot.
- The verification commands using `/run/haproxy/admin.sock` did not mention the prerequisite HAProxy stats/admin socket. I added that note so the commands are not presented as working without the required socket configuration.
- The conclusion said to set `mode tcp` in both `defaults` and each `frontend`/`backend`. I corrected this to reflect HAProxy inheritance from `defaults`, while still noting that explicit per-section `mode tcp` is valid.

## Review Notes
- The post is technically sound after the fixes above.
- The Runtime API commands assume a configured and accessible `stats socket`/admin socket, which is now noted inline.
- HAProxy also provides protocol-specific checks such as `option mysql-check` and `option pgsql-check`; the post's generic TCP checks remain valid, but those protocol-specific checks could be worth mentioning in a future revision if deeper health validation is needed.
