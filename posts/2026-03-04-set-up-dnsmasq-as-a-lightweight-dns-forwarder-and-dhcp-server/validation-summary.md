# Validation Summary: How to Set Up dnsmasq as a Lightweight DNS Forwarder and DHCP Server on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL
- dnsmasq
- DNS forwarding
- DHCP
- firewalld
- systemd

## Sources Consulted
- dnsmasq official manual: https://thekelleys.org.uk/dnsmasq/docs/dnsmasq-man.html
- dnsmasq official project documentation: https://thekelleys.org.uk/dnsmasq/doc.html
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- Red Hat RHEL 8 firewalld documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/securing_networks/using-and-configuring-firewalld_securing-networks
- Local dnsmasq man page and `dnsmasq --help dhcp`

## Issues Found
- The introductory paragraph contained corrupted text: `IRHELdeal` and `aRHELBIND`. Changed it to "Ideal" and "a BIND" so the technical comparison is readable and correct.
- The DHCP static lease examples conflicted with the `/etc/hosts` entries. `server1` was already shown as `192.168.1.10`, which is also the DNS server IP used in later commands, but the DHCP example assigned `server1` to `192.168.1.11`. Updated the reservations to assign `server2` to `192.168.1.11` and `db` to `192.168.1.12`, matching the host records.
- The post ended with an extra standalone `RHEL` token. Removed it because it was stray content and not part of the technical instructions.

## Review Notes
- The dnsmasq configuration option names and DHCP option aliases used in the post are valid.
- The corrected dnsmasq snippet passed `dnsmasq --test` syntax validation locally.
- The post assumes the server interface is `eth0`; on many RHEL installations, predictable interface names such as `ens160` or `enp1s0` are common, so readers may need to substitute their actual interface name.
