# Validation Summary: How to Configure HAProxy Health Checks for Backend Servers on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- HAProxy
- HAProxy active health checks
- HAProxy agent health checks
- HAProxy runtime API / stats socket
- systemd

## Sources Consulted
- HAProxy 2.4 Configuration Manual: https://docs.haproxy.org/2.4/configuration.html
- HAProxy 2.4 Management Guide: https://docs.haproxy.org/2.4/management.html
- Red Hat Enterprise Linux 9 Package Manifest: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/package_manifest/red_hat_enterprise_linux-9-package_manifest-en-us.pdf

## Issues Found
- The description said the post covered active and passive health checks, but the article covers active HTTP/TCP checks and agent checks, not HAProxy passive health checks. Changed "passive" to "agent".
- The response-body match example used `http-check expect string "status":"ok"`. HAProxy accepts the syntax, but the quotes are parsed as configuration quoting and do not match a literal JSON body such as `{"status":"ok"}`. Changed it to `http-check expect string \"status\":\"ok\"`, which preserves the literal JSON quotes and matches the intended response body.

## Review Notes
- The HAProxy configuration directives, server health-check parameters, agent-check parameters, slowstart behavior, stats socket runtime commands, and `haproxy -c -f` validation command were consistent with the HAProxy 2.4 documentation relevant to RHEL 9.
- The stats socket examples assume the socket is configured and that `socat` is installed. This is operational context rather than an error in the HAProxy commands shown.
