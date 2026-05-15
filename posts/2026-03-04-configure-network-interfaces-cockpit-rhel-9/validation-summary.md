# Validation Summary: How to Configure Network Interfaces Using the Cockpit Web Console on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Cockpit / RHEL web console
- NetworkManager
- nmcli
- Linux networking interfaces, bonds, VLANs, and bridges
- firewalld

## Sources Consulted
- Red Hat Enterprise Linux 9, Configuring and managing networking: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_networking/configuring_and_managing_networking
- Red Hat Enterprise Linux 9, Configuring a network bond by using nmcli and the RHEL web console: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/configuring-network-bonding_configuring-and-managing-networking
- Red Hat Enterprise Linux 9, Configuring VLAN tagging by using nmcli and the RHEL web console: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/configuring-vlan-tagging_configuring-and-managing-networking
- Red Hat Enterprise Linux 9, Configuring a network bridge by using nmcli and the RHEL web console: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/configuring-a-network-bridge_configuring-and-managing-networking
- NetworkManager nmcli manual: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli.html
- NetworkManager nm-settings-nmcli reference: https://www.networkmanager.dev/docs/api/latest/nm-settings-nmcli.html
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- Local command help for nmcli 1.46.0, iproute2 6.1.0, journalctl, and ping.

## Issues Found
- The Networking Page section listed teams without noting that NIC teaming is deprecated in RHEL 9. Added a parenthetical note so readers do not treat teams as a preferred RHEL 9 option.
- The MTU example used `802-3-ethernet.mtu`. This is still an underlying NetworkManager setting name, but current RHEL examples and nmcli aliases use `ethernet.mtu`; updated the command accordingly.
- The bond and bridge port examples used the deprecated `master` alias. Updated them to the RHEL 9.4+ `controller` and `port-type` syntax shown in current Red Hat documentation.

## Review Notes
The corrected `controller` and `port-type` commands match current RHEL 9.4+ documentation. Older RHEL 9 releases may still require the previous `master` / `slave-type` aliases, but those aliases are deprecated in newer NetworkManager documentation.
