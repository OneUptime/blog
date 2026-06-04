# Validation Summary: How to Use Edge Workload Scheduling Based on Node Capabilities in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes scheduling
- Node labels and node selectors
- Node affinity
- Taints and tolerations
- Custom schedulers
- DaemonSets, Deployments, and StatefulSets
- PrometheusRule monitoring
- Python scoring logic

## Sources Consulted
- Kubernetes documentation: Assigning Pods to Nodes - https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes API reference: NodeSelectorRequirement - https://kubernetes.io/docs/reference/kubernetes-api/common-definitions/node-selector-requirement/
- Kubernetes API reference: Deployment apps/v1 - https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/
- Kubernetes API reference: DaemonSet apps/v1 - https://kubernetes.io/docs/reference/kubernetes-api/apps/daemon-set-v1/
- Kubernetes API reference: StatefulSet apps/v1 - https://kubernetes.io/docs/reference/kubernetes-api/apps/stateful-set-v1/
- Kubernetes kubectl reference: kubectl taint - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_taint/
- Kubernetes API reference: Toleration - https://kubernetes.io/docs/reference/kubernetes-api/definitions/toleration-v1/
- Kubernetes documentation: Configure Multiple Schedulers - https://kubernetes.io/docs/tasks/extend-kubernetes/configure-multiple-schedulers/
- Kubernetes documentation: Scheduler Configuration - https://kubernetes.io/docs/reference/scheduling/config/
- Kubernetes documentation: Node Labels Populated By The Kubelet - https://kubernetes.io/docs/reference/node/node-labels/
- Kubernetes SIGs documentation: Node Feature Discovery feature labels - https://kubernetes-sigs.github.io/node-feature-discovery/v0.17/usage/features.html

## Issues Found
- The node affinity example claimed "GPU or high-core CPU", but both expressions were in the same `nodeSelectorTerm`, which Kubernetes treats as an AND. Split the required affinity into two terms so the requirement is "USB camera and GPU" OR "USB camera and high-core CPU".
- Several apps/v1 workload examples had selectors without matching pod template labels. Added `template.metadata.labels` for the affected Deployment, StatefulSet, and DaemonSet snippets so the selectors match the pod templates.
- The network-aware affinity example used `operator: Lt` with `values: ["10ms"]`. Kubernetes `Gt` and `Lt` node selector values are interpreted as integers, so this was changed to a numeric `network-latency-ms` label with `values: ["10"]`.
- The custom scheduler snippet referenced a scheduler config path without mounting any config and did not state how Pods select the alternate scheduler. Added a scheduler config ConfigMap, mounted it into the scheduler Deployment, and added the required `spec.schedulerName` note.
- The capability discovery DaemonSet attempted to run `kubectl`, `lspci`, `lsblk`, and `lsusb` from `alpine:latest` without providing those tools or Kubernetes API permissions. Changed it to a custom discovery image, added a ServiceAccount with node label update permissions, added matching DaemonSet template labels, and fixed the storage detection command so it stores only the intended label value.

## Review Notes
The examples are now syntactically valid YAML, and the Python scoring snippet compiles. A live Kubernetes API validation was not run because `kubectl` is not installed in this environment.
