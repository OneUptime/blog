# Validation Summary: How to Configure Port Forwarding with Firewalld on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- firewalld
- firewall-cmd
- nftables NAT concepts
- Linux IPv4 forwarding and masquerading
- firewalld rich rules

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring NAT by using firewalld": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_firewalls_and_packet_filters/index#configuring-nat-by-using-firewalld
- Red Hat Enterprise Linux 9 documentation, "Using DNAT to forward incoming HTTP traffic": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_firewalls_and_packet_filters/index#using-dnat-to-forward-incoming-http-traffic_configuring-nat-by-using-firewalld
- firewalld firewall-cmd manual, forward-port and masquerade options: https://firewalld.org/documentation/man-pages/firewall-cmd
- firewalld zone options, forward-port and masquerade elements: https://firewalld.org/documentation/zone/options.html
- firewalld rich language manual, forward-port rule syntax: https://firewalld.org/documentation/man-pages/firewalld.richlanguage.html

## Issues Found
- The post stated that remote forwarding requires masquerading to be enabled. Official firewalld documentation treats DNAT with `toaddr` as the forwarding mechanism and notes that IP forwarding is implicitly enabled when `toaddr` is specified. Masquerading is source NAT and is needed only when the backend's routing/return path requires it. Updated the remote forwarding introduction, masquerading step, troubleshooting note, and summary to describe masquerading as conditional rather than mandatory.
- The description mentioned load balancing even though the post correctly says firewalld does not do load balancing. Removed "load balancing" from the description to avoid implying firewalld provides that capability.

## Review Notes
The `firewall-cmd --add-forward-port`, `--remove-forward-port`, `--list-forward-ports`, `--add-masquerade`, and rich-rule examples match the documented syntax. Forward ports created with `--add-forward-port` are IPv4 forward ports; IPv6 forwarding requires rich language rules according to the firewalld manual. The post focuses on IPv4 examples, so no content change was required for that caveat.
