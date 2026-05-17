# Validation Summary: How to Configure QoS Classes for Pods on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Quality of Service (QoS) classes (Guaranteed, Burstable, BestEffort)
- Kubernetes Pod resource requests and limits
- Kubelet eviction (hard, soft, grace period, minimum reclaim)
- Talos Linux machine config (`machine.kubelet.extraArgs`)
- Kyverno ClusterPolicy (foreach, validate, deny)
- kube-state-metrics (`kube_pod_status_qos_class`)
- Prometheus Operator (PrometheusRule)
- kubectl custom-columns output and jq

## Sources Consulted
- [Pod Quality of Service Classes (Kubernetes docs)](https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/)
- [Node-pressure Eviction (Kubernetes docs)](https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/)
- [Configure Quality of Service for Pods (Kubernetes docs)](https://kubernetes.io/docs/tasks/configure-pod-container/quality-service-pod/)
- [Kyverno validate rules and failureAction](https://kyverno.io/docs/policy-types/cluster-policy/validate/)
- [Kyverno foreach declarations](https://kyverno.io/docs/writing-policies/validate/#foreach)
- [kube-state-metrics pod metrics](https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md)
- [Talos Linux kubelet configuration](https://www.talos.dev/v1.7/reference/configuration/v1alpha1/config/#Config.machine.kubelet)
- Kubernetes PR #38989 (`PodStatus.QOSClass` field)
- Kubernetes kubelet source for `oom_score_adj` values (Guaranteed -997, BestEffort 1000, Burstable 2-999)

## Issues Found
- **Deprecated Kyverno `spec.validationFailureAction` field.** Both Kyverno `ClusterPolicy` examples used the deprecated top-level `spec.validationFailureAction: Enforce`. Current Kyverno (1.10+) moved this to the per-rule `validate.failureAction` field. Updated both policies in the post to use the new `validate.failureAction: Enforce` syntax. The old form still works for backward compatibility but is slated for removal.

All other technical claims verified as accurate:
- Three QoS class definitions and assignment criteria match Kubernetes docs.
- OOM score values (Guaranteed -997, BestEffort 1000, Burstable 2-999 based on memory request ratio) match the kubelet implementation.
- Eviction ordering description is a reasonable simplification of the documented behavior.
- Talos `machine.kubelet.extraArgs` with `eviction-hard`/`eviction-soft`/`eviction-soft-grace-period`/`eviction-minimum-reclaim` is still valid.
- Kyverno `foreach` + `deny.conditions` with `{{ element.resources.requests.* }}` references is correct syntax.
- `kube_pod_status_qos_class` metric exists in kube-state-metrics with the `qos_class` label.
- `.status.qosClass` is a valid Pod field for kubectl custom-columns.

## Review Notes
- The eviction order section is a slight simplification — Kubernetes actually ranks Burstable pods exceeding requests alongside BestEffort during eviction candidate selection (not strictly after), then applies priority and usage-relative-to-requests. The post's ordered list is accurate enough for a practical guide.
- `kube_pod_status_qos_class` is marked EXPERIMENTAL in kube-state-metrics and may require enabling a metric label allowlist in some configurations.
- Talos also supports `machine.kubelet.extraConfig` for typed KubeletConfiguration fields, which is the preferred long-term approach as kubelet flags are gradually being moved into the config file. The `extraArgs` approach shown is still functional.
- The Kyverno policy uses `|| ''` JMESPath default value syntax to handle missing fields; this works in current Kyverno but assumes the `resources.requests` parent object is at least present (which is typical for the BestEffort check use case).
