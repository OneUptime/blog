# Validation Summary: How to Customize Ubuntu Cloud Images for Deployment

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu Cloud Images
- cloud-init and NoCloud seed media
- libguestfs tools: virt-customize, guestfish, virt-sysprep
- QEMU and qemu-img
- Packer QEMU builder
- AWS VM Import/Export
- Azure custom Linux VHD images

## Sources Consulted
- Ubuntu Jammy cloud image listing: https://cloud-images.ubuntu.com/jammy/current/
- libguestfs virt-customize manual: https://libguestfs.org/virt-customize.1.html
- libguestfs virt-sysprep manual: https://libguestfs.org/virt-sysprep.1.html
- cloud-localds manual: https://www.mankier.com/1/cloud-localds
- cloud-init NoCloud datasource documentation: https://docs.cloud-init.io/en/latest/reference/datasources/nocloud.html
- HashiCorp Packer QEMU builder documentation: https://developer.hashicorp.com/packer/integrations/hashicorp/qemu/latest/components/builder/qemu
- QEMU disk image documentation: https://www.qemu.org/docs/master/system/images
- AWS EC2 import-image CLI documentation: https://docs.aws.amazon.com/cli/latest/reference/ec2/import-image.html
- AWS VM Import/Export prerequisites: https://docs.aws.amazon.com/vm-import/latest/userguide/prerequisites.html
- Azure Linux custom image preparation documentation: https://learn.microsoft.com/en-us/azure/virtual-machines/linux/create-upload-generic

## Issues Found
- The Ubuntu image-format list included `-disk.img` as a raw disk and `-uefi1.img` as a current variant. The current Jammy listing uses `.img` for the QCOW2 UEFI/GPT image, `-disk-kvm.img` for the KVM-optimized QCOW2 image, Azure VHD archives, and `.vmdk`. Updated the list accordingly.
- The `apt install` command used inline comments after line-continuation backslashes, which breaks shell parsing. Moved those comments below the command and left a valid multi-line install command.
- The `virt-customize --copy-in` and `--write` examples targeted `/etc/myapp/` without ensuring that directory existed. Added `--mkdir /etc/myapp` to those examples because `--copy-in` requires an existing destination directory.
- The sysprep section said `virt-sysprep` removes cloud-init state. The official virt-sysprep operation list does not include a cloud-init cleanup operation. Added an explicit `cloud-init clean --logs` command via `virt-customize` and removed that item from the virt-sysprep removal list.
- The Packer cloud-image template referenced `user-data.yaml` but did not ensure SSH access for the Packer communicator. Added a temporary key-generation command, configured `ssh_private_key_file`, and embedded NoCloud `user-data`/`meta-data` that authorizes the generated public key.
- The Packer NoCloud seed label used lowercase `cidata`; cloud-init documents the required filesystem label as `CIDATA`. Updated the label.
- The AWS import example uploaded a QCOW2 image and set `Format` to `qcow2`, but AWS EC2 `import-image` lists valid disk container formats as `OVA`, `VHD`, `VHDX`, `VMDK`, and `RAW`. Updated the example to convert to RAW before upload and use `Format":"RAW"`.

## Review Notes
The QEMU, cloud-localds, qemu-img conversion, Azure fixed-VHD conversion, and cloud-init user-data examples align with the consulted documentation. The commands were reviewed against official documentation, but the full image build was not executed because the required virtualization tooling and cloud credentials are not installed/configured in this workspace.
