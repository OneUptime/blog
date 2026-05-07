# Validation Summary: How to Configure Pod Scheduling in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- Kubernetes
- kubectl
- Kubernetes pod scheduling primitives: node selectors, node affinity, pod affinity, pod anti-affinity, taints, tolerations, and topology spread constraints

## Sources Consulted
- SUSE Rancher Manager v2.14, "Deploying Workloads" — https://documentation.suse.com/cloudnative/rancher-manager/v2.14/en/cluster-admin/kubernetes-resources/workloads-and-pods/deploy-workloads.html
- SUSE Rancher Manager v2.14, "Nodes and Node Pools" — https://documentation.suse.com/cloudnative/rancher-manager/v2.14/en/cluster-admin/manage-clusters/nodes-and-node-pools.html
- Kubernetes, "Assigning Pods to Nodes" — https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes, "Pod Topology Spread Constraints" — https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes, "Taints and Tolerations" — https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes, "`kubectl label`" reference — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Kubernetes, "`kubectl taint`" reference — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_taint/
- Kubernetes, "`kubectl get`" reference — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes, "`kubectl describe`" reference — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/

## Issues Found
- The node-labeling instructions said to go to `Cluster Management > Nodes` and use `Edit Config`. Rancher's current node management docs describe opening the cluster with `Explore`, then going to `Nodes`, and using the `Edit` action. The post was updated to match the documented UI path.
- The pod affinity / anti-affinity section referred to a `Pod Scheduling` section in the workload form. Rancher's published workload docs document scheduling generically through workload scheduling options rather than that exact label, so the wording was adjusted to avoid a likely version-specific UI mismatch.
- The tolerations section did not explain that tolerations allow scheduling onto matching tainted nodes but do not guarantee placement there. The post was updated to clarify that dedicated-node behavior should be combined with a node selector or node affinity rule.
- The `NoExecute` taint effect description was incomplete. It now correctly states that pods without a matching toleration are both prevented from scheduling onto the node and evicted if already running there.

## Review Notes
- The Kubernetes YAML fragments and `kubectl` commands reviewed in this post are valid against current official Kubernetes documentation as of 2026-05-07.
- The post still references Rancher `v2.7 or later`. The Rancher UI navigation in this review was validated against the currently published Rancher Manager v2.14 documentation, so older 2.7-era UI wording may differ slightly.
