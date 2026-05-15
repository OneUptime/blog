# Validation Summary: How to Configure DNS Logging and Diagnostics with BIND on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- BIND 9 / named
- DNS logging categories and channels
- rndc diagnostics
- logrotate
- BIND statistics channel
- named-checkconf, named-checkzone, and dig

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Setting up and configuring a BIND DNS server": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_networking_infrastructure_services/assembly_setting-up-and-configuring-a-bind-dns-server_networking-infrastructure-services
- BIND 9 Administrator Reference Manual, configuration reference for logging categories and statistics-channels: https://bind9.readthedocs.io/en/latest/reference.html
- BIND 9.18 manual pages for rndc, named-checkconf, and dig: https://bind9.readthedocs.io/en/v9.18.34/manpages.html
- ISC Knowledge Base, "What do +EDC and other letters I see in my query log mean?": https://kb.isc.org/docs/aa-00434
- BIND 9 release notes for external log rotation support in 9.21: https://bind9.readthedocs.io/en/latest/notes.html

## Issues Found
- The original logging example wrote BIND channel files under `/var/log/named`. Red Hat's RHEL 9 BIND logging procedure uses a writable log directory under `/var/named/log`, which avoids SELinux and service access problems on default RHEL systems. Updated all BIND log file paths, the directory creation commands, and the tail/logrotate examples to use `/var/named/log`.
- The post said query logging is disabled by default while the example configured `category queries`, which BIND documents as enabling query logging at startup unless the `querylog` option is set. Added `querylog no;` to the `options` block and clarified that runtime `rndc querylog on/off` controls query logging for this setup.
- The post described `rndc recursing` as viewing recursion depth. BIND documents it as dumping the currently active recursive queries and iterative lookup domains. Updated the wording.
- The post described `rndc trace 3` as tracing a specific query. BIND documents it as setting the server-wide debug level. Updated the wording to "Increase debug logging."
- The logrotate example used `/usr/sbin/rndc reopen`, but RHEL 9's BIND 9.16 does not provide an `rndc reopen` command for log files. Updated the example to use `copytruncate` and corrected the explanatory text. BIND 9.21 introduced `rndc closelogs`, but that is not applicable to RHEL 9's BIND version.
- The post said to add `statistics-channels` to `options`. BIND documents `statistics-channels` as a top-level statement. Updated the instruction accordingly.

## Review Notes
The reviewed commands and configuration are otherwise consistent with BIND documentation. I could not run `named-checkconf` locally because BIND tooling is not installed in this workspace, so syntax validation was performed against official BIND and Red Hat documentation.
