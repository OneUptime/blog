# Validation Summary: How to Configure an IPsec Site-to-Site VPN Using Libreswan on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Libreswan
- IPsec
- IKEv2
- Pre-shared key authentication
- firewalld
- Linux sysctl IP forwarding

## Sources Consulted
- Red Hat Enterprise Linux documentation: Setting up an IPsec VPN - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_and_managing_networking/configuring-a-vpn-connection_configuring-and-managing-networking
- Red Hat Enterprise Linux documentation: Setting up an IPsec VPN on RHEL 10 - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/securing_networks/setting-up-an-ipsec-vpn
- Libreswan ipsec.conf(5) manual - https://libreswan.org/man/ipsec.conf.5.html
- Libreswan ipsec-trafficstatus(8) manual - https://libreswan.org/man/ipsec-trafficstatus.8.html
- Libreswan ipsec-status(8) manual - https://libreswan.org/man/ipsec-status.8.html
- Libreswan ipsec.secrets(5) manual - https://manpages.debian.org/testing/libreswan/ipsec.secrets.5.en.html

## Issues Found
- The pre-shared key example was too short and looked human-chosen. Red Hat guidance states that Libreswan PSKs must be more than 64 random characters, so the example PSK was replaced with a 72-character random base64 value.

## Review Notes
The configuration uses valid Libreswan options for an IKEv2 site-to-site tunnel with PSK authentication. In a production deployment, administrators should also ensure that routing, NAT, and host or network firewalls permit forwarded traffic between the private subnets.
