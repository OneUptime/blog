# Validation Summary: How to Configure PCI Passthrough for VMs on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Linux kernel IOMMU and VFIO
- KVM/QEMU virtualization
- libvirt domain XML
- virsh
- PCI passthrough
- GRUB kernel command line configuration

## Sources Consulted
- Linux kernel VFIO documentation: https://docs.kernel.org/6.15/driver-api/vfio.html
- Linux kernel command-line parameter documentation: https://docs.kernel.org/6.14/admin-guide/kernel-parameters.html
- Linux kernel x86 IOMMU documentation: https://docs.kernel.org/6.1/x86/iommu.html
- libvirt domain XML documentation: https://libvirt.org/formatdomain.html
- libvirt virsh manual: https://www.libvirt.org/manpages/virsh.html
- Local `modprobe.d(5)` manual page
- Local `update-initramfs -h` output
- LKML discussion of the ACS override patch: https://lkml.org/lkml/2013/6/18/738
- NVIDIA vGPU known issue documentation for Error Code 43 examples: https://docs.nvidia.com/vgpu/19.0/known-issues/bug-1735002-vgpu-passthrough-gpu-does-not-start.html

## Issues Found
- The AMD GRUB example used `amd_iommu=on`, but current Linux kernel command-line documentation does not list `on` as a valid `amd_iommu=` value. Changed the AMD example to use `iommu=pt`; AMD IOMMU support is normally initialized automatically when available and enabled by firmware.
- The post verified IOMMU with `dmesg | grep -i "IOMMU enabled"`, which is too narrow because kernel messages vary by platform. Changed it to search for `DMAR`, `IOMMU`, and `AMD-Vi`.
- The IOMMU group explanation said all devices in a group must be passed through to the same VM. VFIO documentation treats the group as the ownership boundary, but bridge devices may appear in the group and are usually not bound to `vfio-pci`. Updated the wording to distinguish endpoint devices from bridges.
- The ACS override wording implied a normal Ubuntu setting. Clarified that `pcie_acs_override=downstream,multifunction` requires a kernel that includes the ACS override patch and can weaken IOMMU isolation.
- The second binding method was labeled as a boot-time script but did not create a systemd unit or other boot hook. Renamed it to a manual script and clarified that it should be run before starting the VM.
- The manual binding script reported the driver by listing files inside the driver directory, which would not reliably print `vfio-pci`. Updated it to use `readlink` and `basename`, and stripped the `0x` prefix from sysfs vendor/device IDs before writing to `vfio-pci/new_id`.
- The libvirt XML section mixed `<graphics>` and `<features>` without explaining that they belong in different parts of the domain XML. Clarified that `<graphics>` belongs under `<devices>` and `<features>` is a top-level `<domain>` child.
- The NVIDIA Error 43 troubleshooting note stated that Error 43 is NVIDIA hypervisor detection. Updated it to say this was often true for older NVIDIA guest drivers, because Error 43 can also be caused by other passthrough or vGPU issues.

## Review Notes
The core tutorial flow is valid for traditional VFIO group-based passthrough with libvirt. Future improvements could mention newer VFIO/IOMMUFD device cdev interfaces and Ubuntu-version-specific NVIDIA driver package names, but those omissions do not make the current guide incorrect.
