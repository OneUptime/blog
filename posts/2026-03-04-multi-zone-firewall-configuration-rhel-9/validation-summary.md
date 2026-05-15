# Validation Summary: How to Set Up a Multi-Zone Firewall Configuration on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- firewalld
- firewall-cmd
- firewalld zones
- firewalld rich rules

## Sources Consulted
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd
- firewalld rich language manual: https://firewalld.org/documentation/man-pages/firewalld.richlanguage
- firewalld predefined zones documentation: https://firewalld.org/documentation/zone/predefined-zones.html
- firewalld connections, interfaces, and sources documentation: https://firewalld.org/documentation/zone/connections-interfaces-and-sources
- firewalld default zone documentation: https://firewalld.org/documentation/zone/default-zone.html
- Red Hat Enterprise Linux 9 Configuring firewalls and packet filters: https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/pdf/configuring_firewalls_and_packet_filters/red_hat_enterprise_linux-9-configuring_firewalls_and_packet_filters-en-us.pdf

## Issues Found
- The source-based zone example described the operation as routing traffic to the trusted zone. Changed "Route traffic" to "Assign traffic" because `--add-source` binds/classifies matching source traffic to a firewalld zone; it does not perform IP routing.
- The troubleshooting note for an unexpectedly accessible service said to check the default zone, but the example command inspected the `public` zone. Changed the note to check the interface's zone, matching the command and firewalld zone behavior.

## Review Notes
- The `firewall-cmd` options used in the post, including `--change-interface`, `--add-service`, `--remove-service`, `--add-port`, `--remove-port`, `--add-rich-rule`, `--set-default-zone`, `--add-source`, and zone listing commands, are valid and current.
- The predefined `trusted`, `public`, `internal`, `dmz`, and `drop` zone descriptions align with firewalld and RHEL 9 documentation.
- `firewall-cmd` was not installed in this local workspace, so CLI behavior was verified against official documentation rather than local command execution.
