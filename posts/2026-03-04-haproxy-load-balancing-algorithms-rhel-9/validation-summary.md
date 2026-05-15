# Validation Summary: How to Configure HAProxy Load Balancing Algorithms on RHEL

## Status
validated

## Post Type
Guide

## Technologies Covered
- Red Hat Enterprise Linux
- HAProxy
- HAProxy backend load balancing algorithms
- HAProxy server weights
- HAProxy runtime statistics socket
- systemd service reloads

## Sources Consulted
- HAProxy 2.4 Configuration Manual: https://docs.haproxy.org/2.4/configuration.html
- HAProxy latest Configuration Manual: https://docs.haproxy.org/3.3/configuration.html
- HAProxy Enterprise Management documentation for runtime API/socket examples: https://www.haproxy.com/documentation/haproxy-configuration-manual/new/latest/management/
- Red Hat Enterprise Linux 9 Package Manifest for HAProxy package presence/version family: https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/pdf/package_manifest/red_hat_enterprise_linux-9-package_manifest-en-us.pdf

## Issues Found
- The static round robin section said the distribution is computed at startup and cannot change at runtime. HAProxy documents `static-rr` as static with runtime server weight changes having no effect, while the server map can be recomputed when a server comes back up. Updated the wording to focus on runtime weight changes.
- The source IP hash section said the same client IP always goes to the same server. HAProxy documents this as true only while the set of running servers remains unchanged. Updated the wording and the limitation to note that many clients may be redistributed when servers go up or down.
- The URI hash and URL parameter hash examples used absolute "always" wording. HAProxy documents these hash algorithms as stable only while the set of running servers remains unchanged. Updated those statements accordingly.
- The weights section said any algorithm can be combined with server weights. HAProxy has algorithms that ignore weights, such as `first`; the post's examples use weighted-capable algorithms. Updated the wording to "These algorithms" for accuracy.

## Review Notes
The HAProxy configuration snippets use valid `balance` and `server` syntax for the algorithms shown. The `random(2)` explanation matches HAProxy's documented Power of Two Random Choices behavior. The stats socket command is syntactically valid, but it assumes the runtime socket has been configured at `/var/lib/haproxy/stats`; deployments that use another socket path will need to adjust it.
