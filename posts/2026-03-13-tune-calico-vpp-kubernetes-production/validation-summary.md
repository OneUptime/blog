# Validation Summary: How to Tune Calico VPP on Kubernetes for Production

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico VPP dataplane
- FD.io VPP
- Kubernetes ConfigMaps and DaemonSets
- DPDK and vfio-pci device binding
- Linux hugepages and NUMA
- SR-IOV virtual functions

## Sources Consulted
- Calico VPP getting started documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/vpp/getting-started
- Calico VPP primary interface configuration documentation: https://docs.tigera.io/calico/latest/reference/vpp/uplink-configuration
- Calico VPP troubleshooting documentation: https://docs.tigera.io/calico/latest/operations/troubleshoot/vpp
- Project Calico VPP generated manifests: https://raw.githubusercontent.com/projectcalico/vpp-dataplane/v3.31.0/yaml/generated/calico-vpp.yaml
- Project Calico VPP DPDK generated manifests: https://raw.githubusercontent.com/projectcalico/vpp-dataplane/v3.31.0/yaml/generated/calico-vpp-eks-dpdk.yaml
- FD.io VPP startup configuration reference: https://docs.fd.io/vpp/25.10/configuration/reference.html
- FD.io VPP CPU usage troubleshooting: https://docs.fd.io/vpp/22.06.1/gettingstarted/troubleshooting/cpuusage.html
- DPDK devbind documentation: https://doc.dpdk.org/guides-25.07/tools/devbind.html
- Linux kernel SR-IOV sysfs ABI documentation: https://kernel.org/doc/html/next/admin-guide/abi-testing.html

## Issues Found
- The post referenced tuning a `vector-size` parameter as a primary throughput lever, but the official VPP startup configuration docs do not expose this as a normal Calico VPP tuning parameter. Changed the wording to focus on documented levers: buffers, workers, queues, and uplink driver selection.
- The prerequisites stated that DPDK-compatible NICs and at least 1024 2MB hugepages were required. Calico supports multiple VPP drivers, and its general guidance lists 512 2MB hugepages when hugepages are needed. Updated the prerequisites accordingly.
- The buffer example patched a non-documented `vpp-config` ConfigMap key. Calico VPP uses the `calico-vpp-config` ConfigMap and stores VPP startup configuration in `CALICOVPP_CONFIG_TEMPLATE`. Updated the snippet and commands to edit and apply that ConfigMap, then restart the `calico-vpp-node` DaemonSet.
- The CPU worker snippet was not tied to the Calico configuration surface. Added the correct `CALICOVPP_CONFIG_TEMPLATE` context.
- The interrupt-mode example used a DPDK startup stanza with queue counts but did not actually configure interrupt mode. Replaced it with Calico's documented `CALICOVPP_INTERFACES` fields, including `rxMode: "interrupt"` and queue counts.
- The SR-IOV section claimed virtual functions should be used instead of physical functions for the highest throughput. That is too absolute and hardware-dependent. Reworded it to say SR-IOV VFs can be used with a supported VPP driver.
- The monitoring commands targeted a `<vpp-manager-pod>` and used `show interface statistics`, which is not the documented VPP CLI form. Updated them to execute in the `vpp` container of a `calico-vpp-node` pod and use `show interface`, `show hardware-interfaces`, and `show runtime`.
- The `show runtime` description claimed per-worker packet processing rates. Official VPP documentation describes runtime counters such as average vectors per node. Updated the description to match.

## Review Notes
The remaining numeric values, such as `buffers-per-numa 512000` and four workers, are examples rather than universal recommendations. They should be tested under the target workload and hardware because oversized buffers can prevent some drivers, such as AF_XDP, from starting.
