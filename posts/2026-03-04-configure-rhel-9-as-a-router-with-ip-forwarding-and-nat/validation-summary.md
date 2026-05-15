# Validation Summary: How to Configure RHEL as a Router with IP Forwarding and NAT

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- Linux IPv4 forwarding with sysctl
- firewalld zones and policies
- Network Address Translation (NAT) masquerading
- nftables backend inspection

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring NAT by using firewalld": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_firewalls_and_packet_filters/index#configuring-nat-using-firewalld_using-and-configuring-firewalld
- Red Hat Enterprise Linux 9 documentation, "Enabling traffic forwarding between different interfaces or sources within a firewalld zone": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_firewalls_and_packet_filters/index#using-intra-zone-forwarding-to-forward-traffic-between-an-ethernet-and-wi-fi-network_enabling-traffic-forwarding-between-different-interfaces-or-sources-within-a-firewalld-zone
- firewalld manual, "firewalld.policies": https://firewalld.org/documentation/man-pages/firewalld.policies.html
- firewalld manual, "firewall-cmd": https://firewalld.org/documentation/man-pages/firewall-cmd.html
- Local `sysctl.d(5)` manual page for persistent kernel parameter configuration.

## Issues Found
- The original post used placeholder paths and service names such as `/etc/<service>/config.conf` and `<service-name>`, which would not configure RHEL routing, IP forwarding, NAT, or any real service. Replaced these with concrete `sysctl`, `systemctl`, `firewall-cmd`, and `nft` commands.
- The original post did not enable Linux packet forwarding. Added a persistent `/etc/sysctl.d/95-IPv4-forwarding.conf` setting and an immediate `sysctl -p` command, matching Red Hat's documented approach.
- The original post did not configure NAT. Added firewalld external-zone masquerading using `--add-masquerade`, which Red Hat documents for source address masquerading.
- The original post did not allow routed traffic between firewall zones. Added a firewalld policy from `internal` to `external` with target `ACCEPT`, matching firewalld's documented policy model for unidirectional inter-zone forwarding.
- The verification and troubleshooting commands checked a generic placeholder service. Replaced them with checks for `net.ipv4.ip_forward`, firewalld masquerading, the forwarding policy, generated nftables rules, and required packages.

## Review Notes
The article now provides a minimal IPv4 NAT router configuration. It intentionally uses example interface names, so readers must replace `enp1s0` and `enp7s0` with their actual interface names.
