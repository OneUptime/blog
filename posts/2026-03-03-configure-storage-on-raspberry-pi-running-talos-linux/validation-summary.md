# Validation Summary: How to Configure Storage on Raspberry Pi Running Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine config, system extensions, talosctl)
- Raspberry Pi 4 / 5 (EEPROM boot order, NVMe HAT, USB 3.0)
- Kubernetes (StorageClass, PersistentVolumeClaim, kubelet config)
- NFS CSI driver (kubernetes-csi/csi-driver-nfs)
- Rancher local-path-provisioner
- iSCSI / OpenEBS
- Linux sysctls (vm.dirty_*)

## Sources Consulted
- Talos disk layout docs: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/storage-and-disk-management/disk-management/layout/
- Talos Raspberry Pi installation: https://docs.siderolabs.com/talos/v1.11/platform-specific-installations/single-board-computers/rpi_generic
- Talos system extensions: https://www.talos.dev/v1.11/talos-guides/configuration/system-extensions/
- Talos Image Factory: https://factory.talos.dev/
- Talos issue #9224 (machine.install.extensions deprecation)
- Raspberry Pi EEPROM bootloader docs: https://github.com/raspberrypi/documentation/blob/master/documentation/asciidoc/computers/raspberry-pi/eeprom-bootloader.adoc
- Pi 5 NVMe benchmarks (bret.dk, Raspberry Pi Forums, Tim Moody / Medium)
- csi-driver-nfs helm charts README: https://github.com/kubernetes-csi/csi-driver-nfs/blob/master/charts/README.md

## Issues Found
1. **Invalid talosctl command** — `talosctl -n <PI_IP> disks` is not a valid command. Fixed to `talosctl -n <PI_IP> get disks` (it is a COSI resource subcommand).
2. **Outdated Talos image filename** — `metal-rpi_generic-arm64.raw` is the historical filename from when Talos shipped pre-built SBC images. In current Talos (1.5+) the Raspberry Pi image is built via the Image Factory with the `rpi_generic` overlay and the resulting file is named `metal-arm64.raw.xz`. Updated the flash example to decompress the `.xz` first and added a note about Image Factory.
3. **Inaccurate NVMe performance numbers** — The post claimed 400-800 MB/s sequential read on PCIe Gen 2 x1, which is impossible (Gen 2 x1 theoretical max is ~500 MB/s; real-world drives hit ~400-450 MB/s). Sequential write was also overstated, and the 4K random read IOPS figure (20,000-40,000) was understated by roughly an order of magnitude (real Gen 2 numbers are ~100k IOPS). Rewrote the section to give accurate Gen 2 numbers and mention the unofficial Gen 3 mode separately.
4. **Deprecated extension install field** — `machine.install.extensions` was deprecated when Image Factory shipped in Talos 1.5 and emits a warning in current versions. Replaced the iSCSI example with the current Image Factory workflow, using `machine.install.image` to reference a custom installer built with the `siderolabs/iscsi-tools` extension.

## Review Notes
- The partition layout listed in the post is accurate but slightly more detailed than the canonical "simplified" layout in the Talos docs, which conflates EFI+BOOT and omits BIOS. The post's breakdown is fine because BIOS does exist on legacy-BIOS systems; the Raspberry Pi is UEFI-booted via u-boot so the BIOS partition is not actually present on a Pi install, but this distinction is not load-bearing for the guide.
- `kubelet.extraArgs` for `container-log-max-size`, `container-log-max-files`, `image-gc-high-threshold` and `image-gc-low-threshold` still works in current Talos, although Kubernetes upstream is moving these settings into the kubelet config file. A future revision could switch to `kubelet.extraConfig` with `containerLogMaxSize`/`containerLogMaxFiles`/`imageGCHighThresholdPercent`/`imageGCLowThresholdPercent` for forward compatibility.
- The `machine.disks` USB example uses `size: 0` to grow the partition to fill the disk, which is valid per the Talos schema.
- The Raspberry Pi `BOOT_ORDER=0xf14` interpretation is correct (read right-to-left: 4=USB-MSD, 1=SD, f=restart loop).
- The NFS CSI helm repo URL and the local-path-provisioner install URL are both current and correct.
