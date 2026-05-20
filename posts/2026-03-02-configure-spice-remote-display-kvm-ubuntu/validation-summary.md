# Validation Summary: How to Configure SPICE Remote Display for KVM on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu package management
- KVM/QEMU
- libvirt and virsh
- virt-install
- SPICE remote display
- QXL video
- SPICE guest agent
- TLS certificates
- USB redirection

## Sources Consulted
- libvirt Domain XML format: https://libvirt.org/formatdomain.html
- Ubuntu virt-install man page: https://manpages.ubuntu.com/manpages/focal/man1/virt-install.1.html
- Ubuntu virsh man page: https://manpages.ubuntu.com/manpages/noble/man1/virsh.1.html
- QEMU user documentation and monitor commands: https://www.qemu.org/docs/master/system/qemu-manpage.html and https://www.qemu.org/docs/master/system/monitor
- QEMU TLS documentation: https://www.qemu.org/docs/master/system/tls.html
- Ubuntu package metadata checked with `apt-cache` for `qemu-system-x86`, `libvirt-daemon-system`, `libvirt-clients`, `virtinst`, `virt-viewer`, `spice-client-gtk`, `spice-vdagent`, and `xserver-xorg-video-qxl`

## Issues Found
- The host package list included `qemu-kvm`, `spice-server-dev`, and `spice-vdagent`. On current Ubuntu metadata, `qemu-system-x86` is the installable provider for the x86 system emulator, `spice-server-dev` is a development package rather than a runtime requirement, and `spice-vdagent` belongs inside the guest. Updated the host install command and added `libvirt-clients` and `virtinst` because the post uses `virsh` and `virt-install`.
- The client package list included `remote-viewer` as a package, but Ubuntu provides the `remote-viewer` command through the `virt-viewer` package. Updated the Ubuntu and Fedora/RHEL install examples.
- The new VM `virt-install` example used `--import` with a newly created blank disk, which would not install a bootable guest. Replaced it with `--cdrom /path/to/ubuntu.iso`.
- Several QXL XML snippets placed XML comments inside the `<model>` start tag, which is invalid XML. Moved those comments outside the tag.
- The QEMU monitor password expiration example used `expire_password spice 3600`, which is interpreted as an absolute Unix timestamp. Changed it to `+3600` for a relative one-hour expiration.
- The TLS section created files under `/etc/pki/libvirt-spice` without elevated privileges and did not enable libvirt's SPICE TLS certificate directory. Added `sudo`, `spice_tls`, `spice_tls_x509_cert_dir`, a libvirt restart command, and a TLS autoport in the graphics XML.
- The guest-agent package list included `spice-vdagentd`, which is not a separate Ubuntu package; the daemon is provided by `spice-vdagent`. Removed the nonexistent package.
- The guest-agent feature list said the agent enables audio support. SPICE audio requires a sound device and SPICE audio backend, not the guest agent, so that bullet was removed.
- The multi-monitor example implied adding a second SPICE graphics head. libvirt multi-monitor support is controlled by the video model `heads` attribute; the example now says to keep one SPICE graphics device.
- The audio example duplicated the sound device and used a nonexistent `remote-viewer --spice-audio` option. Updated it to use an ICH9 sound device mapped to a SPICE audio backend and a normal `remote-viewer` connection.

## Review Notes
SPICE remains valid on Ubuntu/libvirt, but availability depends on QEMU being built with SPICE support. Some distributions have reduced or removed SPICE support in certain QEMU builds, so users should keep the verification command before relying on these examples.
