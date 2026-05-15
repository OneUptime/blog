# Validation Summary: How to Build QCOW2 Virtual Machine Images for RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- RHEL Image Builder / osbuild-composer
- QCOW2
- KVM and QEMU
- libvirt, virsh, and virt-install
- cloud-init NoCloud

## Sources Consulted
- Red Hat Enterprise Linux 8 documentation: Creating system images by using RHEL image builder CLI: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/composing_a_customized_rhel_system_image/creating-system-images-with-composer-command-line-interface_composing-a-customized-rhel-system-image
- Red Hat Enterprise Linux 8 documentation: Preparing and deploying a KVM guest image by using RHEL Image Builder: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/pdf/composing_a_customized_rhel_system_image/composing-a-customized-rhel-system-image.pdf
- Red Hat Enterprise Linux 8 documentation: Enabling or disabling services in Image Builder blueprints: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/composing_installing_and_managing_rhel_for_edge_images/composing-a-rhel-for-edge-image-using-image-builder-command-line_composing-installing-managing-rhel-for-edge-images
- OSBuild Image Builder blueprint reference: https://osbuild.org/docs/user-guide/blueprint-reference/
- cloud-init NoCloud datasource documentation: https://docs.cloud-init.io/en/latest/reference/datasources/nocloud.html
- libvirt virsh manual page: https://www.libvirt.org/manpages/virsh.html

## Issues Found
- The blueprint set `hostname = ""` under `[customizations]`. The hostname customization is optional, and examples use a real hostname value. Removed the empty hostname setting so cloud-init can set the VM hostname from NoCloud metadata without relying on an empty Image Builder hostname.
- The `virt-install` command created and started the VM before the cloud-init ISO was created or attached. Red Hat's KVM guest image workflow attaches the NoCloud ISO as a CD-ROM disk in the `virt-install` command, so the post now includes `--disk /var/lib/libvirt/images/cloud-init.iso,device=cdrom` in `virt-install` and removes the later `virsh attach-disk` command.
- The OS disk in the `virt-install` example did not specify disk device or bus. Updated it to `device=disk,bus=virtio,format=qcow2`, matching Red Hat's KVM guest image example.
- The `genisoimage` command wrote to `/var/lib/libvirt/images/` without elevated privileges. Added `sudo` so the command works for the same non-root workflow used by the surrounding libvirt commands.

## Review Notes
The post remains version-sensitive around `--os-variant rhel9.4`; users should adjust that value to match the RHEL release in their image and the variants available in their installed libosinfo database.
