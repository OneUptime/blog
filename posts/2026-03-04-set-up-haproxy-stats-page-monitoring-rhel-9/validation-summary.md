# Validation Summary: How to Set Up HAProxy Stats Page for Monitoring on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- HAProxy statistics dashboard
- HAProxy Runtime API / stats socket
- HAProxy Prometheus exporter
- firewalld
- Bash, curl, socat
- SELinux troubleshooting commands

## Sources Consulted
- HAProxy Statistics dashboard documentation: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/alerts-and-monitoring/statistics/
- HAProxy Configuration Manual, statistics directives and `http-request use-service`: https://docs.haproxy.org/3.2/configuration.html
- HAProxy Management Guide, Runtime API commands including `show stat`, `show info`, and `show servers state`: https://docs.haproxy.org/3.2/management.html
- firewalld `firewall-cmd` manual page: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- Red Hat RHEL 9 HAProxy package reference via errata/package listing: https://access.redhat.com/errata/RHSA-2023:6496

## Issues Found
- The HAProxy stats and Prometheus snippets omitted `mode http`. HAProxy statistics directives and `http-request use-service prometheus-exporter` are HTTP-context features, so each standalone stats/frontend example now explicitly sets `mode http`.
- The stats socket commands assumed `/var/lib/haproxy/stats` exists. Added a commented `stats socket /var/lib/haproxy/stats mode 600 level admin` prerequisite in the socket example so the commands have a configured Runtime API socket to connect to.
- The server status explanation used color mappings that are not the authoritative status values and could be misleading across HAProxy versions/themes. Replaced them with documented status labels: `UP`, `DOWN`, `MAINT`, and `no check`.

## Review Notes
- The remaining commands and configuration directives are consistent with current HAProxy and firewalld documentation.
- The Prometheus exporter example depends on an HAProxy build that includes the built-in Prometheus exporter; RHEL 9 ships HAProxy 2.4 packages where this feature is generally available, but deployments should still confirm with their installed package build if the service is unavailable.
