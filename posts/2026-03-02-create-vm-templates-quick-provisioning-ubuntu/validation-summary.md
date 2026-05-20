# Validation Summary: How to Create VM Templates for Quick Provisioning on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu 22.04
- KVM/QEMU
- libvirt, virsh, and virt-install
- virt-sysprep / libguestfs
- qcow2 backing files and overlays
- Ubuntu cloud images
- cloud-init and NoCloud seed ISOs
- cloud-localds

## Sources Consulted
- libguestfs virt-sysprep manual: https://libguestfs.org/virt-sysprep.1.html
- virt-install manual: https://manpages.debian.org/virt-install
- QEMU qemu-img documentation: https://www.qemu.org/docs/master/tools/qemu-img.html
- cloud-init NoCloud documentation: https://docs.cloud-init.io/en/latest/reference/datasources/nocloud.html
- cloud-init cloud-config examples: https://docs.cloud-init.io/en/latest/topics/examples.html
- Canonical cloud-utils cloud-localds source/help text: https://github.com/canonical/cloud-utils/blob/main/bin/cloud-localds
- Ubuntu cloud images documentation: https://documentation.ubuntu.com/server/explanation/clouds/find-cloud-images/
- Ubuntu Jammy cloud image directory: https://cloud-images.ubuntu.com/jammy/current/
- libvirt virsh manual: https://www.libvirt.org/manpages/virsh.html

## Issues Found
- The base VM creation command used `--cdrom` together with `--extra-args`. `virt-install` documents kernel extra arguments for location/kernel-style installs, so I changed `--cdrom /path/to/ubuntu-22.04-server.iso` to `--location /path/to/ubuntu-22.04-server.iso` and added an explicit serial console device with `--console pty,target_type=serial`.
- The post described the converted qcow2 image as a read-only template, but the command only converted and compressed the image. I added `sudo chmod 444 /var/lib/libvirt/images/templates/ubuntu-22.04-base.qcow2` so the template is actually read-only on the host.
- The cloud image download step said "Verify the download" but only ran `sha256sum`, which computes a checksum without comparing it to Canonical's signed checksum files. I changed the wording to "Check the downloaded image checksum" to match what the command actually does.

## Review Notes
- The cloud-init network example uses `enp1s0`, which is plausible for a libvirt VM but can vary depending on the virtual NIC model and PCI topology. A future revision could make the network config more portable by matching the interface name or MAC address.
- `virsh domifaddr` may depend on DHCP lease data or the QEMU guest agent depending on the network and guest configuration. The script's fallback message is appropriate.
