# Validation Summary: How to Troubleshoot Installation Issues with Calico VPP on Kubernetes

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico VPP data plane
- Kubernetes
- VPP
- DPDK
- Linux hugepages
- vfio-pci
- kubectl

## Sources Consulted
- Calico documentation: VPP data plane troubleshooting, https://docs.tigera.io/calico/latest/operations/troubleshoot/vpp
- Calico documentation: Get started with VPP networking, https://docs.tigera.io/calico/latest/getting-started/kubernetes/vpp/getting-started
- Calico documentation: Primary interface configuration, https://docs.tigera.io/calico/latest/reference/vpp/uplink-configuration
- Project Calico VPP generated manifests, https://raw.githubusercontent.com/projectcalico/vpp-dataplane/v3.31.0/yaml/generated/calico-vpp.yaml and https://raw.githubusercontent.com/projectcalico/vpp-dataplane/v3.31.0/yaml/generated/calico-vpp-nohuge.yaml
- DPDK documentation: dpdk-devbind application, https://doc.dpdk.org/guides-25.07/tools/devbind.html
- Kubernetes kubectl reference: logs, exec, and describe commands, https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- The pod examples referred to a generic VPP manager pod and omitted the namespace on `kubectl describe`. Calico VPP deploys a `calico-vpp-node` DaemonSet in the `calico-vpp-dataplane` namespace, so the commands now select `k8s-app=calico-vpp-node` and include `-n calico-vpp-dataplane`.
- The log examples did not specify containers even though the Calico VPP pod has multiple containers. The commands now explicitly read the `vpp` and `agent` container logs.
- The hugepages section stated that VPP always fails without hugepages. Calico publishes a no-hugepage manifest and documents hugepages as optional for some hardware and drivers, so the wording now says VPP can fail when the selected manifest or interface driver requires hugepages.
- The hugepages persistence example did not reload sysctl settings or restart kubelet. The post now includes `sysctl --system` and a kubelet restart so Kubernetes detects updated hugepage capacity.
- The DPDK examples used `dpdk-devbind.py`; current DPDK documentation shows `dpdk-devbind`. The commands now use the documented command name.
- The VPP log command used `/var/log/vpp/vpp.log`, but Calico VPP examples use `/var/run/vpp/vpp.log` when a file log is configured, and official troubleshooting recommends VPP/container logs. The post now checks the `vpp` container logs, `vppctl show log`, and only checks `/var/run/vpp/vpp.log` when file logging is configured.
- The interface configuration command grepped for a generic `INTERFACE` string. The current Calico VPP ConfigMap key is `CALICOVPP_INTERFACES`, so the command now checks that key.

## Review Notes
The post is technically relevant and accurate after the fixes. `kubectl` was not installed in the local environment, so Kubernetes CLI syntax was verified against official Kubernetes reference documentation instead of local help output.
