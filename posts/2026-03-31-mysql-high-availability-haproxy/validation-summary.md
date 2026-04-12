# Validation Summary: How to Set Up MySQL High Availability with HAProxy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL
- HAProxy (TCP load balancing, health checks, stats page)
- xinetd (custom health check script)
- Keepalived (mentioned for HAProxy redundancy)

## Sources Consulted
- HAProxy official documentation on `stats` directive and mode requirements — https://www.haproxy.com/blog/exploring-the-haproxy-stats-page
- HAProxy community forum on stats in TCP mode — https://discourse.haproxy.org/t/explicitly-disable-stats-on-tcp-mode/854
- HAProxy documentation on `balance first`, `option tcp-check`, `option httpchk`, `rise`/`fall` parameters
- xinetd.conf(5) man page — https://linux.die.net/man/5/xinetd.conf
- Red Hat Bugzilla #90854 on xinetd `type = UNLISTED` requirement — https://bugzilla.redhat.com/show_bug.cgi?id=90854

## Issues Found

1. **Stats page missing `mode http`**: The `listen stats` block inherited `mode tcp` from the `defaults` section. HAProxy's `stats enable` directive requires HTTP mode to function — in TCP mode it is silently ignored and the stats page does not render. Added `mode http` to the `listen stats` block.

2. **xinetd config missing `type = UNLISTED`**: The xinetd service configuration used a custom service name `mysqlchk` on port 9200, but this name is not in `/etc/services`. Without `type = UNLISTED`, xinetd refuses to start the service with the error "service/protocol combination not in /etc/services". Added `type = UNLISTED` to the xinetd config block.

## Review Notes
- The `tcp-check send-binary` hex string in the primary backend configuration is a widely-copied MySQL authentication packet pattern. The packet length field (0x0e = 14 bytes) does not match the actual payload size (37 bytes), making it a technically malformed MySQL protocol packet. However, since no `tcp-check expect` directive follows it, the health check effectively relies only on `tcp-check connect` succeeding. This works in practice but is redundant. HAProxy's built-in `option mysql-check user <username>` directive would be a cleaner alternative for MySQL-specific health checking.
- The `option httpchk GET /` syntax mentioned for the xinetd-based health check is deprecated since HAProxy 2.2 in favor of `option httpchk` + `http-check send meth GET uri /`, but the old syntax still functions in current versions.
- The post correctly recommends pairing HAProxy with Keepalived for eliminating the load balancer as a single point of failure but does not cover Keepalived setup. This is acceptable given the post's scope.
