# Validation Summary: How to Manage Runtime vs Permanent Firewall Rules on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- firewalld
- firewall-cmd
- Runtime and permanent firewall configuration
- firewalld rich rules
- Bash shell commands

## Sources Consulted
- firewalld documentation: Runtime versus Permanent - https://firewalld.org/documentation/configuration/runtime-versus-permanent.html
- firewalld documentation: Reload firewalld - https://firewalld.org/documentation/howto/reload-firewalld.html
- firewalld manual page: firewall-cmd - https://firewalld.org/documentation/man-pages/firewall-cmd
- Red Hat Enterprise Linux 9 documentation: Using and configuring firewalld - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters

## Issues Found
No technical issues found.

## Review Notes
The post accurately describes firewalld's separation between runtime and permanent configuration, including that runtime changes are effective immediately but do not persist across reloads, restarts, or reboots unless saved. The documented uses of `--permanent`, `--reload`, `--complete-reload`, `--runtime-to-permanent`, service and port add/query commands, and rich rule syntax match the official firewalld and RHEL 9 documentation. The local review environment did not have `firewall-cmd` installed, so command verification was performed against official documentation rather than local command execution.
