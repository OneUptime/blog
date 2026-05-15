# Validation Summary: How to Configure Split-Horizon DNS with BIND on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- BIND 9 / named
- Split-horizon DNS views
- DNS zone files
- dig, named-checkconf, and named-checkzone
- systemd service management

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Setting up and configuring a BIND DNS server: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_networking_infrastructure_services/assembly_setting-up-and-configuring-a-bind-dns-server_networking-infrastructure-services
- BIND 9 Administrator Reference Manual, Configuration Reference: https://bind9.readthedocs.io/en/stable/reference.html
- BIND 9.16 Administrator Reference Manual, view and zone examples: https://bind9.readthedocs.io/en/v9.16.25/reference.html
- BIND 9 dig manual page: https://bind9.readthedocs.io/en/v9.18.42/manpages.html

## Issues Found
- The logging example wrote to `/var/log/named/default.log` and only changed ownership. On RHEL with SELinux enforcing, Red Hat's BIND guidance uses a writable directory under `/var/named/log/` for named-managed logs. Changed the log file path to `/var/named/log/default.log`, updated the directory creation and ownership commands, added `chmod 700`, and updated the `tail` command.
- The validation commands checked only the two forward zones even though the tutorial creates an internal reverse zone. Added `named-checkzone 1.168.192.in-addr.arpa /var/named/internal/192.168.1.rev`.
- The external-view test implied that querying `@203.0.113.10` could simulate an external client. BIND view matching is based on the client source address via `match-clients`, so the test must be run from a non-internal client or use `dig -b` with a non-internal source address on a host that owns that address. Updated the text and example accordingly.
- The consideration "Every zone must be defined in every view" was too broad. BIND views are independent, but only zones needed by clients in a given view must be defined there. Reworded the note to avoid overstating the requirement.

## Review Notes
The remaining examples use documentation-range IP addresses and a placeholder `company.com` domain, which is appropriate for an illustrative tutorial but must be replaced in a real deployment. The local review environment did not have BIND utilities installed, so command behavior was checked against official Red Hat and ISC BIND documentation rather than by executing `named-checkconf` or `named-checkzone`.
