# Validation Summary: How to Configure HAProxy Sticky Sessions on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- HAProxy
- HAProxy persistence cookies
- HAProxy source hashing
- HAProxy stick tables
- HAProxy Runtime API
- systemd
- curl
- socat

## Sources Consulted
- HAProxy Configuration Manual, latest: https://www.haproxy.com/documentation/haproxy-configuration-manual/latest/
- HAProxy Configuration Manual, version 3.3: https://docs.haproxy.org/3.3/configuration.html
- HAProxy Runtime API `show stat` reference: https://www.haproxy.com/documentation/haproxy-runtime-api/reference/show-stat/
- HAProxy Management Guide, version 2.7, `show table`: https://docs.haproxy.org/2.7/management.html
- HAProxy management documentation for Runtime API stats socket setup: https://www.haproxy.com/documentation/haproxy-configuration-manual/new/latest/management/

## Issues Found
- The explanation of `nocache` said it adds `Cache-Control: nocache`. HAProxy documents `nocache` as marking cacheable responses non-cacheable when a persistence cookie is inserted, so the wording was corrected without asserting a specific malformed header value.
- The application cookie section said `prefix` appends the server identifier. HAProxy `prefix` mode prefixes the server identifier and delimiter to the existing cookie value, so this was corrected.
- The `option redispatch` explanation said clients get an error without it. HAProxy documents `redispatch` as allowing persistence to be broken and the request retried elsewhere after connection failure, so the wording was made conditional and more precise.
- The cookie options table described `dynamic` as allowing cookie values to change at runtime. HAProxy `dynamic` generates per-server cookie values using the server address, port, and `dynamic-cookie-key`, so the table entry was corrected.
- The Runtime API examples assumed `/var/lib/haproxy/stats` existed. HAProxy stats sockets must be configured explicitly, so the examples now state that the socket must be enabled at that path.

## Review Notes
The HAProxy snippets are partial backend examples and assume the surrounding configuration provides an HTTP-capable proxy/defaults section, which is common for web load balancing. The stats socket path is valid if configured, but RHEL installations may use a different path depending on the local HAProxy configuration.
