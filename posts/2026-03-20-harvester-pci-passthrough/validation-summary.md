# Validation Summary: How to Configure Harvester PCI Passthrough

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Harvester
- KubeVirt
- PCI passthrough
- VFIO / `vfio-pci`
- IOMMU
- GPUs
- `pcidevices-controller`
- `PCIDevice` / `PCIDeviceClaim`

## Sources Consulted
- Harvester PCI Devices documentation: https://docs.harvesterhci.io/v1.7/advanced/addons/pcidevices/
- Harvester Add-ons documentation: https://docs.harvesterhci.io/v1.7/advanced/addons/
- Harvester configuration reference (`os.additionalKernelArguments`): https://docs.harvesterhci.io/v1.7/install/harvester-configuration/
- Harvester update configuration after installation: https://docs.harvesterhci.io/v1.7/install/update-harvester-configuration/
- Harvester live migration documentation: https://docs.harvesterhci.io/v1.7/vm/live-migration/
- KubeVirt Host Devices Assignment: https://kubevirt.io/user-guide/compute/host-devices/
- Harvester `pcidevices-controller` repository: https://github.com/harvester/pcidevices
- Harvester `PCIDeviceClaim` sample: https://github.com/harvester/pcidevices/blob/master/sample/pcideviceclaim.yaml

## Issues Found
- The original post used a generic upstream Linux/KubeVirt GRUB workflow (`/etc/default/grub` and `grub2-mkconfig`) that is not correct for Harvester's immutable OS. I replaced that guidance with Harvester-specific `os.additionalKernelArguments` guidance and noted that persistent OS changes must follow Harvester's configuration workflow rather than direct GRUB edits.
- The original post told readers to manually load VFIO modules, unbind the host driver, and bind devices to `vfio-pci`. In Harvester, the supported workflow is to enable the `pcidevices-controller` add-on and prepare devices through `PCIDeviceClaim` or the UI. I replaced the manual rebinding steps with the Harvester-native claim flow.
- The original post instructed readers to edit the KubeVirt CR directly to configure `permittedHostDevices` and feature gates. Harvester's documented PCI passthrough workflow does not require readers to hand-edit the KubeVirt CR for normal PCI device attachment, so I removed that step.
- The original VM manifest reflected a generic KubeVirt example rather than Harvester's documented VM attachment flow. It also depended on undeclared assumptions such as a preexisting bootable PVC and manually requested device resources. I replaced it with the Harvester UI workflow for attaching enabled PCI devices to a VM.
- The original post did not include Harvester's documented caveat for clusters with multiple identical PCI devices. I added the node-specific scheduling guidance so readers avoid incorrect placement.
- The original GPU driver section pinned `nvidia-driver-535`, which is unnecessarily version-specific for a general Harvester guide. I changed it to the distribution-driven `ubuntu-drivers autoinstall` flow and kept the verification step generic.
- The original CUDA verification program was incomplete because it called `cudaGetDeviceCount` without including the CUDA runtime header and without checking the return code. I corrected the sample so it compiles and reports CUDA initialization failures clearly.

## Review Notes
- Harvester's PCI Devices feature is available as of Harvester v1.1.0.
- Harvester documents that VMs with PCI passthrough devices cannot be live-migrated.
- Harvester also documents that the guest-visible PCI address may differ from the host PCI address, so in-guest verification should confirm presence by device identity rather than by assuming the same address.
