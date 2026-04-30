# Validation Summary: How to Configure Harvester SR-IOV for Network Performance

## Status
validated

## Post Type
Guide

## Technologies Covered
- Harvester
- Kubernetes
- KubeVirt
- SR-IOV
- PCI passthrough
- Linux kernel boot configuration
- Network performance testing with `iperf3`

## Sources Consulted
- Harvester PCI Devices documentation: https://docs.harvesterhci.io/v1.7/advanced/addons/pcidevices/
- Harvester Add-ons documentation: https://docs.harvesterhci.io/v1.7/advanced/addons/
- Harvester Live Migration documentation: https://docs.harvesterhci.io/v1.7/vm/live-migration/
- Harvester Configuration documentation: https://docs.harvesterhci.io/v1.7/install/harvester-configuration/
- Harvester Operating System documentation: https://docs.harvesterhci.io/v1.7/troubleshooting/os/
- Harvester `pcidevices-controller` source repository: https://github.com/harvester/pcidevices

## Issues Found
- The original post described a generic Kubernetes SR-IOV CNI workflow that is not Harvester’s documented SR-IOV path. I replaced the `sriov-cni` and `sriov-network-device-plugin` installation steps with Harvester’s `pcidevices-controller` add-on workflow.
- The original Harvester host instructions used `/etc/default/grub` and `grub2-mkconfig`, which are not the correct persistent path for Harvester’s immutable OS. I replaced them with Harvester’s documented `os.additionalKernelArguments` option for new installs and the documented persistent GRUB edit workflow for existing nodes.
- The original VF provisioning method used `echo` to `sriov_numvfs` plus a custom systemd unit. Harvester documents VF creation through `SRIOVNetworkDevice` objects managed by `pcidevices-controller`, so I updated the post to use that flow.
- The original ConfigMap, `NetworkAttachmentDefinition`, and VM YAML were based on Multus SR-IOV networking rather than Harvester’s documented PCI passthrough model for SR-IOV VFs. I replaced those sections with the Harvester flow: create VFs, enable passthrough on the resulting VF `PCIDevice` objects, then attach them to the VM as PCI devices.
- The original post presented fixed throughput and latency expectations that were too specific to be broadly reliable. I replaced them with a technically accurate note that results depend on NIC model, guest drivers, MTU, NUMA placement, switch configuration, and test path.
- I added the Harvester-specific caution that host-owned NICs used for management or VM uplinks should not be used for SR-IOV passthrough, which was missing from the original instructions.

## Review Notes
- The corrected post now aligns with Harvester v1.7 documentation and notes that `SRIOVNetworkDevice` support is available as of Harvester v1.2.0.
- Harvester treats host device passthrough such as PCI devices as non-migratable, so SR-IOV-enabled VMs should be reserved for workloads that prioritize raw network performance over mobility.
- Harvester documents a known scheduling caveat when a cluster contains multiple identical PCI devices; the post now advises pinning the VM to a specific node in that situation.
