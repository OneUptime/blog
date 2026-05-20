# Validation Summary: How to Enforce Resource Limits with ArgoCD Deployments

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD and ApplicationSet
- Kubernetes LimitRange
- Kubernetes ResourceQuota
- Kubernetes resource requests, limits, and QoS classes
- Kyverno ClusterPolicy validation rules
- Argo CD resource hooks
- Prometheus Operator PrometheusRule
- PromQL
- kubectl
- jq

## Sources Consulted
- Kubernetes LimitRange documentation: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes Pod QoS documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- Kubernetes resource management documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Argo CD ApplicationSet List Generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-List/
- Argo CD ApplicationSet Go Template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- Argo CD Resource Hooks documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/resource_hooks/
- Kyverno validate rule documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus PromQL operators documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- jq manual for `any(generator; condition)`: https://jqlang.org/manual/

## Issues Found
- The QoS explanation said pods without resource limits are always BestEffort. Updated it to clarify that BestEffort requires no CPU or memory requests or limits, while pods with some requests or limits are Burstable.
- The ResourceQuota example incorrectly implied `count/deployments.apps` forces resource limits. Changed the comment to state that it limits the number of Deployments.
- The ResourceQuota explanation claimed any active ResourceQuota requires all pods to specify requests and limits. Updated it to clarify that this applies when CPU or memory request/limit quota keys are present, and that failures happen at admission time.
- The Kyverno policy used the deprecated top-level `spec.validationFailureAction`. Moved enforcement to `validate.failureAction` on each rule.
- The Kyverno memory range rule only checked the first container and only enforced the upper bound despite claiming a 64Mi to 8Gi range. Updated it to use `foreach` over containers and check both lower and upper bounds.
- The Kyverno CPU rule was labeled as a CPU-to-memory ratio check but only enforced a maximum CPU limit. Renamed and reworded it as a CPU limit range check.
- The Argo CD PreSync hook assumed rendered manifests were available under `/manifests`, which Argo CD does not automatically mount into hook Pods. Updated the text and example to make the hook a live-workload guardrail and note that rendered manifest validation should happen through admission policy or CI.
- The PromQL CPU limit expression was rewritten for clarity and guarded against unlimited CPU quota values. The memory alert was also guarded against zero or missing memory limit metrics.
- The audit command only detected a missing `limits` object and could duplicate output for multi-container Deployments. Updated it to use jq `any(...)` and check missing CPU or memory limits per container.
- The Kyverno Audit mode snippet used the deprecated top-level field. Updated it to show `validate.failureAction: Audit`.
- The best-practices section said to always set CPU limits without caveat. Added a CPU throttling caveat while preserving the multi-tenant enforcement guidance.

## Review Notes
The remaining examples are version-general and do not pin specific Kubernetes, Argo CD, Kyverno, or Prometheus Operator releases. The Prometheus cAdvisor metric names used in the examples depend on cluster monitoring configuration and may need adjustment in environments that relabel or omit container spec metrics.
