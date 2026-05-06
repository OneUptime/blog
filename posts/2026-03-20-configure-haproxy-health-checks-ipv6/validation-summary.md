# Validation Summary: How to Configure HAProxy Health Checks over IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- HAProxy
- IPv6
- HTTP and HTTPS health checks
- HAProxy agent checks
- HAProxy Runtime API and stats socket
- socat

## Sources Consulted
- HAProxy 3.2 Configuration Manual: https://docs.haproxy.org/3.2/configuration.html
- HAProxy 3.2 Management Guide: https://docs.haproxy.org/3.2/management.html
- HAProxy Health Checks tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/reliability/health-checks/
- RFC 4291: IP Version 6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291
- RFC 3986: Uniform Resource Identifier (URI): Generic Syntax: https://www.rfc-editor.org/rfc/rfc3986.html

## Issues Found
- The simple HTTP health-check example used the deprecated `HTTP/1.1\r\nHost:` workaround inside `option httpchk`. I replaced it with `http-check send hdr Host ...`, which HAProxy documents as the current way to add headers to HTTP health checks.
- The advanced HTTP and stats-page examples used invalid IPv6 literals (`2001:db8::api1`, `2001:db8::api2`, and `[2001:db8::haproxy]`). I replaced them with valid documentation-prefix IPv6 addresses.
- The HTTPS example mixed `option ssl-hello-chk` with HTTP health checks. I removed the legacy SSLv3 hello check, kept the HTTP check, added a proper Host header for HTTP/1.1, and switched the CA reference to `@system-ca` for a portable current example.
- The agent-check example used bracketed IPv6 syntax for `agent-addr` and described `ready` as a health result. I changed it to a plain IPv6 address and updated the returned agent strings/comments to match HAProxy's documented `up`, `down`, and `drain` behavior.

## Review Notes
- Validation was performed against current official HAProxy documentation as of 2026-05-06.
- Local `haproxy` and `socat` binaries were not installed in the workspace, so CLI and parser validation were not possible in this environment.
