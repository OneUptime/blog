# Validation Summary: How to Configure TCP Keepalive Settings for Long-Lived Connections on RHEL 9

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux TCP keepalive sysctl settings
- sysctl.d configuration
- Python socket options
- ss command from iproute2

## Sources Consulted
- Linux tcp(7) manual page: https://man7.org/linux/man-pages/man7/tcp.7.html
- Local tcp(7) manual page for the installed Linux man-pages package
- Local sysctl(8) manual page for procps-ng
- Local sysctl.d(5) manual page for systemd sysctl.d configuration
- Python socket module documentation: https://docs.python.org/3/library/socket.html
- Local `ss --help` output for supported flags

## Issues Found
- The introduction and conclusion implied that setting TCP keepalive sysctls alone maintains all long-lived connections. Linux only sends TCP keepalive probes when the `SO_KEEPALIVE` socket option is enabled. Updated those sentences to state that keepalive behavior applies when keepalive is enabled on the socket.

## Review Notes
The sysctl names, sysctl.d configuration format, `sysctl -p /etc/sysctl.d/99-keepalive.conf` usage, Python socket option names, and `ss -tnoe` timer inspection flags are technically correct. The selected values are examples, not universal recommendations; production values should be chosen based on application timeout requirements and intermediate firewall, NAT, or load balancer idle timeouts.
