# Validation Summary: How to Configure HAProxy Stick Tables for Session Persistence on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- HAProxy
- HAProxy stick tables
- HAProxy Runtime API / stats socket
- Linux systemd and shell commands

## Sources Consulted
- HAProxy stick tables tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/custom-rules/stick-tables/
- HAProxy 2.8 configuration manual: https://docs.haproxy.org/2.8/configuration.html
- HAProxy Runtime API `show table` reference: https://www.haproxy.com/documentation/haproxy-runtime-api/reference/show-table/
- HAProxy Runtime API `clear table` reference: https://www.haproxy.com/documentation/haproxy-runtime-api/reference/clear-table/
- HAProxy management socket documentation: https://www.haproxy.com/documentation/haproxy-configuration-manual/new/latest/management/
- Local syntax validation with the official `haproxy:2.8` Docker image, running HAProxy 2.8.24.

## Issues Found
- The introduction described stick tables as working at the TCP layer and tracking any connection attribute. Updated it to say stick tables can work at TCP or HTTP layers and can track many connection or request attributes, which is more accurate.
- The description said the post avoids cookies, but one example uses a cookie value as a stick-table key. Updated the description to clarify that the post avoids relying only on load-balancer-inserted cookies.
- HTTP examples used HTTP fetches and `http-request` rules without explicitly setting `mode http`. Added `mode http` to those snippets so they are valid when copied into a configuration that does not already inherit HTTP mode from `defaults`.
- The connection-current example used `http-request track-sc0 src`. Updated it to `tcp-request connection track-sc0 src`, which is the correct tracking point for `conn_cur` and connection-rate counters.
- The multiple-counter example included `conn_cur` while tracking only at HTTP request time. Removed `conn_cur` from that snippet so it matches the request-level tracking shown.
- The bandwidth example described `bytes_out_rate(10s)` as a 10 MB/s limit while the configured threshold applies to the 10-second counter period. Updated the comment to say 10 MB per 10-second period.
- Runtime API commands assumed the HAProxy stats socket already exists. Added comments noting that the commands require a `stats socket` line in the `global` section.

## Review Notes
The corrected snippets were parser-checked with HAProxy 2.8.24 in the official Docker image. The peer synchronization snippet produced only the expected local-peer warning in Docker because the container hostname did not match the configured peer names; HAProxy documentation notes that the local peer name must match the hostname, `-L` value, or `localpeer` setting.
