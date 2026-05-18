# Validation Summary: How to Use cloud-init with Packer for Automated Builds on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu Server 22.04 (Jammy)
- cloud-init / Subiquity autoinstall (`#cloud-config` with `autoinstall:` block)
- HashiCorp Packer (HCL2) with the `qemu` builder plugin
- QEMU / KVM (qcow2 disk format)
- Netplan v2 network configuration
- Docker CE install via official apt repository
- bash shell scripting, systemd, journalctl, sysctl

## Sources Consulted
- Subiquity autoinstall reference: https://canonical-subiquity.readthedocs-hosted.com/en/latest/reference/autoinstall-reference.html
- Ubuntu Discourse autoinstall reference: https://discourse.ubuntu.com/t/automated-server-installer-config-file-reference/16613
- Packer QEMU builder docs: https://developer.hashicorp.com/packer/integrations/hashicorp/qemu/latest/components/builder/qemu
- Docker engine install on Ubuntu: https://docs.docker.com/engine/install/ubuntu/
- Netplan reference: https://netplan.io/reference
- cloud-init CLI reference (`cloud-init clean --machine-id`): https://cloudinit.readthedocs.io/en/latest/reference/cli.html

## Issues Found

1. **Invalid autoinstall key `confirm-bugs: false`** — This key does not exist in the Subiquity autoinstall reference. The autoinstall flow already skips the installer's final confirmation step when `interactive-sections` is empty, so the key was both invalid and unnecessary. Removed the line and adjusted the surrounding comment so the remaining `user-data:` block is described accurately.

2. **Legacy double-nested `network: network:` structure** — Subiquity in Ubuntu 20.04 GA required an extra `network:` key as a workaround for a known bug. Modern Subiquity (22.04+) documents the Netplan config nested only one level under `autoinstall.network`. Both forms still parse, but for a post pinned to Ubuntu 22.04 the documented single-nested form is the correct modern style. Collapsed the duplicate `network:` and re-indented `ethernets:` accordingly.

## Review Notes
- The boot command escape `\\;` resolves to `\;` in the typed kernel cmdline, which is required so the kernel cmdline parser does not split on the semicolon between `ds=nocloud-net` and `s=http://...`. This is the standard Packer pattern for Ubuntu autoinstall and is correct as written.
- The `<down><down><down><end>` GRUB navigation works for the Ubuntu 22.04 live-server ISO's default GRUB menu, but is fragile if Canonical changes the menu in a future point release. Worth re-checking when bumping to 24.04 LTS.
- `apt-transport-https` and `lsb-release` in the package list are vestigial on 22.04+ (HTTPS support is built into apt and `lsb-release` is rarely needed since `/etc/os-release` exists). Harmless, so left as-is.
- `net.bridge.bridge-nf-call-iptables = 1` in `configs/sysctl.conf` requires the `br_netfilter` kernel module to be loaded before sysctl applies it; on a fresh boot without the module, systemd-sysctl will log a warning and skip the key. Users running Kubernetes/Docker bridge networking typically also drop a `/etc/modules-load.d/br_netfilter.conf`. Not a bug in the post, but a footgun worth knowing.
- The Ubuntu 22.04.4 ISO URL and SHA256 checksum (`45f873de9f8c…0a32b2`) match the published values at https://releases.ubuntu.com/22.04/, but Canonical periodically supersedes point releases (22.04.5, etc.). When a new point release ships, both fields must be updated together.
- `ds=nocloud-net` still works but cloud-init now treats `nocloud` and `nocloud-net` as the same datasource; either is fine.
