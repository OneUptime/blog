# Validation Summary: How to Fix Network Manager vs Netplan Conflicts on Ubuntu

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Ubuntu networking
- Netplan
- NetworkManager
- systemd-networkd
- systemd-resolved
- cloud-init
- iproute2

## Sources Consulted
- Netplan YAML configuration reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Netplan general structure and default renderer behavior: https://netplan.readthedocs.io/en/stable/structure-id/
- Netplan NetworkManager default configuration: https://netplan.readthedocs.io/en/stable/nm-all/
- NetworkManager.conf reference manual: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/NetworkManager.conf.html
- cloud-init network configuration reference: https://docs.cloud-init.io/en/latest/reference/network-config.html
- Local command help output for `networkctl`, `resolvectl`, `netplan generate`, and `nmcli`

## Issues Found
- The post said Netplan's default renderer depends on whether NetworkManager is installed. Netplan's schema default is `networkd`; Ubuntu Desktop uses NetworkManager through an explicitly shipped Netplan snippet. Updated the wording to reflect that distinction.
- The post described `NetworkManager.conf` `unmanaged-devices` entries as comma-separated. NetworkManager's device-list examples for `keyfile.unmanaged-devices` use semicolon-separated match specs. Updated the comment above the example.
- The verification section said to confirm only one manager is active, which is inaccurate for the coexistence setup described earlier in the post. Updated it to confirm only the intended manager or managers are active.
- The Netplan stack overview only mentioned `/etc/netplan/*.yaml`. Netplan also considers packaged and runtime snippets, which matters for Ubuntu Desktop's default NetworkManager renderer. Updated the bullet to mention `/usr/lib/netplan/` and `/run/netplan/`.

## Review Notes
The commands and configuration examples are broadly current for Ubuntu 22.04 and later. On cloud images, disabling cloud-init networking is valid but should be applied with care because datasource-provided network configuration may be required on first boot.
