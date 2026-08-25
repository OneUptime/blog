# Validation Summary: How to Seed VPA with Prometheus History After a Recommender Restart

## Status
validated

## Post Type
Technical guide / Configuration and troubleshooting guide

## Technologies Covered
- Kubernetes
- Vertical Pod Autoscaler (VPA) recommender
- Prometheus and PromQL
- cAdvisor container metrics
- Kubernetes Metrics API and Metrics Server
- kube-state-metrics
- kubectl

## Sources Consulted
- VPA FAQ: Prometheus as history provider — https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/faq.md#how-can-i-use-prometheus-as-a-history-provider-for-the-vpa-recommender
- VPA recommender flag reference — https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/flags.md#what-are-the-parameters-to-vpa-recommender
- VPA recommender configuration and defaults at the reviewed upstream commit — https://github.com/kubernetes/autoscaler/blob/22115908908a2fc94a4f3c47f28f1fb754fe585a/vertical-pod-autoscaler/pkg/recommender/config/config.go
- VPA Prometheus history-provider implementation at the reviewed upstream commit — https://github.com/kubernetes/autoscaler/blob/22115908908a2fc94a4f3c47f28f1fb754fe585a/vertical-pod-autoscaler/pkg/recommender/input/history/history_provider.go
- VPA recommender initialization, Metrics API source, and checkpoint selection — https://github.com/kubernetes/autoscaler/blob/22115908908a2fc94a4f3c47f28f1fb754fe585a/vertical-pod-autoscaler/pkg/recommender/routines/recommender_controller.go
- VPA recommender Prometheus metric definitions — https://github.com/kubernetes/autoscaler/blob/22115908908a2fc94a4f3c47f28f1fb754fe585a/vertical-pod-autoscaler/pkg/utils/metrics/recommender/recommender.go
- VPA component and checkpoint behavior — https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/components.md
- VPA 1.7.1 release notes — https://github.com/kubernetes/autoscaler/releases/tag/vertical-pod-autoscaler-1.7.1
- Prometheus query data types and range-query semantics — https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus `rate()` function — https://prometheus.io/docs/prometheus/latest/querying/functions/#rate
- Prometheus HTTP query API — https://prometheus.io/docs/prometheus/latest/querying/api/
- kube-state-metrics Pod metric reference — https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- kube-state-metrics label allowlist arguments — https://github.com/kubernetes/kube-state-metrics/blob/main/docs/developer/cli-arguments.md
- kube-state-metrics label-name conversion rules — https://github.com/kubernetes/kube-state-metrics/blob/main/README.md#conflict-resolution-in-label-names
- Kubernetes resource metrics pipeline — https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-metrics-pipeline/
- kubectl rollout restart reference — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/
- kubectl rollout status reference — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- kubectl logs reference — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- kubectl get reference — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found

1. **The kube-state-metrics alternative omitted the required label allowlist and label-key conversion caveat.** Current kube-state-metrics releases do not expose `*_labels` metrics by default. Added guidance to enable every target selector label with `--metric-labels-allowlist`. Also documented that kube-state-metrics converts unsupported characters in Kubernetes label keys to underscores, while VPA only removes the configured `label_` prefix; without an exact recovered-key match, historical Pods cannot match the target selector.

## Review Notes

- Reviewed against kubernetes/autoscaler commit `22115908908a2fc94a4f3c47f28f1fb754fe585a` from 2026-08-24 and the released VPA 1.7.1 tag. The upstream history, configuration, and recommender-metrics package tests passed locally.
- The post correctly identifies a current upstream inconsistency: `--metric-for-pod-labels` defaults to a plain instant-vector selector, but `readLastLabels` requires the instant query result to be a matrix. Supplying a range selector such as `[8d]` produces the required result type.
- The CPU and memory PromQL expressions, YAML argument syntax, metric units, history range/step explanation, authentication flags, TLS warning, checkpoint behavior, log messages, exported recommender metric names, and kubectl commands were verified as correct.
- Stock VPA 1.7.1 and the reviewed upstream commit define `FetchingHistory` but do not emit that condition during Prometheus initialization. Its absence is therefore expected; the post already qualifies this correctly.
- The post appropriately recommends using release-matched documentation. Its `master` links describe current source and can change after this validation date.
