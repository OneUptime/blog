# Validation Summary: How to Configure HAProxy as a TCP/HTTP Proxy on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- HAProxy 2.8
- TCP and HTTP proxying
- Load balancing
- TLS termination
- HAProxy health checks
- HAProxy stats page and Runtime API socket
- rsyslog
- socat

## Sources Consulted
- HAProxy 2.8 Configuration Manual: https://docs.haproxy.org/2.8/configuration.html
- HAProxy 2.8 Management Guide: https://docs.haproxy.org/2.8/management.html
- HAProxy Debian/Ubuntu package instructions: https://haproxy.debian.net/
- HAProxy official Ubuntu package repository page: https://www.haproxy.com/downloads
- HAProxy release/support information: https://www.haproxy.org/
- Ubuntu Noble HAProxy package metadata checked locally with `apt-cache policy haproxy`
- Ubuntu HAProxy 2.8 binary syntax check using extracted package `2.8.16-0ubuntu0.24.04.2`

## Issues Found
- The install section described `ppa:vbernat/haproxy-2.8` as the official HAProxy PPA for the latest stable version. Updated the wording to describe it as the HAProxy Debian/Ubuntu packaging PPA for installing a newer supported branch when needed, and clarified that 2.8 is a supported LTS branch.
- The later Runtime API examples used `/var/run/haproxy/admin.sock`, but the sample `global` configuration did not create that socket. Added `stats socket /var/run/haproxy/admin.sock mode 660 level admin`.
- The Runtime API examples use `socat`, but the install commands did not install it. Added `socat` to the package install command.
- The HTTP health check used the deprecated/unsupported HAProxy 2.8 pattern of appending headers after the `option httpchk` HTTP version string. Replaced it with `option httpchk` plus `http-check send meth GET uri /health ver HTTP/1.1 hdr Host example.com`.
- The shared HTTP defaults included `option forwardfor`, which caused warnings when the TCP frontend/backend snippets were appended to the same configuration. Moved `option forwardfor` to the HTTPS frontend where it applies to HTTP traffic.
- The Redis TCP frontend inherited HTTP logging defaults and generated a TCP-mode warning. Added `option tcplog` to the Redis frontend.

## Review Notes
The corrected HAProxy snippets were extracted from the post, combined, adjusted only for local certificate path and missing system user/group in the isolated test environment, and validated successfully with `haproxy -c`. For production use, database TCP load balancing still requires application-level care around replication, writes, and failover semantics.
