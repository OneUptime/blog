# Validation Summary: How to Pass-Through PCI Devices to Talos Linux VMs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- IOMMU (Intel VT-d / AMD-Vi)
- VFIO (Virtual Function I/O)
- QEMU/KVM
- Proxmox VE (qm CLI)
- talosctl
- Kubernetes (Multus CNI / NetworkAttachmentDefinition)

## Sources Consulted
- [Proxmox VE — PCI(e) Passthrough wiki](https://pve.proxmox.com/wiki/PCI(e)_Passthrough)
- [Proxmox VE — qm.conf(5) manual](https://pve.proxmox.com/pve-docs/qm.conf.5.html)
- [Proxmox VE — qm(1) manual](https://pve.proxmox.com/pve-docs/qm.1.html)
- [Talos Linux documentation — siderolabs/talos](https://www.talos.dev/)
- Kernel.org documentation on `intel_iommu`, `amd_iommu`, and `iommu=pt` parameters
- QEMU `vfio-pci` device documentation
- Multus CNI / k8s.cni.cncf.io NetworkAttachmentDefinition spec

## Issues Found
1. **Proxmox hostpci multiple-device syntax was incorrect.** The post used `qm set 100 --hostpci0 03:00.0,03:00.1`. In the `hostpci` parameter, commas are reserved for option key/value pairs (e.g. `rombar=1`, `pcie=1`), and multiple PCI IDs within a single `hostpciN` entry must be separated by semicolons. As written, `03:00.1` would be parsed as an unknown option and the command would fail. Fixed to `qm set 100 --hostpci0 '03:00.0;03:00.1'` (with shell quoting to escape the semicolon) and added a short comment explaining the alternative shortened `03:00` form which grabs all functions of the device.

2. **Wrong talosctl resource for listing PCI devices.** The post claimed `talosctl -n <NODE_IP> get hardwareaddresses` lists PCI devices, but `hardwareaddresses` is the network resource that exposes link-layer (MAC) addresses. The correct resource for PCI devices in Talos is `pcidevices`. Fixed to `talosctl -n <NODE_IP> get pcidevices`.

## Review Notes
- The IOMMU enablement steps, kernel parameters (`intel_iommu=on`, `amd_iommu=on`, `iommu=pt`), VFIO binding workflow, and QEMU `-device vfio-pci,host=...` syntax are accurate.
- The dmesg example line `AMD-Vi: AMD IOMMUv2 loaded` is only emitted when the optional `amd_iommu_v2` module is loaded (which requires ATS/PASID hardware support); on most AMD systems you will instead see lines like `AMD-Vi: Found IOMMU ...` or `AMD-Vi: Initialized for Passthrough Mode`. Either is fine evidence that IOMMU is active, so the example is not wrong, just not the most universal one. Left as-is.
- `update-initramfs -u` is Debian/Ubuntu-specific; users on RHEL/Fedora derivatives will need `dracut -f` instead. The post does not call this out, but it is consistent with the rest of its Debian-flavoured examples (`update-grub`, `/etc/default/grub`), so the convention is internally consistent.
- The Multus `NetworkAttachmentDefinition` example uses CNI spec version `0.3.1` and the `host-device` CNI plugin, both of which are valid and still supported. Newer deployments could use `1.0.0`, but `0.3.1` remains widely accepted.
