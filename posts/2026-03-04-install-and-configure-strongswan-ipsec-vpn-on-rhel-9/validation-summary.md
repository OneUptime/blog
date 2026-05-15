# Validation Summary: How to Install and Configure StrongSwan IPsec VPN on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- EPEL
- StrongSwan IPsec VPN
- IKEv2 and IPsec site-to-site VPN configuration
- systemd
- firewalld

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Setting up an IPsec VPN - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/setting-up-an-ipsec-vpn_configuring-and-managing-networking
- strongSwan documentation: Installation Documentation - https://docs.strongswan.org/docs/latest/install/install.html
- strongSwan documentation: Introduction to strongSwan - https://docs.strongswan.org/docs/latest/howtos/introduction.html
- strongSwan documentation: charon-systemd - https://docs.strongswan.org/docs/latest/daemons/charon-systemd.html
- strongSwan documentation: swanctl Tool - https://docs.strongswan.org/docs/latest/swanctl/swanctl.html
- strongSwan documentation: swanctl.conf - https://docs.strongswan.org/docs/latest/swanctl/swanctlConf.html
- Fedora Packages: strongswan in Fedora EPEL 9 - https://packages.fedoraproject.org/pkgs/strongswan/strongswan/epel-9.html
- Fedora EPEL documentation: Getting started with EPEL - https://docs.fedoraproject.org/en-US/epel/getting-started/

## Issues Found
- The original installation command used `<package-name>` instead of an installable package. Updated the instructions to enable EPEL and install the actual `strongswan` package.
- The original service and configuration paths used placeholders such as `/etc/<service>/config.conf` and `<service-name>`, which would not work. Replaced them with `/etc/strongswan/swanctl/swanctl.conf` and the `strongswan` systemd unit used by the EPEL package.
- The original post did not acknowledge that RHEL supports Libreswan as its built-in supported IPsec VPN implementation. Added a note that StrongSwan is available through EPEL and should be used when that support model is acceptable.
- The original configuration section did not provide a valid StrongSwan configuration. Added a minimal `swanctl.conf` example for an IKEv2 site-to-site tunnel using a pre-shared key.
- The original verification and troubleshooting commands used placeholders. Replaced them with `systemctl`, `journalctl`, and `swanctl` commands that apply to StrongSwan.

## Review Notes
- I could not execute `dnf`, `firewall-cmd`, or StrongSwan commands locally because the review environment is not a RHEL/CentOS system with those tools installed. Commands were checked against official documentation and package metadata instead.
- Red Hat documentation recommends and supports Libreswan for RHEL IPsec VPN deployments. This post is valid as an EPEL-based StrongSwan guide, but production RHEL users should consider Red Hat support requirements before choosing StrongSwan.
