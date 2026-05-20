# Validation Summary: How to Configure Network Settings During Ubuntu Server Installation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu Server installer (Subiquity)
- Netplan
- systemd-networkd
- NetworkManager
- systemd predictable network interface names
- DHCP and static IPv4 configuration
- VLANs
- Linux bonding
- Linux bridges
- WiFi configuration with wpasupplicant
- systemd-resolved / resolvectl

## Sources Consulted
- Ubuntu Server documentation: Configuring networks - https://ubuntu.com/server/docs/explanation/networking/configuring-networks/
- Ubuntu Server documentation: Basic installation - https://ubuntu.com/server/docs/tutorial/basic-installation/
- Ubuntu installer documentation: Screen-by-screen installer walk-through - https://canonical-subiquity.readthedocs-hosted.com/en/latest/tutorial/screen-by-screen.html
- Ubuntu installer documentation: Autoinstall configuration reference - https://canonical-subiquity.readthedocs-hosted.com/en/latest/reference/autoinstall-reference.html
- Netplan documentation: YAML configuration reference - https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Netplan documentation: VM host with bonds and VLANs example - https://netplan.readthedocs.io/en/stable/multi-nic-vm-host-with-bonds-and-vlans/
- Netplan documentation: Examples - https://netplan.readthedocs.io/en/0.107/examples/
- systemd documentation: Predictable Network Interface Names - https://systemd.io/PREDICTABLE_INTERFACE_NAMES/
- Local command help: `netplan --help`, `netplan try --help`, `netplan generate --help`

## Issues Found
- The DHCP default section said the installer configures DHCP on all detected interfaces. Ubuntu's installation documentation specifically describes the default attempt as DHCP on wired network interfaces, so this was changed to "detected wired interfaces."
- The WiFi section said Ubuntu Server supports WiFi through Netplan, but did not mention that the default `networkd` renderer needs `wpasupplicant` for WiFi. This caveat was added to keep the example accurate on Ubuntu Server.

## Review Notes
The Netplan YAML examples use current keys and structures for static addresses, `routes: - to: default`, nameservers, multiple addresses, VLANs, bonds, bridges, and WiFi access points. The `netplan try`, `netplan apply`, `netplan generate`, `resolvectl`, `ip`, `journalctl`, and `ping` commands are valid. For Ubuntu 18.04 specifically, `to: default` is not supported and older `gateway4` syntax is required, but the post does not target Ubuntu 18.04 and the current syntax is correct for modern Ubuntu releases.
