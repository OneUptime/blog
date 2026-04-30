# Validation Summary: How to Set Up HAProxy Active Health Checks for IPv4 Backend Servers

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- HAProxy
- HAProxy health checks
- HTTP health checks
- TCP health checks
- MySQL
- Redis
- Linux system logging
- `socat`

## Sources Consulted
- HAProxy Documentation Converter: https://docs.haproxy.org/
- HAProxy 2.8 Configuration Manual, sections covering `option httpchk`, `http-check send`, `http-check expect`, `option mysql-check`, `option redis-check`, and `option log-health-checks`: https://docs.haproxy.org/2.8/configuration.html
- HAProxy 3.2 Management Guide, sections covering the Runtime API, `set server <backend>/<server> state`, and `show servers state`: https://docs.haproxy.org/3.2/management.html

## Issues Found
- The MySQL example used a generic `tcp-check expect binary 5b` probe and described it as a MySQL greeting check. That is not the documented HAProxy MySQL health-check mechanism and is not a reliable protocol-level validation. I replaced it with HAProxy's built-in `option mysql-check user haproxy`, which the official documentation describes for MySQL backends. I also noted the documented requirement for an authorized passwordless MySQL user.

## Review Notes
- The HTTP health-check examples are technically valid as written. HAProxy documents that `option httpchk` upgrades the default TCP connect check into an HTTP request, and `http-check send` plus `http-check expect` are the current directives for customizing the request and response validation.
- The Redis example is valid, though HAProxy also provides a built-in `option redis-check` for a simple `PING`/`+PONG` check.
- The runtime socket examples assume the HAProxy admin socket is already configured and accessible at `/run/haproxy/admin.sock`; that path is deployment-specific, but the commands themselves match the documented Runtime API workflow.
