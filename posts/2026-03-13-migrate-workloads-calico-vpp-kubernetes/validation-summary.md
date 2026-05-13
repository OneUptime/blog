# Validation Summary: How to Migrate Existing Workloads to Calico VPP on Kubernetes

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Calico
- Calico VPP data plane
- Kubernetes
- Tigera Operator
- VPP
- DPDK / VFIO
- kubectl

## Sources Consulted
- Calico documentation: Get started with VPP networking - https://docs.tigera.io/calico/latest/getting-started/kubernetes/vpp/getting-started
- Calico documentation: Primary interface configuration - https://docs.tigera.io/calico/latest/reference/vpp/uplink-configuration
- Calico documentation: VPP data plane implementation details - https://docs.tigera.io/calico/latest/reference/vpp/technical-details
- Calico documentation: VPP data plane troubleshooting - https://docs.tigera.io/calico/latest/operations/troubleshoot/vpp
- Calico VPP generated manifest v3.31.0 - https://raw.githubusercontent.com/projectcalico/vpp-dataplane/v3.31.0/yaml/generated/calico-vpp.yaml
- Calico VPP Installation resource v3.31.0 - https://raw.githubusercontent.com/projectcalico/vpp-dataplane/v3.31.0/yaml/calico/installation-default.yaml

## Issues Found
- The prerequisites stated that DPDK-compatible NICs and hugepages were required. Calico VPP supports multiple uplink drivers, and hugepages are optional except for drivers that require them. Updated the prerequisite to reflect this.
- The hugepage setup wrote to `/etc/sysctl.d/99-hugepages.conf` but did not apply the setting or restart kubelet. Updated the example to use `sysctl -p` and restart kubelet so Kubernetes sees hugepage capacity.
- The node preparation section instructed users to bind the data interface with `dpdk-devbind.py`. Current Calico VPP documentation configures the uplink driver through `CALICOVPP_INTERFACES`; manual binding is not part of the basic documented flow. Replaced this with loading `vfio-pci` and added the correct DPDK configuration note.
- The deployment command cloned the repository and referenced `yaml/calico-vpp.yaml`, which is not the current generated manifest path. Updated it to download the versioned `yaml/generated/calico-vpp.yaml` manifest.
- The post used the legacy `CALICOVPP_INTERFACE` variable. Current documentation marks it as legacy and recommends `CALICOVPP_INTERFACES`. Updated the configuration command and explanatory text.
- The deployment step omitted switching the operator Installation resource to `linuxDataplane: VPP`. Added the `kubectl patch installation.operator.tigera.io default` command for operator-based installations.
- The rollout section referred to "VPP manager pods"; the current manifest creates a `calico-vpp-node` DaemonSet with `vpp` and `agent` containers. Updated the wording and the `kubectl exec` command to target the `vpp` container.

## Review Notes
The post now aligns with the current Calico VPP documentation for operator-based Calico installations. A production migration should still be planned as a maintenance operation because driver choice, service CIDR, node interface names, and unsupported VPP features can vary by cluster.
