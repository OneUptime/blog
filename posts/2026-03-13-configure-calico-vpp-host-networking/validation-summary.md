# Validation Summary: Configure Calico VPP Host Networking

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Calico VPP dataplane
- Kubernetes
- FD.io VPP
- DPDK
- Linux hugepages
- Kubernetes DaemonSets and ConfigMaps

## Sources Consulted
- Calico VPP getting started documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/vpp/getting-started
- Calico VPP primary interface configuration: https://docs.tigera.io/calico/latest/reference/vpp/uplink-configuration
- Calico VPP host network configuration: https://docs.tigera.io/calico/latest/reference/vpp/host-network
- Calico VPP troubleshooting documentation: https://docs.tigera.io/calico/latest/operations/troubleshoot/vpp
- Kubernetes HugePages documentation: https://kubernetes.io/docs/tasks/manage-hugepages/scheduling-hugepages/
- Linux HugeTLB documentation: https://www.kernel.org/doc/html/v5.9/admin-guide/mm/hugetlbpage.html
- FD.io VPP overview/configuration documentation: https://fd.io/docs/vpp/

## Issues Found
- The prerequisites implied that Linux 5.4+, DPDK-compatible NICs, hugepages, and DPDK-capable CPUs were always required. Updated them to distinguish driver-specific requirements: Linux 5.4+ for `af_xdp`, DPDK NICs for `dpdk`, and hugepages for drivers that require them.
- The post referenced `quay.io/calicovpp/`, but the current official Calico VPP manifests use `docker.io/calicovpp/`. Updated the image registry reference.
- The architecture diagram used inaccurate labels such as `tun/tap`, `vhost-user`, and `calico-agent`. Updated the labels to match the Calico VPP host tap/pod interface model and the `calico-vpp-agent` component.
- The install section applied the `master` manifest directly and omitted the required Calico operator, CRDs, and VPP installation resource. Updated the commands to use the official versioned manifests and the documented download-edit-apply flow.
- The Helm install example used a repository URL that does not expose a Helm `index.yaml` and is not part of the official Calico VPP installation path. Removed the invalid Helm example.
- The ConfigMap snippet included `CALICOVPP_FEATURE_GATES`, which is not part of the documented minimal VPP interface configuration. Removed it and kept the documented `CALICOVPP_INTERFACES` and `SERVICE_PREFIX` keys.
- The hugepage setup did not restart kubelet after dynamic allocation. Added `sudo systemctl restart kubelet`, matching Kubernetes and Calico guidance that kubelet must restart to observe newly allocated hugepages.
- The resource example had a memory limit inconsistent with the current generated manifest. Updated it to match the documented/generated `512Mi` memory request and limit example.
- The verification commands referenced a non-existent `vpp-manager` container. Updated the commands to use the actual `agent` and `vpp` containers in the `calico-vpp-node` DaemonSet.
- The conclusion said DPDK-compatible hardware was generally required and that VPP always takes over the primary NIC. Updated it to clarify that this behavior is driver-specific and especially relevant to drivers such as `dpdk`.

## Review Notes
The post is now technically aligned with Calico Open Source 3.32 documentation and Calico VPP v3.31.0 manifests. Future updates should revisit the pinned manifest versions when Calico VPP publishes newer versioned manifests.
