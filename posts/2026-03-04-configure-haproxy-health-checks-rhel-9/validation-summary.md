# Validation Summary: How to Configure HAProxy Health Checks on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- HAProxy 2.4 health checks
- HAProxy Runtime API / stats socket
- HAProxy mailers and email alerts
- Linux shell commands

## Sources Consulted
- HAProxy 2.4 Configuration Manual: https://docs.haproxy.org/2.4/configuration.html
- HAProxy health checks documentation: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/reliability/health-checks/
- HAProxy Runtime API `show stat`: https://www.haproxy.com/documentation/haproxy-runtime-api/reference/show-stat/
- HAProxy Runtime API `show servers state`: https://www.haproxy.com/documentation/haproxy-runtime-api/reference/show-servers-state/
- HAProxy Runtime API `disable server`: https://www.haproxy.com/documentation/haproxy-runtime-api/reference/disable-server/
- HAProxy Runtime API installation / stats socket setup: https://www.haproxy.com/documentation/haproxy-runtime-api/installation/
- Red Hat Customer Portal note mapping RHEL 9 to HAProxy 2.4 documentation: https://access.redhat.com/solutions/6996272

## Issues Found
- The description and introduction claimed the guide covered custom health checks, but the post only demonstrates TCP and HTTP health checks. Updated those statements to say TCP and HTTP health checks.
- The health-check type diagram labeled "Custom Agent Check"; HAProxy documents this feature as agent checks. Updated the label to "Agent Check".
- The Step 4 header expectation used invalid HAProxy syntax: `http-check expect header Content-Type contains application/json`. Replaced it with the documented `http-check expect hdr name Content-Type value -m sub application/json` form.
- The stats-socket commands assumed `/var/lib/haproxy/stats` existed without stating that the Runtime API socket must be configured there. Added a short note before the commands.
- The Step 8 shell script was described as running when servers change state, but it only polls the Runtime API. Updated the sentence to describe it as a polling script for external monitoring.
- The email alert example used `email-alert level alert` while describing notifications for state changes. HAProxy sends server-up/recovery alerts only at `notice` or lower, so changed it to `email-alert level notice`.

## Review Notes
HAProxy was not installed in the local workspace, so I could not run `haproxy -c` locally. The reviewed snippets were checked against the HAProxy 2.4 documentation used for RHEL 9.
