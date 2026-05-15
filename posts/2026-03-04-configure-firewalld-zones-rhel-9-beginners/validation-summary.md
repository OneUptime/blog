# Validation Summary: How to Configure Firewalld Zones on RHEL for Beginners

## Status
validated

## Post Type
Tutorial / beginner guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- firewalld
- firewall-cmd
- systemd
- Linux firewall zones and services

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Using and configuring firewalld: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- firewalld official documentation: Predefined Zones: https://firewalld.org/documentation/zone/predefined-zones.html
- firewalld official manual page: firewall-cmd: https://firewalld.org/documentation/man-pages/firewall-cmd
- firewalld upstream predefined zone XML files: https://github.com/firewalld/firewalld/tree/main/config/zones

## Issues Found
- The default-zone table referred to `DHCP client` for several zones. The predefined firewalld service used in the default zone files is `dhcpv6-client`, so the table now says `DHCPv6 client`.
- The `home` zone table entry said `Samba`, but the default predefined service is `samba-client`. The wording now matches the firewalld service name.
- The `block` and `drop` descriptions said all incoming traffic is rejected or dropped. Official firewalld zone descriptions refer to unsolicited incoming packets while allowing traffic related to outgoing connections, so the wording now says `unsolicited incoming`.

## Review Notes
The `firewall-cmd` examples use valid current options, including `--get-default-zone`, `--get-active-zones`, `--get-zones`, `--list-all`, `--change-interface`, `--set-default-zone`, `--add-service`, `--remove-service`, `--add-port`, `--remove-port`, `--runtime-to-permanent`, `--reload`, and `--state`. The post correctly explains runtime versus permanent configuration and that `--set-default-zone` persists without needing `--permanent`.
