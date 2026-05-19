# Validation Summary: How to Configure Network Settings with cloud-init on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- cloud-init
- cloud-init network configuration versions 1 and 2
- Netplan
- NoCloud datasource
- Linux networking commands and systemd journal inspection

## Sources Consulted
- cloud-init Network configuration documentation: https://docs.cloud-init.io/en/latest/reference/network-config.html
- cloud-init Networking config Version 1 documentation: https://docs.cloud-init.io/en/latest/reference/network-config-format-v1.html
- cloud-init Networking config Version 2 documentation: https://cloudinit.readthedocs.io/en/20.4.1/topics/network-config-format-v2.html
- cloud-init NoCloud datasource documentation: https://docs.cloud-init.io/en/latest/reference/datasources/nocloud.html
- Netplan YAML configuration reference: https://netplan.readthedocs.io/en/stable/netplan-yaml/
- Netplan CLI reference: https://netplan.readthedocs.io/en/stable/cli/
- Ubuntu netplan-apply manpage: https://manpages.ubuntu.com/manpages/jammy/man8/netplan-apply.8.html
- cloud-utils cloud-localds source/help text: https://sources.debian.org/src/cloud-utils/0.29-1/bin/cloud-localds/

## Issues Found
- The post incorrectly stated that cloud-init network configuration can be provided directly in cloud-config user data using the `network:` key. Current cloud-init documentation states that user-data cannot change an instance's network configuration. I changed the section to describe cloud-init system configuration under `/etc/cloud/cloud.cfg.d/` and updated the examples to show that file context.
- The network configuration examples used `#cloud-config`, which implied user-data delivery for snippets that need to be cloud-init system config. I replaced those comments with `/etc/cloud/cloud.cfg.d/custom-networking.cfg` to avoid a misleading delivery mechanism.
- The disabling section showed `sudo touch /etc/cloud/cloud.cfg.d/99-disable-network-config.cfg` as a marker file. An empty file does not disable cloud-init networking; the file must contain `network: config: disabled`. I removed the empty-file command and kept the documented YAML configuration.
- The troubleshooting section referenced `netplan-wpa-eth0.service`, which is not a generic Netplan service for wired cloud instance networking. I replaced it with renderer log checks for `systemd-networkd.service` and `NetworkManager.service`.

## Review Notes
The Netplan version 2 examples use current route syntax (`routes: - to: default`) instead of deprecated `gateway4`/`gateway6`, and the bond, VLAN, bridge, DNS, static address, and MAC match fields align with Netplan/cloud-init network config documentation. The NoCloud `cloud-localds --network-config=...` command is valid, though `cloud-localds` was not installed in this local environment for runtime testing.
