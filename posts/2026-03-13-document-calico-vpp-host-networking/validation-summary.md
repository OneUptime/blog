# Validation Summary: Document Calico VPP Host Networking for Operators

## Status
validated

## Post Type
Operational guide

## Technologies Covered
- Calico VPP dataplane
- Kubernetes
- VPP
- DPDK
- Linux hugepages and CPU isolation
- Kubernetes node troubleshooting with crictl

## Sources Consulted
- Calico VPP getting started documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/vpp/getting-started
- Calico VPP primary interface configuration: https://docs.tigera.io/calico/latest/reference/vpp/uplink-configuration
- Calico VPP implementation details: https://docs.tigera.io/calico/latest/reference/vpp/technical-details
- Calico VPP host network configuration: https://docs.tigera.io/calico/latest/reference/vpp/host-network
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes crictl node debugging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/crictl/
- Linux kernel CPU isolation documentation: https://docs.kernel.org/admin-guide/cpu-isolation.html
- FD.io VPP interface command reference: https://fd.io/docs/vpp/v2009/reference/cmdreference/interface/basic
- Intel supported operating systems and Linux driver matrix for Ethernet controllers: https://www.intel.com/content/www/us/en/support/articles/000055236/ethernet-products/gigabit-ethernet-controllers-up-to-2-5gbe.html

## Issues Found
- The hardware requirements stated a universal x86_64/SSE4.2/AVX2 CPU requirement. Calico's base requirements are broader, and VPP CPU feature requirements depend on the image/build and driver path, so this was changed to require documenting the supported architecture and CPU features for the deployed build.
- The hugepage requirement listed fixed memory amounts by NIC speed. Calico VPP documentation gives an example requirement of at least 512 x 2MB hugepages for hardware that uses more efficient drivers, and DPDK/native driver requirements vary by configuration. The text was changed to reflect that.
- The network interface table implied DPDK is required for full VPP performance. Calico VPP also supports AF_XDP and native VPP drivers, with native drivers documented as the most performant option for supported hardware. The table now refers to DPDK or supported native VPP drivers.
- The verified hardware table listed Intel X550 as `ixgbe/i40e`. Intel documents X550 under the `ixgbe` Linux driver; the table now lists `ixgbe`.
- The incident runbook used `systemctl status vpp`, `journalctl -u vpp`, and `systemctl stop vpp`. In Calico VPP for Kubernetes, VPP is started and managed by `vpp-manager` inside the `calico-vpp-node` pod, not by a host `vpp` systemd unit. The runbook now uses `crictl` to inspect and stop the VPP container from the node console and notes that `vpp-manager` restores Linux interface configuration when VPP stops.

## Review Notes
The performance baseline values are plausible as examples but remain environment-specific. Operators should measure and document baselines for their exact NIC firmware, driver, CPU pinning, VPP version, traffic profile, MTU, and Kubernetes/Calico configuration.
