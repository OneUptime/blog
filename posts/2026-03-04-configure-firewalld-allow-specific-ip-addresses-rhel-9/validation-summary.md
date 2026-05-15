# Validation Summary: How to Configure Firewalld to Allow Specific IP Addresses on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- firewalld
- firewall-cmd
- firewalld rich rules
- firewalld zones and source bindings
- firewalld ipsets
- IPv4 and IPv6 firewall filtering

## Sources Consulted
- firewalld rich language manual: https://firewalld.org/documentation/man-pages/firewalld.richlanguage.html
- firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- firewalld zone options documentation: https://firewalld.org/documentation/zone/options
- firewalld connections, interfaces, and sources documentation: https://firewalld.org/documentation/zone/connections-interfaces-and-sources.html
- Red Hat Enterprise Linux 9 firewalld documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- firewalld ipset support note: https://firewalld.org/2015/12/ipset-support

## Issues Found
- The database server example said it removed all default services from the public zone but removed only `ssh` and `dhcpv6-client`. RHEL 9 documentation shows `cockpit` as a default public-zone service in its examples, so the example could leave Cockpit accessible while claiming all defaults were removed. Added `firewall-cmd --zone=public --remove-service=cockpit --permanent`.

## Review Notes
The rich rule syntax, source-based zone binding commands, ipset creation and entry management commands, drop/reject examples, and IPv6 rich rule examples match official firewalld syntax. The local review environment did not have `firewall-cmd` installed, so command verification was performed against official firewalld and Red Hat documentation rather than local `--help` output.
