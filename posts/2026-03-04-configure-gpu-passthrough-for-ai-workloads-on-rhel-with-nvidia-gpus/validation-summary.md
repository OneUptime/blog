# Validation Summary: How to Configure GPU Passthrough for AI Workloads on RHEL with NVIDIA GPUs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- KVM/libvirt
- VFIO PCI passthrough
- NVIDIA GPUs and CUDA drivers
- IOMMU, Intel VT-d, and AMD-Vi
- grubby, dracut, dnf, lspci, virsh, and nvidia-smi

## Sources Consulted
- Red Hat Enterprise Linux 9 Configuring and managing virtualization: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_virtualization/configuring_and_managing_virtualization
- Red Hat Enterprise Linux 9 Managing virtual devices: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/managing-virtual-devices_configuring-and-managing-virtualization
- Red Hat Virtualization NVIDIA GPU passthrough documentation: https://docs.redhat.com/en/documentation/red_hat_virtualization/4.3/html/setting_up_an_nvidia_gpu_for_a_virtual_machine_in_red_hat_virtualization/proc_nvidia_gpu_passthrough_nvidia_gpu_passthrough
- libvirt domain XML format: https://libvirt.org/formatdomain.html
- NVIDIA CUDA Installation Guide for Linux: https://docs.nvidia.com/cuda/cuda-installation-guide-linux/
- Linux kernel command-line parameters: https://docs.kernel.org/admin-guide/kernel-parameters.html

## Issues Found
- The prerequisites said SR-IOV must be enabled in firmware. SR-IOV is required for SR-IOV virtual-function assignment, but it is not a prerequisite for plain PCI GPU passthrough. Changed the prerequisite to require IOMMU only.
- The AMD IOMMU command used `amd_iommu=on iommu=pt`. Current RHEL 9 virtualization documentation uses `iommu=pt` for AMD-Vi hosts. Updated the AMD command accordingly.
- The libvirt host device XML omitted the documented `<driver name='vfio'/>` element used in Red Hat's PCI passthrough example. Added it while keeping `managed='yes'`.
- The final verification section called `nvidia-smi -q | grep "Product Name"` a benchmark and claimed it proved no virtualization overhead. That command verifies GPU visibility/model, not performance. Renamed the section and softened the final claim to "minimal virtualization overhead."

## Review Notes
The NVIDIA repository command is version-specific to RHEL 9 x86_64 and matches NVIDIA's documented RHEL network repository pattern. For production use, readers should also verify that their GPU model and server platform are supported by their RHEL, NVIDIA driver, and hardware vendor support matrices.
