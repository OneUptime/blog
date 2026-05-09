# Validation Summary: Troubleshoot Calico VPP Uplink Configuration

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico VPP dataplane
- Kubernetes
- VPP
- DPDK
- Linux NIC driver binding
- ethtool

## Sources Consulted
- Calico documentation: Primary interface configuration: https://docs.tigera.io/calico/latest/reference/vpp/uplink-configuration
- Calico documentation: VPP data plane implementation details: https://docs.tigera.io/calico/latest/reference/vpp/technical-details
- Calico documentation: VPP data plane troubleshooting: https://docs.tigera.io/calico/latest/operations/troubleshoot/vpp
- Project Calico generated VPP manifest v3.32.0: https://raw.githubusercontent.com/projectcalico/vpp-dataplane/v3.32.0/yaml/generated/calico-vpp.yaml
- DPDK documentation: dpdk-devbind application: https://doc.dpdk.org/guides-25.07/tools/devbind.html
- DPDK documentation: Linux drivers: https://doc.dpdk.org/guides-24.07/linux_gsg/linux_drivers.html
- FD.io VPP CLI command reference: set interface state: https://s3-docs.fd.io/vpp/18.07/clicmd_src_vnet.html
- FD.io VPP debug CLI index: https://docs.fd.io/vpp/19.01/clicmd.html
- Local ethtool 6.7 help output for `-G` and `-i` options

## Issues Found
- The log command used `-c vpp-manager`, but the current generated Calico VPP DaemonSet names the container `vpp`. Updated the command to `-c vpp`.
- The post referred to a PCI address setting in the ConfigMap, but Calico VPP configures uplinks through `CALICOVPP_INTERFACES.uplinkInterfaces[].interfaceName`. Updated the diagnosis and conclusion to reference interface names instead.
- The IOMMU guidance only mentioned `intel_iommu=on`. Updated it to include `amd_iommu=on` for AMD hosts and clarified that IOMMU is required for the default secure `vfio-pci` mode.
- The recovery section used `systemctl stop vpp`, but Calico VPP is managed by the `calico-vpp-node` DaemonSet in the documented Kubernetes deployment. Replaced it with deleting the affected DaemonSet pod.
- The restart command selected pods with `app=calico-vpp-node`, but the generated manifest uses `k8s-app=calico-vpp-node`. Updated the selector.

## Review Notes
The remaining examples are operationally plausible but environment-dependent. Interface names, PCI addresses, Linux driver names, and ring buffer sizes must be adjusted for the affected host and NIC driver.
