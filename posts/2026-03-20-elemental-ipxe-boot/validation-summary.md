# Validation Summary: How to Set Up Elemental with iPXE Boot

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Elemental / Rancher OS Manager
- iPXE
- ISC DHCP
- QEMU
- Kubernetes (`kubectl`)
- Python `http.server`

## Sources Consulted
- Elemental MachineRegistration reference: https://elemental.docs.rancher.com/machineregistration-reference/
- Elemental SeedImage reference: https://elemental.docs.rancher.com/seedimage-reference
- Elemental Quickstart CLI: https://elemental.docs.rancher.com/quickstart-cli/
- Elemental Inventory Management: https://elemental.docs.rancher.com/inventory-management/
- Elemental Toolkit cloud-init reference: https://rancher.github.io/elemental-toolkit/docs/reference/cloud_init/
- iPXE chainloading guide: https://ipxe.org/howto/chainloading
- iPXE `kernel` command reference: https://ipxe.org/cmd/kernel
- iPXE `chain` command reference: https://ipxe.org/cmd/chain
- QEMU direct Linux boot: https://www.qemu.org/docs/master/system/linuxboot.html
- QEMU network emulation: https://www.qemu.org/docs/master/system/devices/net.html
- QEMU invocation reference for user networking `bootfile`/TFTP behavior: https://www.qemu.org/docs/master/system/invocation.html
- SUSE Virtualization PXE boot installation guide: https://documentation.suse.com/cloudnative/virtualization/v1.8/en/installation-setup/methods/pxe-boot-install.html
- Rancher Elemental upstream PXE helper script: https://github.com/rancher/elemental/blob/main/tests/scripts/get-boot-files-for-pxe
- Rancher Elemental upstream iPXE test script generation: https://github.com/rancher/elemental/blob/main/tests/Makefile
- Rancher Elemental ISO registration helper: https://github.com/rancher/elemental/blob/main/.github/elemental-iso-add-registration

## Issues Found
- The DHCP example only served `ipxe.efi`, which is incomplete for mixed PXE environments and omitted the required iPXE chainloader download step. I updated the boot server and DHCP snippets to download `ipxe.efi` and `undionly.kpxe`, define DHCP option 93, and hand out the correct loader by client firmware.
- The original iPXE boot script used unsupported or incorrect Elemental kernel arguments such as `elemental.registration.url` and `elemental.registration.uri`. I replaced these with a supported flow that serves the MachineRegistration-generated `livecd-cloud-config.yaml` file and injects it during initramfs.
- The ISO extraction step assumed fixed paths like `/boot/vmlinuz`; current Elemental media exposes the required network-boot artifacts as `linux`, `initrd`, and `rootfs.squashfs`. I corrected the extraction commands accordingly.
- The registration step implied that registration URL, CA handling, install device, and reboot settings should be passed as ad hoc kernel parameters. I changed this to download the registration file from `.status.registrationURL`, which is the documented Elemental mechanism.
- The QEMU test command would not actually exercise the documented boot flow because it had no boot artifacts, no install disk, and no workable PXE/TFTP configuration. I replaced it with a working QEMU smoke test that boots the extracted Elemental kernel and initrd and fetches the registration file from the host HTTP server.
- The DHCP lease check used only one distro-specific lease path. I widened it to match common ISC DHCP lease locations.
- The conclusion still referred to embedding registration parameters directly in the iPXE script after the technical corrections were applied. I updated the conclusion to reflect the supported registration-file flow.

## Review Notes
- The revised Step 6 is a boot-flow smoke test rather than a full end-to-end PXE ROM test. For full PXE validation, a VM or bare-metal test on the same L2 network as the DHCP/TFTP server is still advisable.
- The registration download example follows current Elemental quickstart guidance and uses `--no-check-certificate`. In environments with a trusted public or private CA already installed on the boot server, that flag should be omitted.
