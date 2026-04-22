# Validation Summary: How to Schedule Workloads on Windows Nodes in Rancher - Workloads Nodes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher
- Kubernetes
- Windows worker nodes and Windows containers
- Kubernetes node selectors and node labels
- Kubernetes node affinity
- Kubernetes taints and tolerations
- Pod topology spread constraints
- Kubernetes resource requests and limits
- Kubernetes DaemonSets

## Sources Consulted
- Kubernetes guide for running Windows containers: https://kubernetes.io/docs/concepts/windows/user-guide/
- Kubernetes resource management for Windows nodes: https://kubernetes.io/docs/concepts/configuration/windows-resource-management/
- Kubernetes assigning pods to nodes documentation: https://kubernetes.io/docs/concepts/configuration/assign-pod-node/
- Kubernetes taints and tolerations documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes pod topology spread constraints documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Rancher Windows clusters documentation: https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/use-windows-clusters

## Issues Found
1. **Overstated coverage of scheduling mechanisms.** The post said it covered all scheduling mechanisms available for Windows node targeting. Updated the wording to "common scheduling mechanisms" because Kubernetes also has other related mechanisms, such as RuntimeClass scheduling and direct node assignment, and the post focuses on the common workload-spec patterns.

2. **Non-standard Windows version label.** The examples used a custom `windows-version: "2022"` label for Windows Server 2022 targeting. Replaced it with Kubernetes' automatically added `node.kubernetes.io/windows-build: "10.0.20348"` label, which the official Windows container guide documents for Windows Server 2022 compatibility.

3. **Incorrect Windows CPU limit note.** The resource example said there are no CPU limits on Windows. Kubernetes documentation states that Windows can limit CPU time, while CPU requests are used for scheduling and do not guarantee a minimum CPU allocation. Added a CPU limit example and corrected the note.

4. **Invalid DaemonSet manifest.** The DaemonSet selector did not have matching pod template labels. Added `template.metadata.labels.app: windows-agent` so `.spec.selector` matches `.spec.template.metadata.labels`, as required by the Kubernetes DaemonSet API.

5. **Overstated toleration requirement.** The conclusion said Windows workloads should always include both positive targeting and tolerations. Updated it to say tolerations are needed when the target Windows nodes have matching `NoSchedule` taints; otherwise node selectors or affinity are sufficient for positive OS targeting.

## Review Notes
- The `kubernetes.io/os: windows` selector is correct and is the Kubernetes-recommended way to ensure Windows pods are scheduled onto Windows nodes.
- Kubernetes recommends setting `.spec.os.name` to `windows` for Windows pods, but the scheduler does not use that field for node placement, so selectors, affinity, or taints remain necessary.
- The taint and toleration syntax shown in the post is valid for a manually applied `os=windows:NoSchedule` taint.
- The topology spread constraint fields are current and correctly placed under the pod spec. The selected pods should also carry the `app: windows-api` label in the full workload manifest.
