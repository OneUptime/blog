# Validation Summary: How to Create Custom Firewalld Services and Zones on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- firewalld
- firewall-cmd
- firewalld service XML files
- firewalld zone XML files
- Linux firewall zones and services

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Using and configuring firewalld": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- firewalld upstream manual, firewall-cmd: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- firewalld upstream manual, firewalld.service: https://firewalld.org/documentation/man-pages/firewalld.service.html
- firewalld upstream manual, firewalld.zone: https://firewalld.org/documentation/man-pages/firewalld.zone.html
- firewalld zone options documentation: https://firewalld.org/documentation/zone/options.html
- firewalld zone configuration documentation: https://firewalld.org/documentation/zone/configuration-of-zones.html
- firewalld service overview documentation: https://firewalld.org/documentation/service/

## Issues Found
- The section titled "Custom Service with Protocols and Modules" did not actually show modules, and the upstream firewalld service manual marks the `module` element as deprecated in favor of `helper`. Changed the heading and lead-in text to describe the actual example: TCP/UDP ports and port ranges.
- The zone target comment for `default` said it used the default behavior of "reject". The upstream `firewall-cmd` manual says `default` is similar to `REJECT`, but implicitly allows ICMP packets. Updated the comment to reflect that distinction.

## Review Notes
The remaining `firewall-cmd` examples, service XML snippets, zone XML snippets, file locations, and reload workflow are consistent with Red Hat Enterprise Linux 9 and upstream firewalld documentation. The XML file approach is valid, but future edits could mention `firewall-cmd --permanent --new-service-from-file` and `--new-zone-from-file` as alternatives when importing prepared XML files.
