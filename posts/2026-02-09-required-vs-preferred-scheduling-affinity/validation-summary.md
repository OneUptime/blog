# Validation Summary: How to Use requiredDuringScheduling vs preferredDuringScheduling Affinity Rules

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes
- Kubernetes scheduler
- Node affinity
- Pod affinity and anti-affinity
- kubectl
- JSON Patch

## Sources Consulted
- Kubernetes documentation: Assigning Pods to Nodes - https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes documentation: Assign Pods to Nodes using Node Affinity - https://kubernetes.io/docs/tasks/configure-pod-container/assign-pods-nodes-using-node-affinity
- Kubernetes documentation: Node Labels Populated By The Kubelet - https://kubernetes.io/docs/reference/node/node-labels/
- Kubernetes documentation: Well-Known Labels, Annotations and Taints - https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes kubectl reference: kubectl patch - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The cost optimization example used `node.kubernetes.io/instance-type` with values `spot` and `preemptible`. Kubernetes uses that well-known node label for cloud-provider instance type values, not capacity or purchasing model values. Changed the example to use a custom `capacity-type` label.
- The troubleshooting command used a JSON Patch `replace` operation with `null` to drop the required node affinity field. Changed it to a JSON Patch `remove` operation, which matches the intent of removing the hard scheduling constraint.

## Review Notes
- The required and preferred affinity field names, weight range, node selector term OR semantics, match expression AND semantics, and pod affinity/anti-affinity examples are consistent with the Kubernetes scheduling documentation.
- The post uses custom labels such as `disktype`, `node-class`, `capacity-type`, and `node-age-days`; these examples are valid as long as cluster operators apply those labels to nodes.
