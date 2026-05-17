# Validation Summary: How to Use virt-manager GUI for VM Management on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- virt-manager (Virtual Machine Manager)
- libvirt / virsh
- KVM / QEMU
- Ubuntu (apt package management)
- SPICE and VNC display protocols
- VirtIO paravirtualized drivers
- qcow2 disk format
- SSH key authentication / SSH tunneling
- qemu-guest-agent

## Sources Consulted
- virt-manager official documentation (https://virt-manager.org/)
- Ubuntu package archives (apt-cache lookups for `virt-manager`, `qemu-kvm`, `libvirt-daemon-system`, `libvirt-clients`, `spice-vdagent`, `xserver-xorg-video-qxl`, `qemu-guest-agent`, `virt-viewer`, `virtio-modules-common`)
- libvirt remote URI documentation (https://libvirt.org/uri.html) for `qemu+ssh://` URI form
- libvirt virsh manual for `domdisplay`
- Ubuntu releases page (https://releases.ubuntu.com/22.04/) for ISO filename verification
- SPICE project documentation for guest-side agent / QXL driver
- Ubuntu Server Guide on libvirt / KVM groups (`libvirt`, `kvm`)

## Issues Found
1. **Non-existent package `virtio-modules-common`**: The "Install VirtIO drivers inside the guest" snippet ran `sudo apt install qemu-guest-agent virtio-modules-common`. `virtio-modules-common` is not a package in the Ubuntu archive (confirmed via `apt-cache search`). VirtIO drivers (`virtio_blk`, `virtio_net`, `virtio_pci`, `virtio_scsi`, etc.) are built into the Ubuntu Linux kernel and require no separate package. Fixed by removing `virtio-modules-common` from the install command and adding a brief inline note explaining that VirtIO drivers ship with the kernel.

## Review Notes
- The virt-manager "New VM" wizard description groups install-source and OS detection as steps 1 and 2; the actual wizard in current virt-manager versions also offers a "Network Boot (PXE)" install method that is not enumerated in the post. Not strictly wrong (the list isn't presented as exhaustive), but a future revision could mention it.
- The example `virsh domdisplay myvm` output shows `spice://127.0.0.1:5900`. libvirt's auto port allocation for SPICE starts at 5900, the same base port range that VNC uses, so this is plausible — though in practice many setups end up with SPICE on a higher port if VNC is also enabled. The example is fine as illustrative.
- The Ubuntu 22.04.4 ISO URL is valid as a point-in-time release; readers running this post later may want to substitute the latest 22.04.x point release.
- "host-passthrough" CPU model is correctly described; the caveat about reduced migration compatibility is accurate.
- QXL is the correct video model for SPICE 2D acceleration; the mention of "Virtio" video for better 2D is acceptable shorthand for `virtio-gpu`, which is increasingly preferred on modern hosts.
