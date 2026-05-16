# Validation Summary: How to Generate Platform-Specific Images with Image Factory

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Image Factory (factory.talos.dev)
- Talos system extensions (siderolabs/iscsi-tools, qemu-guest-agent, vmtoolsd-guest-agent)
- AWS EC2 (AMI import via `aws ec2 import-image`, S3)
- Microsoft Azure (VHD, Blob Storage, `az image create`)
- Google Cloud Platform (raw disk image, GCS, `gcloud compute images create`)
- VMware vSphere (OVA, govc)
- QEMU/KVM (nocloud platform)
- Bare metal (ISO and raw disk, `dd`)
- Bash scripting, curl, jq, wget

## Sources Consulted
- [Image Factory site](https://factory.talos.dev/)
- [siderolabs/image-factory GitHub repository](https://github.com/siderolabs/image-factory)
- [siderolabs/extensions catalog](https://github.com/siderolabs/extensions) – verified official extension names
- [Talos Linux Image Factory docs (v1.7)](https://www.talos.dev/v1.7/learn-more/image-factory/)
- [Talos Linux Azure install guide](https://www.talos.dev/v1.9/talos-guides/install/cloud-platforms/azure/)

## Issues Found
1. **Incorrect VMware extension name** – The post referenced the extension as `siderolabs/vmtoolsd` in the schematic YAML and the recommended-extensions table. According to the official Sidero Labs extensions catalog, the correct name is `siderolabs/vmtoolsd-guest-agent` (image: `ghcr.io/siderolabs/vmtoolsd-guest-agent`). The description text was also updated to reflect that the extension provides `talos-vmtoolsd` (as stated in the upstream catalog) rather than generic open-vm-tools. Fixed in both the YAML snippet and the platform/extension reference table.

## Review Notes
- The Image Factory schematic submission endpoint (`POST https://factory.talos.dev/schematics`), the image download URL pattern (`https://factory.talos.dev/image/<schematic-id>/<version>/<filename>`), and the per-platform filenames (`aws-amd64.raw.xz`, `azure-amd64.vhd.xz`, `gcp-amd64.raw.tar.gz`, `vmware-amd64.ova`, `metal-amd64.iso`, `metal-amd64.raw.xz`, `nocloud-amd64.raw.xz`) are all correct against the current Image Factory.
- The schematic YAML structure (`customization.systemExtensions.officialExtensions` and `customization.extraKernelArgs`) matches the Image Factory schema.
- The `siderolabs/iscsi-tools` and `siderolabs/qemu-guest-agent` extension names are correct.
- The `aws ec2 import-image`, `az image create`, `gcloud compute images create`, and `govc import.ova` invocations all use valid flags for current CLI versions.
- `TALOS_VERSION="v1.7.0"` is used as the example version; readers using newer Talos versions (e.g., v1.9+) should substitute accordingly. Image Factory continues to support all current supported Talos versions.
- For QEMU/KVM the post recommends `nocloud-amd64.raw.xz`. This is appropriate when using a cloud-init/NoCloud-style workflow; for pure bare-VM-style QEMU usage `metal-amd64.raw.xz` would also be a valid choice — both are technically correct.
