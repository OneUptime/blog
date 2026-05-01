# Validation Summary: How to Configure firewalld Zones and Services on RHEL

## Status
validated

## Post Type
Guide

## Technologies Covered
- `firewalld`
- Red Hat Enterprise Linux (RHEL)
- Linux firewall management
- `firewall-cmd`
- firewalld rich rules

## Sources Consulted
- Red Hat Enterprise Linux 10, "Using and configuring firewalld": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld
- Red Hat Enterprise Linux 10, "Working with firewalld zones": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/configuring_firewalls_and_packet_filters/working-with-firewalld-zones
- firewalld `firewall-cmd` manual page: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- firewalld rich language manual page: https://firewalld.org/documentation/man-pages/firewalld.richlanguage
- firewalld predefined zones reference: https://firewalld.org/documentation/zone/predefined-zones.html
- firewalld zone examples: https://firewalld.org/documentation/zone/examples.html
- firewalld configuration overview: https://firewalld.org/documentation/man-pages/firewalld.html
- firewalld zone options reference: https://firewalld.org/documentation/zone/options.html

## Issues Found
- The zone behavior table overstated `drop` and `block` by implying all inbound traffic is dropped or rejected. I changed the wording to "unsolicited incoming" to match firewalld's stateful behavior, where traffic related to established outbound connections is still accepted.
- The `external` and `home` zone rows were incomplete. I updated them to reflect the documented defaults more accurately, including IPv4 masquerading on `external` and `dhcpv6-client` on `home`.
- The services section implied that all service definitions live under `/usr/lib/firewalld/services/`. I changed this to "Predefined services" so the statement matches the upstream documentation.
- The rich-rule example labeled "Allow SSH only from a specific subnet" was incorrect in the `public` zone because `public` allows `ssh` by default. I added `--remove-service=ssh --permanent` before the rich rule so the example actually restricts SSH as described.
- The SSH rate-limit example had the same problem in the `public` zone. I clarified that it applies after removing the default `ssh` service.
- The masquerading section was too broad because firewalld's zone masquerade setting is for IPv4. I changed the wording to "IPv4 masquerading (NAT)" to match the official documentation.
- The introduction and conclusion referenced "iptables rules" directly. I changed both lines to "low-level firewall rules" because modern firewalld uses the `nftables` backend by default.

## Review Notes
- The `external` zone already has IPv4 masquerading enabled in the predefined upstream zone definition, so the `--add-masquerade` example is valid but may be redundant on a stock configuration.
- On RHEL systems managed by NetworkManager, persistent interface-to-zone assignment is often handled through the connection profile. The `firewall-cmd --change-interface=... --permanent` example is still supported and documented.
