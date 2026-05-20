# Validation Summary: How to Back Up KVM Virtual Machines on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- KVM
- libvirt / virsh
- QEMU / qemu-img
- qcow2 and raw disk images
- Bash scripting
- cron

## Sources Consulted
- libvirt virsh manual: https://www.libvirt.org/manpages/virsh.html
- libvirt snapshot documentation: https://libvirt.org/kbase/snapshots.html
- libvirt disk image chain merge documentation: https://libvirt.org/kbase/merging_disk_image_chains.html
- libvirt virt-xml-validate manual: https://www.libvirt.org/manpages/virt-xml-validate.html
- libvirt XML format documentation: https://libvirt.org/format.html
- QEMU qemu-img documentation: https://www.qemu.org/docs/master/tools/qemu-img.html

## Issues Found
- The live snapshot section implied filesystem consistency from the overlay workflow alone. Updated the text to clarify that the shown live backup is crash-consistent unless `--quiesce` is used with a working QEMU guest agent.
- The live backup script tried to discover snapshot overlay files after `blockcommit --pivot` by reading `domblklist`. After pivoting, libvirt reports the original disk path again, so the cleanup loop would not remove the overlay files. Updated the script to store snapshot file paths when creating them and remove those paths after the blockcommit completes.
- The backup scripts always saved disk copies with a `.qcow2` extension, even when the source disk was raw or another format. Updated the filename logic to preserve the original extension and handle extensionless paths.
- The `qemu-img convert` compression example placed an inline comment after a line-continuation backslash, which would break the shell command. Moved the explanation to a separate comment line.
- The XML validation example used `virsh define --validate`, which validates but also registers the domain. Replaced it with `virt-xml-validate`, the libvirt tool intended for validating XML without defining a VM.
- The test overlay example passed an unnecessary `0` size to `qemu-img create` even though QEMU does not require a size when a backing file is specified. Removed the size argument.
- The test boot example defined the VM before editing the XML to point at the test overlay. Updated it to copy and edit the XML first, then define the edited test XML.
- The retention example described keeping weekly snapshots for 3 months but only matched a single date. Changed the example to a technically accurate cleanup of files older than 90 days.

## Review Notes
- The live external snapshot method is valid for file-backed disks, but production environments should test guest-agent quiescing, multi-disk consistency, and existing backing-chain handling before relying on it for application-consistent recovery.
