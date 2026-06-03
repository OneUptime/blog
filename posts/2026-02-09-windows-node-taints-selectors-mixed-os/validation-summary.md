# Validation Summary: How to Configure Windows Node Taints and Node Selectors for Mixed OS Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Windows nodes and Windows containers in Kubernetes
- Node labels, node selectors, node affinity, taints, and tolerations
- Kubernetes admission webhooks and PodNodeSelector admission controller
- DaemonSets and PodDisruptionBudgets
- Kyverno ClusterPolicy
- kube-state-metrics and PrometheusRule alerting
- kubectl and jq

## Sources Consulted
- Kubernetes: Windows containers in Kubernetes: https://kubernetes.io/docs/concepts/windows/intro/
- Kubernetes: Guide for Running Windows Containers in Kubernetes: https://kubernetes.io/docs/concepts/windows/user-guide/
- Kubernetes: Pods / Pod OS: https://kubernetes.io/docs/concepts/workloads/pods/pod-overview/
- Kubernetes: Assigning Pods to Nodes: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes: Taints and Tolerations: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes: Admission Controllers / PodNodeSelector: https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/
- Kubernetes API Reference: Deployment apps/v1: https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/
- Kubernetes API Reference: MutatingWebhookConfiguration admissionregistration.k8s.io/v1: https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/mutating-webhook-configuration-v1/
- Kubernetes API Reference: PodDisruptionBudget policy/v1: https://kubernetes.io/docs/reference/kubernetes-api/policy/pod-disruption-budget-v1/
- Kyverno: Mutate Rules and strategic merge anchors: https://kyverno.io/docs/policy-types/cluster-policy/mutate/
- Kyverno: JMESPath and precondition expression guidance: https://kyverno.io/docs/policy-types/cluster-policy/jmespath/
- kube-state-metrics: Pod metrics including kube_pod_tolerations: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- kube-state-metrics: Node metrics including kube_node_labels: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/cluster/node-metrics.md

## Issues Found
- The examples omitted the stable Pod OS field. Added `spec.os.name` for Windows and Linux pod templates while retaining `nodeSelector`, because Kubernetes documentation says the OS field should be set but does not drive scheduler placement by itself.
- Some Deployment examples used `apps/v1` but omitted required `spec.selector` and matching template labels. Added selectors and labels so the examples are valid Deployment manifests.
- Windows Server 2019 build and image examples were outdated for current Kubernetes Windows documentation. Updated build examples from `10.0.17763` to `10.0.20348`, changed Windows Server 2019 image tags to LTSC 2022, and updated the affinity preferences to Windows Server 2025 (`10.0.26100`) and Windows Server 2022 (`10.0.20348`).
- The namespace node selector section implied namespace selectors work automatically and can be overridden by pods. Clarified that this requires the PodNodeSelector admission controller and that conflicting pod selectors are rejected.
- The "PodPresets" heading was technically incorrect because the section uses a mutating admission webhook, not PodPreset. Renamed the heading to admission webhooks.
- The DaemonSet examples used the same pod selector labels for Linux and Windows agents in the same namespace. Added OS-specific labels to avoid selector overlap and added `spec.os.name` to each pod template.
- The DaemonSet toleration comment implied a broad `Exists` toleration is specifically for master/control-plane nodes. Reworded it to state that it tolerates any `NoSchedule` taint and should be narrowed in production.
- The PodDisruptionBudget selector included `os: windows` even though the referenced `windows-app` example did not label pods that way. Removed the unmatched OS label from the PDB selector.
- The Kyverno policy attempted to infer OS from image registry strings and used a list add anchor in a way Kyverno documentation warns against. Changed the example to use explicit pod labels (`os: windows` or `os: linux`) and corrected the mutation fields.
- The validation script inferred Windows workloads from image names, which misclassifies common Windows tags such as `nanoserver` or `servercore`. Updated it to compare the pod's declared OS or OS node selector with the assigned node's `kubernetes.io/os` label.
- The Prometheus alert inferred Windows nodes from node names. Updated it to join `kube_pod_info` with `kube_node_labels{label_kubernetes_io_os="windows"}` and to check the current `kube_pod_tolerations` label names.

## Review Notes
The kube-state-metrics alert assumes node labels are exposed on `kube_node_labels`; deployments using metric label allowlists must include `kubernetes.io/os`. The Kyverno example now relies on explicit pod labels rather than image inspection, which is more deterministic but requires teams or automation to label workloads consistently.
