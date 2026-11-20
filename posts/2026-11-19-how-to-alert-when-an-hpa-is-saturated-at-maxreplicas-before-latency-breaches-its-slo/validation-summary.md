# Validation Summary: Alert on HPA Saturation at `maxReplicas` Before Latency Breaches Its SLO

## Status
validated

## Post Type
Technical guide with PromQL queries, Prometheus recording and alerting rules, and Kubernetes troubleshooting commands.

## Technologies Covered
- Kubernetes Horizontal Pod Autoscaler (HPA)
- kube-state-metrics
- Prometheus, PromQL, and YAML rule files
- kubectl, Deployments, Pod readiness, and resource quotas
- Capacity monitoring and service-level objectives (SLOs)

## Sources Consulted
- kube-state-metrics HPA metric names, labels, and stability: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/horizontalpodautoscaler-metrics.md
- Kubernetes horizontal autoscaling concepts: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes HPA controller implementation, including replica normalization, status updates, and scaling conditions: https://github.com/kubernetes/kubernetes/blob/master/pkg/controller/podautoscaler/horizontal.go
- Prometheus recording rule configuration: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus alerting rules and annotation templates: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- PromQL operators, aggregation, and vector matching: https://prometheus.io/docs/prometheus/latest/querying/operators/
- kubectl get command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- kubectl describe command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- Kubernetes Deployment status and failure conditions: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#deployment-status
- Kubernetes resource quotas: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Author profile link: https://github.com/nawazdhandala

## Issues Found
No technical issues found.

## Review Notes
- README.md was left unchanged. The article contains technical implementation examples and qualifies for technical validation.
- All four metric names exist in the official kube-state-metrics reference. The condition selector correctly uses `condition="ScalingLimited"` and lowercase `status="true"`. These metrics are listed as stable.
- The recording rules aggregate to consistent label sets, so the division and replica comparison support one-to-one matching. The condition query filters for a value of 1 before intersecting series with `and on (...)`. Comparisons correctly omit `bool`, preserving alert filtering behavior.
- The YAML rule structure, recording names, alert labels, annotation template, and `for: 2m` syntax match Prometheus documentation. The example is a rule file that must be loaded through Prometheus rule configuration. The standalone escalation expression requires its own alert rule and chosen timer, as the article states.
- `cluster` must be available on input series in the rule evaluation environment; it is not a native label documented for these kube-state-metrics metrics. The article correctly calls for consistent cluster labeling. Aggregating replicated observations does not resolve stale or conflicting observations, so its warning about stale metrics remains relevant.
- The controller normalizes recommendations before publishing desired replicas. `ScalingLimited` can indicate upper or lower bounds and scaling rate restrictions; even at the ceiling, a downscale restriction can produce this condition. The article correctly requires inspecting the reason and does not present the condition as definitive proof of excess demand.
- HPA replica status is not a Ready-Pod count. In the controller implementation reviewed, current replicas come from the target scale specification. The separate discussion of desired and available Deployment replicas is therefore necessary and correct.
- The four kubectl commands use supported resource forms and flags, including YAML output, label selection, namespace selection, and JSONPath sorting. Resource names, namespace, and Pod selector are illustrative and must match the actual workload.
- The 90% threshold for a maximum of two replicas is reached only at two replicas. Equal minimum and maximum replicas, missing metrics, and service-specific response timing are appropriately called out.
- All three links in the post resolve to the intended resources; the author URL redirects to the canonical GitHub profile. No explicit software version is claimed, and no deprecated API or option was identified in the examples.
- Validation was based on official documentation and upstream source inspection. No live-cluster scaling experiment or Prometheus runtime evaluation was performed; deployment-specific metric availability and alert timing still require the workload tests described in the post.
