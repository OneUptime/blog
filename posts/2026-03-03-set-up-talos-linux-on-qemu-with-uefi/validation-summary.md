# Validation Summary: How to Set Up Talos Linux on QEMU with UEFI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Talos Linux
- QEMU
- OVMF/UEFI firmware
- Linux bridge and TAP networking
- dnsmasq DHCP
- Kubernetes
- talosctl
- kubectl

## Sources Consulted
- Talos QEMU guide: https://docs.siderolabs.com/talos/v1.13/platform-specific-installations/local-platforms/qemu
- Talos KVM guide: https://docs.siderolabs.com/talos/v1.11/platform-specific-installations/virtualized-platforms/kvm
- Talos CLI reference: https://docs.siderolabs.com/talos/latest/reference/cli
- Talos v1.8 release notes for release artifacts and serial console changes: https://docs.siderolabs.com/talos/v1.8/getting-started/what's-new-in-talos
- Talos GitHub releases: https://github.com/siderolabs/talos/releases
- QEMU system emulator manual: https://www.qemu.org/docs/master/system/qemu-manpage.html
- Kubernetes kubectl install documentation: https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/

## Issues Found
- The Talos download used the outdated `v1.7.0` `metal-amd64.raw.xz` artifact. Updated it to the current `v1.13.2` `metal-amd64.raw.zst` release artifact and changed decompression from `xz` to `zstd`.
- The prerequisite package lists did not include `zstd` for the current Talos raw image artifact or `dnsmasq` for the DHCP service added below. Updated the package commands accordingly.
- The bridge setup created `br0` and TAP interfaces but did not provide DHCP or static addressing, so the later `10.5.0.2` through `10.5.0.6` `talosctl` commands would not reliably work. Added a `dnsmasq` command with fixed DHCP leases matching the QEMU MAC addresses.
- The OVMF setup mentioned Fedora paths but then copied only from the Debian/Ubuntu path. Added `OVMF_CODE` and `OVMF_VARS_TEMPLATE` variables for both layouts and updated the copy/QEMU commands to use them.
- The Talos configuration generation omitted the install disk. Added `--install-disk /dev/vda`, matching the virtio disk exposed by the QEMU commands and the official Talos installation flow.
- The guide listed macOS package installation but the manual bridge/TAP commands are Linux-specific. Added a short caveat directing macOS users to Talos' QEMU provisioner or QEMU vmnet networking.
- The shutdown section did not stop the DHCP server introduced for the bridge. Added a command to stop the `dnsmasq` process by its PID file.

## Review Notes
The guide remains a manual QEMU setup rather than the officially recommended `talosctl cluster create qemu` path. That is acceptable for a UEFI-focused tutorial, but users should expect host-specific differences in OVMF file names and Linux firewall tooling.
