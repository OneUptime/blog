# Validation Summary: How to Configure DNS Views and ACLs on RHEL with BIND

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- BIND 9
- DNS views
- BIND ACLs
- DNS zone files
- systemd service management

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Setting up and configuring a BIND DNS server": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_networking_infrastructure_services/assembly_setting-up-and-configuring-a-bind-dns-server_networking-infrastructure-services
- BIND 9 Administrator Reference Manual, configuration reference for ACLs, views, zones, and TSIG key scoping: https://bind9.readthedocs.io/en/v9.21.14/reference.html
- Red Hat Enterprise Linux 9 documentation, BIND custom logging and SELinux context guidance: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/working_with_dns_in_identity_management/customizing-bind-logging_working-with-dns-in-identity-management

## Issues Found
- The logging examples wrote to `/var/log/named/default.log`, but the post only created and chowned the directory. On RHEL with SELinux enforcing, custom `/var/log/named` logging can require additional SELinux context configuration. Changed the examples to use `/var/named/log/default.log` and updated the directory creation command to match Red Hat's BIND logging guidance.
- The multi-view `named.conf` example declared a reverse zone file at `views/internal/192.168.1.rev`, but the post never created that zone file. Removed the unused reverse zone declaration so the provided configuration and file creation steps are consistent.
- The TSIG rule stated that key and server statements must be inside the appropriate view. BIND supports top-level key/server configuration for global use and view-level configuration for view-specific use. Updated the rule to describe both valid scopes.

## Review Notes
The remaining configuration syntax and commands align with current BIND 9 and RHEL 9 documentation. The examples use documentation-only IP ranges from RFC 5737 for public-facing sample records, which is appropriate for a tutorial but should be replaced with real addresses in production.
