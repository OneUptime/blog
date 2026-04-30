# Validation Summary: How to Configure Multiple HAProxy Frontends on Different IPv4 Addresses

## Status
validated

## Post Type
Guide

## Technologies Covered
- HAProxy
- IPv4 networking
- TCP and HTTP proxy configuration
- Linux service management with `systemctl`
- Linux socket inspection with `ss`
- HAProxy Runtime API via `socat`

## Sources Consulted
- HAProxy 3.2 Configuration Manual: https://docs.haproxy.org/3.2/configuration.html
- HAProxy 3.2 Management Guide: https://docs.haproxy.org/3.2/management.html
- Local `systemctl --help` output
- Local `ss --help` output

## Issues Found
- The post used `show stat` against `/var/run/haproxy/admin.sock` without configuring a HAProxy stats socket. I added `stats socket /var/run/haproxy/admin.sock mode 660 level admin` to the `global` section so the Runtime API example matches the configuration.
- The `db-proxy` frontend switched to `mode tcp` but inherited `option httplog` from `defaults`. I added `option tcplog` to the TCP frontend so its logging matches HAProxy's documented TCP logging behavior.
- The `socat` example was updated to the documented `socat /var/run/haproxy/admin.sock stdio` form for the HAProxy Runtime API command.

## Review Notes
- The post is technically valid after the fixes above.
- Configuration directives and Runtime API usage were checked against the current HAProxy 3.2 documentation.
- The `haproxy` binary was not installed in this workspace, so the sample configuration was not syntax-checked locally with `haproxy -c`.
- The example `stats auth admin:secret` credential is acceptable for demonstration, but it should be replaced with a real secret or userlist-based auth in production.
