# Validation Summary: Validate Azure CNI Cilium Cluster

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure CNI Powered by Cilium
- Cilium CLI and Cilium CRDs
- Kubernetes and kubectl
- eBPF networking

## Sources Consulted
- Cilium command reference: `cilium status` - https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium command reference: `cilium connectivity test` - https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium Endpoint CRD documentation - https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint/
- Cilium command reference: `cilium-dbg monitor` - https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor/
- Kubernetes kubectl reference: `kubectl run` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Microsoft Learn: Configure Azure CNI Powered by Cilium in AKS - https://learn.microsoft.com/en-us/azure/aks/azure-cni-powered-by-cilium
- Microsoft Learn: AKS CNI networking concepts - https://learn.microsoft.com/en-us/azure/aks/concepts-network-cni-overview

## Issues Found
- The endpoint JSONPath comment described `.status.state` as a policy enforcement state. Cilium documents `CiliumEndpoint` details under `.status`, including endpoint data, identity, and policy information; `.status.state` is the endpoint state. Changed the wording to "ready endpoint state."
- The pod-to-pod test said the pods were deployed on separate nodes, but the original commands did not constrain scheduling. Added labels, required pod anti-affinity on `kubernetes.io/hostname`, and readiness waits so the example actually validates cross-node pod connectivity when the cluster has at least two schedulable nodes.
- The BusyBox client command used positional arguments without `--command`, which can be treated as arguments to the image entrypoint. Added `--command -- sleep 3600` so the pod reliably runs the intended sleep process.
- The Cilium connectivity cleanup command used `--cleanup-on-success`, which is not listed in the current official Cilium CLI reference. Replaced it with `cilium connectivity test --cleanup`, the documented cleanup flag.
- The best-practice note used `cilium monitor`, but current Cilium command references expose live BPF event monitoring as `cilium-dbg monitor`. Updated the note to use `cilium-dbg monitor` from a Cilium agent pod.
- The CiliumNode note claimed `kubectl describe ciliumnodes` confirms Azure subnet assignments. CiliumNode is a Cilium addressing/IPAM resource, while AKS Azure subnet configuration depends on the selected Azure CNI mode. Changed the wording to "per-node Cilium addressing and IPAM details."

## Review Notes
The manual cross-node pod test now requires at least two schedulable nodes; on a single-node cluster the anti-affinity rule intentionally leaves the server pod pending. `cilium connectivity test` remains the more comprehensive validation path because it covers service, DNS, and egress scenarios in addition to pod-to-pod checks.
