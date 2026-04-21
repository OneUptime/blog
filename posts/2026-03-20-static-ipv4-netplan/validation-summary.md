# Validation Summary: How to Configure a Static IPv4 Address with Netplan - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical guide

## Technologies Covered
- Linux networking
- Ubuntu Netplan
- YAML network configuration
- IPv4 static addressing
- DNS resolver configuration
- iproute2 `ip` command

## Sources Consulted
- Official Netplan static IP address guide: https://netplan.readthedocs.io/en/latest/using-static-ip-addresses/
- Official Netplan YAML reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Official Netplan `try` CLI reference: https://netplan.readthedocs.io/en/latest/netplan-try/
- Ubuntu Server networking configuration documentation: https://ubuntu.com/server/docs/explanation/networking/configuring-networks/
- Ubuntu Server Netplan overview: https://ubuntu.com/server/docs/explanation/networking/about-netplan/
- Local CLI help for `netplan`, `netplan try`, `netplan apply`, `ip address`, and `ip route`

## Issues Found
- The post says Netplan is the default on Ubuntu 18.04 and later, but the example uses `routes: - to: default`. Canonical's Ubuntu Server docs note that Ubuntu 18.04's Netplan does not understand `to: default`; it should use the older `gateway4` key instead. Added a short Ubuntu 18.04 compatibility note after the example.

## Review Notes
- The main YAML example is valid for current Netplan releases and matches the current Netplan static IP documentation.
- `gateway4` is deprecated in current Netplan, so the added note is limited to Ubuntu 18.04 compatibility. The `routes` block remains the right default for modern Ubuntu releases.
- `netplan try` does default to a 120-second confirmation timeout. The official docs also advise verifying rollback state if a try operation times out or is cancelled.
