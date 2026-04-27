# Validation Summary: How to Configure HAProxy Load Balancing on pfSense for IPv4

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- pfSense (firewall/router platform)
- HAProxy (Layer 7 load balancer / reverse proxy)
- HTTP/HTTPS load balancing
- SSL/TLS termination
- ACL-based routing

## Sources Consulted
- HAProxy Configuration Manual (https://docs.haproxy.org/2.8/configuration.html) — verified `global`, `defaults`, `frontend`, `backend` directives; `balance roundrobin`; `option httpchk`; `option httplog`; `option forwardfor`; `tune.ssl.default-dh-param`; server `check inter` syntax
- pfSense HAProxy package documentation (https://docs.netgate.com/pfsense/en/latest/packages/haproxy.html) — verified GUI navigation paths (Services > HAProxy > Backend/Frontend), package name, and stats interface
- HAProxy Stats page documentation — verified `/haproxy?stats` URL pattern is the conventional stats endpoint

## Issues Found
- The "HTTPS Termination" code block was tagged with the ```sql language hint, but the contents are GUI field descriptions, not SQL. Changed the fence to ```text to reflect the actual content type.

## Review Notes
- The `haproxy` package name is correct for pfSense; `haproxy-devel` is also available as a development variant but `haproxy` (stable) is the appropriate default for this tutorial.
- The HAProxy configuration shown is syntactically valid and uses current (non-deprecated) directives.
- The stats port (9000) shown for the stats URL is a common convention but is user-configurable in the pfSense HAProxy "Stats" tab — readers should confirm the port they configured.
- `tune.ssl.default-dh-param 2048` is valid; modern HAProxy supports up to 4096-bit DH parameters and ECDHE is generally preferred, but 2048 remains acceptable as a baseline.
- The `option forwardfor` directive correctly preserves client IPs in the `X-Forwarded-For` header sent to backends.
