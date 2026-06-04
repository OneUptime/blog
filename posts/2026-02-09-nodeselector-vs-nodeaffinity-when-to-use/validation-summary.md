# Validation Summary: How to Configure nodeSelector vs nodeAffinity and When to Use Each

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Pod scheduling
- Kubernetes nodeSelector
- Kubernetes nodeAffinity
- Kubernetes node labels and label selectors
- kubectl
- jq
- YAML manifests

## Sources Consulted
- Kubernetes documentation: Assigning Pods to Nodes - https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes documentation: Assign Pods to Nodes using Node Affinity - https://kubernetes.io/docs/tasks/configure-pod-container/assign-pods-nodes-using-node-affinity/
- Kubernetes documentation: Labels and Selectors - https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes documentation: Node Labels Populated By The Kubelet - https://kubernetes.io/docs/reference/node/node-labels/
- Kubernetes kubectl reference: kubectl get - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The introduction said Kubernetes provides "two main mechanisms" for controlling which nodes can run pods. Kubernetes documents additional node placement mechanisms such as `nodeName`, taints and tolerations, and topology spread constraints, so this was narrowed to "two common label-based mechanisms."
- The exclusion example described a required `NotIn` node affinity rule as "Avoid nodes with specific labels." Since `requiredDuringSchedulingIgnoredDuringExecution` is a hard constraint, this was changed to "Exclude nodes with specific labels."
- The soft preference explanation implied strict primary and secondary placement behavior. Kubernetes treats preferred node affinity weights as scoring inputs added to other node scores, so the text now describes weighted scoring and notes that non-SSD nodes must still meet required rules.
- The performance section claimed a specific microsecond-level difference between nodeSelector and nodeAffinity evaluation. I replaced that unsupported quantitative claim with a more accurate statement that nodeSelector is simpler to evaluate and that clarity of placement requirements is usually the more important choice.
- The conclusion said `nodeSelector` and `nodeAffinity` can coexist without explaining the combined semantics. Kubernetes requires both to be satisfied when both are specified, so that caveat was added.

## Review Notes
The Kubernetes YAML examples use current `v1` Pod fields and valid node affinity operators (`In`, `NotIn`, `Exists`, `Gt`, and `Lt`). The `kubectl get nodes --show-labels`, `kubectl get nodes -l ...`, and JSON output commands match the official `kubectl get` reference. The `kubernetes.io/arch`, `topology.kubernetes.io/region`, and `topology.kubernetes.io/zone` labels are current well-known node labels, with values that may depend on the cluster or cloud provider.
