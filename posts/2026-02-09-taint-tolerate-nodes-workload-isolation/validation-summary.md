# Validation Summary: How to Taint and Tolerate Nodes for Dedicated Workload Isolation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes taints and tolerations
- Kubernetes node scheduling
- Kubernetes `kubectl taint` command
- Kubernetes Deployments, DaemonSets, StatefulSets, Jobs, and Pods
- Pod disruption and taint-based eviction behavior

## Sources Consulted
- Kubernetes documentation: Taints and Tolerations - https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes API reference: Toleration v1 - https://kubernetes.io/docs/reference/kubernetes-api/definitions/toleration-v1/
- Kubernetes kubectl reference: `kubectl taint` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_taint/
- Kubernetes documentation: DaemonSet taints and tolerations - https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes documentation: Node Status and node condition taints - https://kubernetes.io/docs/reference/node/node-status/
- Kubernetes documentation: Disruptions and PodDisruptionBudgets - https://kubernetes.io/docs/concepts/workloads/pods/disruptions/

## Issues Found
- The `kubectl taint` removal example included the taint value when removing a taint by key and effect. Updated it from `dedicated=gpu:NoSchedule-` to the documented `dedicated:NoSchedule-` form.
- The comment for `kubectl taint nodes testing-node-1 workload-` said it removed all taints from a node. Updated the wording because this command removes all taints with the `workload` key, not all taints on the node.
- The `maintenance-tolerant-pod.yaml` DaemonSet example had a selector but no matching `spec.template.metadata.labels`. Added the `app: node-monitor` pod template label required by `apps/v1`.
- The `resilient-deployment.yaml` Deployment example had a selector but no matching `spec.template.metadata.labels`. Added the `app: resilient-app` pod template label required by `apps/v1`.
- The `controlled-eviction.yaml` Deployment example had a selector but no matching `spec.template.metadata.labels`. Added the `app: batch-processor` pod template label required by `apps/v1`.
- The `node-taint-controller.yaml` Deployment example had a selector but no matching `spec.template.metadata.labels`. Added the `app: node-taint-controller` pod template label required by `apps/v1`.

## Review Notes
`kubectl` was not installed in the local environment, so CLI validation was performed against the official Kubernetes generated `kubectl taint` documentation instead of local `kubectl --help` output. The image names used in examples are illustrative and may need replacement with real organization-specific images before applying them to a cluster.
