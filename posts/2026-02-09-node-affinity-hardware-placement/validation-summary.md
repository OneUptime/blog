# Validation Summary: How to Use Node Affinity for Hardware-Specific Workload Placement

## Status
validated

## Post Type
Tutorial / Kubernetes configuration guide

## Technologies Covered
- Kubernetes node affinity
- Kubernetes node selectors
- Kubernetes taints and tolerations
- Kubernetes Deployments, StatefulSets, Jobs, DaemonSets, and Pods
- GPU scheduling with extended resources
- kube-state-metrics and PrometheusRule monitoring
- kubectl node labeling

## Sources Consulted
- Kubernetes documentation: Assigning Pods to Nodes - https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes documentation: Deployments - https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes API reference: StatefulSet apps/v1 - https://kubernetes.io/docs/reference/kubernetes-api/apps/stateful-set-v1/
- Kubernetes documentation: Jobs - https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes documentation: Labels and Selectors - https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes reference: Well-Known Labels, Annotations and Taints - https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes kubectl reference: kubectl label - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- kube-state-metrics pod metrics documentation - https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Prometheus Operator API reference: PrometheusRule - https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- Several `apps/v1` Deployment examples omitted `spec.selector` and matching `spec.template.metadata.labels`. Added selectors and matching template labels so the manifests are accepted by the Kubernetes API.
- The StatefulSet example omitted a required selector and matching pod template labels. Added `spec.selector`, matching template labels, and a `serviceName` for the StatefulSet identity.
- The Job example omitted `restartPolicy`. Added `restartPolicy: Never` because Kubernetes Jobs allow only `Never` or `OnFailure`; the default `Always` is invalid for Jobs.
- The network anti-affinity example selected pods with `app: hft-trading`, but the Deployment template did not assign that label. Adding Deployment template labels fixed the anti-affinity rule.
- The CPU section implied that broad Xeon family and generation labels guarantee AVX-512 support. Reworded the claim to say labels should reflect exact instruction-set support.
- The dynamic node-labeling example referenced `$NODE_NAME` without defining it and attempted to write raw CPU model text into a label value, which can violate Kubernetes label syntax. Added a Downward API environment variable for `NODE_NAME`, switched to a label-safe CPU vendor value, quoted shell variables, and used `--overwrite` for repeatable labeling.
- The dynamic node-labeling section did not mention RBAC permissions required to patch nodes. Added a short note that the service account needs node patch permissions.
- The PromQL examples referenced non-existent affinity labels/metrics such as `node_affinity_required` on `kube_pod_info` and `kube_pod_spec_node_affinity_required_nodefield_selector`. Replaced them with documented kube-state-metrics pod metrics: `kube_pod_status_unschedulable` and `kube_pod_status_reason{reason="NodeAffinity"}`.
- The cost optimization explanation implied strict first-then ordering for preferred affinity weights. Reworded it to describe Kubernetes scheduler scoring more accurately.
- Troubleshooting event text referenced internal plugin-style names. Updated the examples to current user-facing scheduler event messages for node affinity/selector mismatches and untolerated taints.

## Review Notes
The post is technically relevant and accurate after the fixes. The dynamic node-labeling section remains intentionally minimal; a production implementation should include a full ClusterRole/ClusterRoleBinding or use Node Feature Discovery.
