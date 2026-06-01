# Validation Summary: How to Enable Nested Virtualization on an Azure Virtual Machine

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Virtual Machines
- Azure VM sizes and security types
- Nested virtualization
- Hyper-V
- Windows Server PowerShell
- Hyper-V NAT networking
- Linux KVM
- libvirt and virt-install
- cloud-init

## Sources Consulted
- Run Hyper-V in a virtual machine with nested virtualization: https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/enable-nested-virtualization
- Set up a NAT network for Hyper-V: https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/setup-nat-network
- Hyper-V system requirements on Windows and Windows Server: https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/system-requirements-for-hyper-v-on-windows
- Azure CLI `az vm create`: https://learn.microsoft.com/en-us/cli/azure/vm?view=azure-cli-latest
- Azure VM Dv3 sizes: https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/dv3-series
- Azure VM Dsv4 sizes: https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/dsv4-series
- Azure VM Ev5 sizes: https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/memory-optimized/ev5-series
- Azure VM Fsv2 sizes: https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/compute-optimized/fsv2-series
- Azure VM Dalsv6 sizes: https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/dalsv6-series
- Azure VM Easv6 sizes: https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/memory-optimized/easv6-series
- Hyper-V `Add-VMDvdDrive`: https://learn.microsoft.com/en-us/powershell/module/hyper-v/add-vmdvddrive
- Hyper-V `Set-VM`: https://learn.microsoft.com/en-us/powershell/module/hyper-v/set-vm
- Ubuntu `cloud-image-utils` package: https://packages.ubuntu.com/jammy/cloud-image-utils
- libvirt `virt-install` manual: https://www.mankier.com/1/virt-install

## Issues Found
- The post said nested virtualization requires Intel processors with VT-x and EPT. Current Azure VM size documentation also lists supported AMD v6 families, so I changed the guidance to rely on each Azure VM size page's Nested Virtualization support status.
- The supported VM family list omitted Fsv2 and incorrectly said all F-series sizes do not support nested virtualization. I added Fsv2 and narrowed the unsupported statement to B-series and A-series, with a caveat for AMD families.
- The Azure CLI VM creation example did not set `--security-type Standard`. Microsoft documents Standard security type as required for nested virtualization in Azure VMs, so I added it.
- The Hyper-V verification text said `systeminfo` should show all Hyper-V requirements after installing Hyper-V. On an active Hyper-V host, `systeminfo` normally reports that a hypervisor has been detected instead, so I corrected the explanation.
- The Linux CPU flag comment only mentioned `vmx`. I updated it to mention `svm` for AMD-V as well.
- The Ubuntu package installation command omitted `qemu-utils` and `cloud-image-utils`, even though later examples use `qemu-img` and `cloud-localds`. I added both packages.
- The MAC spoofing example implied direct nested VM networking was appropriate and required for Azure. Microsoft documents NAT as the option for public cloud environments where MAC spoofing is not possible, so I replaced the snippet with Azure-specific guidance to prefer NAT.
- The Hyper-V VM creation example used `Set-VMDvdDrive` immediately after creating a Generation 2 VM. Microsoft documents `Add-VMDvdDrive` for adding a DVD drive, so I changed the command.
- The wrap-up repeated an incomplete VM family list. I generalized it to "pick the right VM size" to avoid contradicting the corrected size guidance.

## Review Notes
The remaining Azure CLI, PowerShell, Hyper-V NAT, KVM, libvirt, and cloud-init examples are technically consistent with the referenced documentation. For production-quality lab automation, the article could later add explicit nested guest IP/DNS assignment for Hyper-V NAT and avoid exposing VNC on `0.0.0.0` without firewall controls, but the current examples are acceptable for a technical tutorial after the corrections above.
