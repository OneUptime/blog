# Validation Summary: How to Install and Use Multipass on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Multipass
- Snap packages
- QEMU/KVM
- libvirt
- cloud-init
- SSH
- systemd/journald

## Sources Consulted
- Multipass installation guide: https://documentation.ubuntu.com/multipass/latest/how-to-guides/install-multipass/
- Multipass driver setup guide: https://documentation.ubuntu.com/multipass/latest/how-to-guides/customise-multipass/set-up-the-driver/
- Multipass command-line reference: https://documentation.ubuntu.com/multipass/latest/reference/command-line-interface/
- Multipass launch reference: https://documentation.ubuntu.com/multipass/latest/reference/command-line-interface/launch/
- Multipass transfer reference: https://documentation.ubuntu.com/multipass/latest/reference/command-line-interface/transfer/
- Multipass delete reference: https://documentation.ubuntu.com/multipass/latest/reference/command-line-interface/delete/
- Multipass get/set references: https://documentation.ubuntu.com/multipass/latest/reference/command-line-interface/get/ and https://documentation.ubuntu.com/multipass/latest/reference/command-line-interface/set/
- Multipass instance modification guide: https://documentation.ubuntu.com/multipass/latest/how-to-guides/manage-instances/modify-an-instance/
- Multipass settings references for `local.<instance-name>.cpus`, `local.<instance-name>.memory`, and `local.<instance-name>.disk`: https://documentation.ubuntu.com/multipass/latest/reference/settings/local-instance-name-cpus/
- Multipass log access guide: https://documentation.ubuntu.com/multipass/latest/how-to-guides/troubleshoot/access-logs/
- Ubuntu Server Multipass guide: https://ubuntu.com/server/docs/how-to/virtualisation/multipass/
- cloud-init SSH authorized keys documentation: https://docs.cloud-init.io/en/latest/reference/modules.html

## Issues Found
- The post described Linux Multipass as using KVM directly and macOS as using HyperKit. Current Multipass documentation says the default driver is `qemu` on Linux and macOS, while Windows defaults to Hyper-V. Updated the introduction and backend section to use current driver terminology.
- The backend command comment called `local.driver=qemu` "KVM". Updated it to describe QEMU, with KVM acceleration when available.
- The libvirt driver was presented as a normal alternative without caveat. Updated the wording to note that the Multipass `libvirt` driver is deprecated.
- The direct SSH example implied that `ssh ubuntu@<ip>` works automatically because Multipass manages SSH keys. Multipass manages access for its own commands, but direct SSH requires an authorized key available to the user's SSH client. Updated the text to say direct SSH works after adding your SSH key.
- The "Setting Global Defaults" section used invalid settings keys: `local.cpus`, `local.memory`, and `local.disk`. Multipass exposes these as per-instance settings under `local.<instance-name>.(cpus|memory|disk)`, and instances must be stopped before changing them. Rewrote that section as "Modifying Instance Resources" with valid commands.
- The networking troubleshooting section recommended restarting `systemd-networkd`, which is not a Multipass-specific fix and is not appropriate on all Ubuntu hosts. Changed it to restart the Multipass snap instead.

## Review Notes
- Most lifecycle, launch, transfer, delete/purge, exec, cloud-init, daemon log, and image listing examples match current Multipass documentation.
- Sample image versions and IP addresses are illustrative and may differ from current `multipass find` output.
