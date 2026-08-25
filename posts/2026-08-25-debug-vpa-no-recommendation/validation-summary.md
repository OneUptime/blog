# Validation Summary: Debug a VPA with No Recommendation

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- Kubernetes
- Vertical Pod Autoscaler (VPA)
- Metrics Server and the `metrics.k8s.io` resource metrics API
- `kubectl`, JSONPath, and label selectors
- VPA recommenders and Prometheus metrics
- `VerticalPodAutoscalerCheckpoint` and Prometheus history providers

## Sources Consulted

- Kubernetes Vertical Pod Autoscaling — https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Kubernetes resource metrics pipeline — https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-metrics-pipeline/
- Kubernetes label and selector documentation — https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- `kubectl get` reference — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- `kubectl top pod` reference — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- VPA API reference and status schema — https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/api.md
- VPA component and history behavior — https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/components.md
- VPA recommender flags — https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/flags.md
- VPA FAQ for custom targets and Prometheus history — https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/faq.md
- VPA target selector and controller fetcher source — https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/target/fetcher.go and https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/target/controller_fetcher/controller_fetcher.go
- VPA status and condition implementation — https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/recommender/model/vpa.go and https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/recommender/input/cluster_feeder.go
- VPA metrics-source selection and metric definitions — https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/recommender/routines/recommender_controller.go and https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/utils/metrics/recommender/recommender.go
- Prometheus Go client counter implementation — https://github.com/prometheus/client_golang/blob/v1.24.1/prometheus/counter.go

## Issues Found

1. **Unquoted `Off` in the VPA manifest**: YAML 1.1 parsing can convert unquoted `Off` to the boolean `false`, but `updateMode` requires a string enum. Changed it to `updateMode: "Off"`.
2. **Incomplete selector inspection**: The JSONPath command displayed only `matchLabels` even though Kubernetes selectors can also contain `matchExpressions`. Changed it to display the complete `.spec.selector`.
3. **Overstated meaning of `NoPodsMatched`**: The condition can also accompany `ConfigUnsupported` when target resolution fails and VPA uses a match-nothing selector. Clarified that it means the recommender currently matches no Pods and that target resolution takes priority when both conditions are present.
4. **Resource Metrics API described as unconditional**: Current upstream VPA has an alpha external-metrics client. Qualified the `metrics.k8s.io` path as the default and made the same distinction for fresh samples when Prometheus supplies startup history.
5. **Prometheus initialization log omitted its verbosity requirement**: `Initializing VPA from history provider` is logged at verbosity level 3. Added the `--v=3` requirement so its absence at default verbosity is not mistaken for a failed history load.
6. **Recommender process count was too absolute**: Current VPA supports replicated components with leader election. Reworded the requirement to require a matching recommender while prohibiting multiple active same-name recommenders.
7. **Custom-target ownership requirement was incomplete**: A custom resource target must implement `/scale` with a non-empty selector and directly own the Pods. Added the direct-ownership requirement documented by the upstream VPA FAQ.

## Review Notes

- Reviewed against Kubernetes documentation and Kubernetes autoscaler upstream source at commit `22115908908a2fc94a4f3c47f28f1fb754fe585a` (2026-08-24).
- The `kube-system` namespace, `vpa-recommender` Deployment name, and `app=vpa-recommender` label match the upstream manifest. Packaged or managed installations may use different names or labels.
- The post's unusual counter name `vpa_recommender_metric_server_responses` is correct: the current upstream metric is exposed without a `_total` suffix.
