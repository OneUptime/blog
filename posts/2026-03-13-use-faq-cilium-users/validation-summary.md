# Validation Summary: Use the Cilium User FAQ

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Cilium
- Hubble
- Kubernetes
- CiliumNetworkPolicy
- eBPF/BPFFS
- kube-proxy replacement

## Sources Consulted
- Cilium Troubleshooting: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium DNS-Based Policies: https://docs.cilium.io/en/stable/security/dns/
- Cilium System Requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium Kubernetes Without kube-proxy: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium Hubble Setup: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium Hubble CLI Flow Inspection: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Cilium CLI Command Reference: https://docs.cilium.io/en/latest/cmdref/cilium/
- Kubernetes Node Debugging: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/

## Issues Found
- The post used `cilium endpoint list` and `cilium service list`, but current Cilium troubleshooting documentation uses the in-agent `cilium-dbg endpoint list` and `cilium-dbg service list` commands. Updated the examples to execute `cilium-dbg` inside a Cilium pod with `kubectl -n kube-system exec`.
- The DNS egress policy snippet mixed label forms for kube-dns. Updated the labels to the Cilium-documented Kubernetes label source form and added an explicit DNS L7 rule so DNS queries are allowed and observable.
- The high CPU section referred to "Felix/Cilium Agent"; Felix is a Calico component, not a Cilium component. Renamed the section to "Cilium Agent".
- The high CPU section suggested patching `kube-proxy-replacement` to `false` as an iptables refresh tuning step. That is not a valid Cilium CPU tuning recommendation and can alter service handling behavior. Replaced it with `cilium-dbg status --verbose`, matching Cilium's troubleshooting guidance for agent and controller health.
- The BPFFS remount example used `kubectl debug` without a privileged debug profile. Kubernetes documents that node debug pods are not privileged by default and recommends `--profile=sysadmin` when privileged access is needed. Added `--profile=sysadmin` to the remount command.
- The Hubble sampling ConfigMap lookup used a JSONPath form that may not handle the hyphenated key reliably. Updated it to bracket notation for `monitor-aggregation`.
- The kube-proxy removal example patched the DaemonSet with a dummy node selector. Cilium's kube-proxy replacement guide recommends deleting the kube-proxy DaemonSet and ConfigMap for existing installations. Updated the commands accordingly.

## Review Notes
The post is version-neutral. The reviewed commands align with Cilium stable documentation as of the review date, but operational behavior can still vary by Cilium installation method, Kubernetes distribution, and whether Hubble Relay is enabled.
