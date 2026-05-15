# Validation Summary: How to Configure DNS Failover and High Availability with Unbound on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- DNS resolver configuration
- Unbound
- Keepalived
- VRRP virtual IP failover
- NetworkManager
- systemd

## Sources Consulted
- Red Hat Enterprise Linux 9 Managing networking infrastructure services: https://docs.redhat.com/en-us/documentation/red_hat_enterprise_linux/9/pdf/managing_networking_infrastructure_services/Red_Hat_Enterprise_Linux-9-Managing_networking_infrastructure_services-en-US.pdf
- Red Hat Enterprise Linux 9 Configuring and managing networking: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/
- Red Hat Keepalived overview: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/load_balancer_administration/ch-keepalived-overview-vsa
- Keepalived configuration man page: https://www.keepalived.org/manpage.html
- Unbound User Manual: https://unbound.readthedocs.io/_/downloads/en/latest/pdf/
- Local `resolv.conf(5)` manual page

## Issues Found
- The introduction and prerequisites contained corrupted text: "applications stRHELking", "confiRHELon", and "RHEL more RHEL 9 servers". Updated these to "applications stop working", "configuration", and "Two or more RHEL 9 servers" so the prerequisites and description are technically meaningful.
- The `/etc/resolv.conf` section implied direct file editing is generally persistent on RHEL. Red Hat documents that NetworkManager manages DNS settings in `/etc/resolv.conf` by default, so the text now states that NetworkManager should be used for persistent configuration unless the file is manually managed.
- The Unbound stub-zone section said it forwards zones to multiple servers. Unbound stub zones are for querying authoritative servers, while forward zones are for forwarding to recursive resolvers. Updated the wording to describe querying multiple authoritative servers for the zone.
- The Unbound configuration snippet was labeled as YAML even though `unbound.conf` uses Unbound's own configuration syntax. Changed the code fence to plain text.
- The monitoring commands used `unbound-control` without noting that remote control must be enabled. Added a short condition because Unbound documents `control-enable` as disabled by default unless configured.
- Removed a stray trailing "RHEL" at the end of the post.

## Review Notes
- The keepalived VRRP example is syntactically consistent with keepalived documentation: `vrrp_script`, `track_script`, negative script weight, `virtual_router_id`, `priority`, `advert_int`, and `virtual_ipaddress` are valid directives.
- The resolver behavior is accurate: glibc tries configured name servers in order and moves to the next server after timeout, repeating until retry limits are reached.
- The example uses `eth0`; on many RHEL 9 systems predictable interface names such as `ens192` or `enp1s0` are more common, so readers must replace the interface name with the actual DNS server interface.
