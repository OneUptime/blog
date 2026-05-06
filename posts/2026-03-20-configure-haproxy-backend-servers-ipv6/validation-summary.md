# Validation Summary: How to Configure HAProxy Backend Servers with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- HAProxy
- IPv6
- Load balancing
- HTTP health checks
- TLS/SSL backend connections
- `curl`
- `socat`

## Sources Consulted
- HAProxy 3.2 Configuration Manual: https://docs.haproxy.org/3.2/configuration.html
- HAProxy 3.2 Management Guide: https://docs.haproxy.org/3.2/management.html
- curl tutorial, IPv6 section: https://curl.se/docs/tutorial.html
- curl man page: https://curl.se/docs/manpage.html

## Issues Found
No technical issues found.

## Review Notes
- The post's HAProxy syntax is consistent with the current HAProxy 3.2 configuration and management documentation, including IPv6 server addressing, `option httpchk`, `http-check send`, `backup`, `cookie`, `balance source`, `hash-type consistent`, and the runtime socket examples.
- The HTTPS backend example is valid as written. In deployments where the backend selects certificates by SNI, operators may also need `sni` for traffic and `check-sni` or `http-check connect ... sni ...` for TLS health checks in addition to `verifyhost`.
- A local HAProxy binary was not available in this review environment, so validation was documentation-based rather than a live `haproxy -c` parse.
