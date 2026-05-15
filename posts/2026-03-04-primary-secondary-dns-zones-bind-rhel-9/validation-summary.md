# Validation Summary: How to Set Up Primary and Secondary DNS Zones with BIND on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- BIND 9
- DNS primary and secondary zones
- DNS zone transfers
- `named`, `rndc`, `dig`, and `firewalld`

## Sources Consulted
- Red Hat Enterprise Linux 9: Managing networking infrastructure services, "Setting up and configuring a BIND DNS server" and "Configuring zone transfers among BIND DNS servers": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_networking_infrastructure_services/index
- ISC BIND 9.18 Administrator Reference Manual, configuration reference for `zone`, `type primary`, `type secondary`, `primaries`, `allow-transfer`, `also-notify`, `file`, and `masterfile-format`: https://bind9.readthedocs.io/en/v9.18.21/reference.html
- ISC BIND 9 manual pages for `rndc` command behavior including `reload` and `retransfer`: https://bind9.readthedocs.io/en/v9.18.39/manpages.html
- RFC 1912, Common DNS Operational and Configuration Errors: https://datatracker.ietf.org/doc/html/rfc1912

## Issues Found
- The logging examples wrote to `/var/log/named/default.log` and created `/var/log/named`. On RHEL with SELinux enforcing, Red Hat's BIND logging guidance uses a named-writable directory under `/var/named`, such as `/var/named/log`. Changed both primary and secondary examples to use `/var/named/log/default.log`, create `/var/named/log`, set ownership to `named:named`, and set mode `700`.
- The secondary zone examples used `masters`. Current BIND documentation uses `primaries` for secondary zones, while `masters` is legacy terminology. Changed both secondary zone definitions to `primaries { 192.168.1.10; };`.
- The primary setup validated only the forward zone file. Red Hat's zone setup guidance validates each zone file with `named-checkzone`. Added a `named-checkzone 1.168.192.in-addr.arpa /var/named/192.168.1.rev` command for the reverse zone.
- The architecture explanation said the primary "accepts updates", which could imply dynamic DNS updates. The tutorial edits static zone files and reloads BIND, so the wording was changed to say the primary holds the copy that you update.

## Review Notes
- The tutorial allows transfers by secondary IP address. Red Hat's zone-transfer procedure recommends TSIG keys for authenticated transfers; IP-based `allow-transfer` is syntactically valid, but TSIG would be a stronger production recommendation.
- BIND stores secondary zone files in raw format by default, so transferred files under `/var/named/slaves/` may not be human-readable even when transfers are working correctly.
