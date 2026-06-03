# Validation Summary: How to Use Kubernetes Vertical Pod Autoscaler Recommendations

## Status
validated

## Post Type
Tutorial / production operations guide

## Technologies Covered
- Kubernetes
- Vertical Pod Autoscaler (VPA)
- kubectl
- Validating admission webhooks
- Prometheus / PromQL
- kube-state-metrics

## Sources Consulted
- Kubernetes Vertical Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Kubernetes autoscaler VPA quickstart: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/quickstart.md
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes Validating Admission Policy documentation: https://kubernetes.io/docs/reference/access-authn-authz/validating-admission-policy/
- Kubernetes kube-state-metrics documentation: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- Prometheus PromQL operator documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus PromQL basics: https://prometheus.io/docs/prometheus/latest/querying/basics/

## Issues Found
- The introduction said VPA recommends CPU and memory limits. Kubernetes documentation describes VPA recommendations as resource requests, with limits controlled optionally through `controlledValues`. Updated the wording to "requests, and optionally limits."
- The update mode section said VPA offers three update modes. Current VPA documentation lists additional modes and marks `Auto` as deprecated since VPA 1.4.0. Updated the text to describe several modes and recommend explicit modes such as `Recreate`, `Initial`, and `InPlaceOrRecreate`.
- The review script comment claimed `kubectl top` checked historical metrics from the last 7 days. `kubectl top` reads current Metrics API data, so the comment was corrected.
- The production rollout guidance described `Auto` as immediately evicting pods. Current VPA documentation says `Auto` is deprecated and currently equivalent to `Recreate`, while `Recreate` evicts only when requests differ significantly from recommendations and respects PodDisruptionBudgets. Updated the explanation.
- The validation gate example included Rego helper functions that were not defined and implied a ConfigMap alone would enforce admission. Replaced it with a syntactically valid `ValidatingWebhookConfiguration` shape and clarified that the backing webhook service implements the threshold comparison.
- The Prometheus alert used `vpa_containerrecommendation_target`, which does not match the kube-state-metrics VPA metric naming convention. Updated it to the kube-state-metrics VPA recommendation metric name and fixed the offset expression grouping.
- The memory utilization query matched only on `pod` and `container`, which can mismatch across namespaces. Updated the query to match on `namespace`, `pod`, and `container`, and filtered out infrastructure container series.
- The progressive rollout example used deprecated `Auto` mode for development. Updated it to `Recreate` with an explicit comment.

## Review Notes
The admission webhook snippet still requires a real `vpa-validator` service and a cluster-specific `caBundle` before it can be applied. VPA recommendation metrics are not built into Kubernetes itself; Prometheus alert names may need adjustment depending on whether the cluster exposes VPA data through kube-state-metrics custom resource state metrics or another exporter.
