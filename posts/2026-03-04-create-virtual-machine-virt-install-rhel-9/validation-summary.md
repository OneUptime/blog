# Validation Summary: How to Create a Virtual Machine Using virt-install on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- KVM virtualization
- libvirt
- virt-install
- libosinfo and osinfo-query
- Kickstart automated installation
- PXE boot
- qcow2 and raw virtual disk images
- UEFI boot

## Sources Consulted
- Red Hat Enterprise Linux 9: Configuring and managing virtualization: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_virtualization/configuring_and_managing_virtualization
- virt-install manual page: https://www.mankier.com/1/virt-install
- libosinfo project documentation: https://libosinfo.org/download.html
- osinfo-query manual page: https://manpages.debian.org/unstable/libosinfo-bin/osinfo-query.1.en.html

## Issues Found
- The post used `--os-variant` in the virt-install examples and summary. Current virt-install documentation identifies `--osinfo` as the preferred option name, while `--os-variant` remains an alias. I updated the examples, parameter description, and summary to use `--osinfo` so the tutorial matches current RHEL 9 and virt-install documentation.

## Review Notes
The remaining virt-install options and examples are consistent with documented usage. The Kickstart examples rely on `--location` rather than `--cdrom`, which is the correct approach when using `--extra-args` and `--initrd-inject`. The local ISO `--location` examples are valid for recognized installer ISOs, but unknown or unusual ISO media may require explicit kernel and initrd paths.
