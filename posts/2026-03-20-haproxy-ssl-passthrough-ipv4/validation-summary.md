# Validation Summary: How to Configure HAProxy SSL Passthrough for IPv4 Backend Servers

## Status
validated

## Post Type
Guide

## Technologies Covered
- HAProxy
- TLS / SSL passthrough
- TCP load balancing
- Server Name Indication (SNI)
- OpenSSL CLI

## Sources Consulted
- HAProxy Configuration Manual 3.2: https://docs.haproxy.org/3.2/configuration.html
- HAProxy health checks tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/reliability/health-checks/
- HAProxy PROXY protocol tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/client-ip-preservation/enable-proxy-protocol/
- OpenSSL `s_client` manual: https://docs.openssl.org/master/man1/openssl-s_client/
- OpenSSL `x509` manual: https://docs.openssl.org/3.3/man1/openssl-x509/

## Issues Found
- The post used `req_ssl_sni` and `req_ssl_hello_type`, which are deprecated aliases in current HAProxy documentation. I replaced them with `req.ssl_sni` and `req.ssl_hello_type`.
- The mixed passthrough/termination example attempted to send traffic to a frontend via `default_backend`, which is not valid HAProxy configuration. I corrected the example to hand traffic to a loopback TLS-terminating frontend through a TCP backend, using `send-proxy-v2` and `accept-proxy`.
- The health-check guidance was too absolute. HAProxy can perform TLS-aware HTTP health checks with directives such as `http-check connect ssl`, even when client traffic itself is passed through unchanged. I corrected the example and the limitations table to reflect that nuance.

## Review Notes
- `haproxy` was not installed in the local environment, so validation was performed against official HAProxy documentation rather than a local `haproxy -c` syntax check.
- The OpenSSL commands in the post are valid for checking SNI-based routing and certificate subjects.
