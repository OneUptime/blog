# Validation Summary: How to Configure Harvester SR-IOV for Network Performance - Networking

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Harvester
- SR-IOV
- KubeVirt
- PCI passthrough
- `pcidevices-controller`
- `kubectl`
- Linux guest networking

## Sources Consulted
- Harvester Add-ons documentation: https://docs.harvesterhci.io/v1.6/advanced/addons/
- Harvester PCI Devices documentation: https://docs.harvesterhci.io/v1.6/advanced/addons/pcidevices/
- Harvester Live Migration documentation: https://docs.harvesterhci.io/v1.6/vm/live-migration
- KubeVirt Host Devices Assignment: https://kubevirt.io/user-guide/compute/host-devices/
- KubeVirt Interfaces and Networks: https://kubevirt.io/user-guide/network/interfaces_and_networks/
- Harvester `pcidevices-controller` repository: https://github.com/harvester/pcidevices
- Harvester `PCIDeviceClaim` sample: https://github.com/harvester/pcidevices/blob/master/sample/pcideviceclaim.yaml

## Issues Found
- The original post used a generic Kubernetes SR-IOV workflow instead of Harvester's documented `pcidevices-controller` workflow. I replaced the procedure so it now uses Harvester add-ons, `SRIOVNetworkDevice` discovery, VF creation, and PCI passthrough.
- The original VF creation step instructed readers to write directly to `sriov_numvfs` and persist it with a `udev` rule. That is not Harvester's documented approach, and the `udev` example used an incorrect sysfs path pattern. I replaced it with Harvester's supported VF creation flow.
- The original post told readers to manually install `sriov-network-device-plugin` and create a `NetworkAttachmentDefinition`. That is not the Harvester-documented VM workflow for SR-IOV NICs, so those steps were removed.
- The original device-plugin example selected VFs using the `iavf` driver, but KubeVirt host device assignment requires the device to be bound to `vfio-pci`. I replaced that section with a `PCIDeviceClaim`-based passthrough step and explained the `vfio-pci` requirement.
- The original VM example used a `sriov` network interface and extended resource request, which corresponds to a Multus/KubeVirt SR-IOV network setup rather than Harvester's documented VF passthrough flow. I replaced it with Harvester VM attachment instructions.
- The latency claim promised "sub-microsecond latency", which is too specific to state generically without hardware- and workload-specific benchmarking. I softened the wording to "lower latency".
- The best-practice note about keeping two VFs free for management traffic was unsupported. Harvester's actual guidance is to avoid using host-owned management or VLAN NICs for passthrough, so I corrected that guidance.
- I added two important Harvester-specific caveats from the official docs: PCI passthrough devices prevent live migration, and clusters with multiple identical PCI devices should use node-specific scheduling to avoid incorrect placement.

## Review Notes
- Harvester's SR-IOV network-device workflow is available as of Harvester v1.2.0.
- In the corrected version, the VF is exposed to the guest as a PCI device, not as a Harvester-managed VM network attachment. Guest drivers and IP configuration must therefore be handled inside the VM.
- The post still references KubeVirt because Harvester uses KubeVirt under the hood, but the implementation steps are now Harvester-specific.
