# Validation Summary: How to Set Up Talos Linux on Nocloud Platform

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Talos Linux
- Talos nocloud platform
- cloud-init NoCloud datasource
- Kubernetes
- QEMU/KVM
- Proxmox
- libvirt/virt-install
- ISO9660 configuration media

## Sources Consulted
- Talos Linux v1.9 nocloud platform documentation: https://docs.siderolabs.com/talos/v1.9/platform-specific-installations/cloud-platforms/nocloud
- Talos Linux v1.9 boot assets documentation: https://docs.siderolabs.com/talos/v1.9/platform-specific-installations/boot-assets
- Talos Linux kernel parameter reference: https://docs.siderolabs.com/talos/v1.12/reference/kernel
- Talos Linux machine configuration acquisition documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/acquire
- cloud-init NoCloud datasource documentation: https://docs.cloud-init.io/en/latest/reference/datasources/nocloud.html
- Talos Image Factory asset URLs, verified with HTTP HEAD requests: https://factory.talos.dev/

## Issues Found
- The nocloud raw image download URLs pointed to GitHub release assets that return 404 for `nocloud-amd64.raw.xz` and `nocloud-arm64.raw.xz` at v1.9.0. Updated both commands to use Talos Image Factory URLs for the vanilla v1.9.0 nocloud images.
- The network-based configuration section used `talos.config=http://...`, but Talos documents `talos.config` as a `metal` platform URL mechanism. For the `nocloud` platform, Talos v1.9 documents HTTP-based discovery through the NoCloud SMBIOS serial string, for example `ds=nocloud-net;s=http://.../configs/`. Updated the section and command example accordingly.
- The network URL example stored the machine config as `controlplane.yaml`, but NoCloud HTTP discovery fetches source files by final path components such as `user-data`, `meta-data`, and `network-config`. Updated the example to publish the machine config as `user-data` under a directory URL.
- The troubleshooting section said the volume label must be exactly lowercase `cidata` and case-sensitive. Talos v1.9 and cloud-init documentation accept `cidata` or `CIDATA`. Updated the note.

## Review Notes
The post now matches the Talos v1.9 nocloud documentation for the two supported delivery methods: SMBIOS serial number with an HTTP seed URL, and a local CD-ROM/USB filesystem labeled `cidata` or `CIDATA`. The static `network-config` example uses cloud-init network configuration version 2 syntax; Talos documentation also shows version 1, but NoCloud supports network configuration as a separate `network-config` source file.
