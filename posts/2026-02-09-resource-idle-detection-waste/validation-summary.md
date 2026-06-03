# Validation Summary: How to Use Resource Idle Detection for Waste Identification

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubectl
- jq
- Prometheus / PromQL
- kube-state-metrics
- Kyverno
- ResourceQuota
- PersistentVolumeClaims
- LoadBalancer Services and EndpointSlices

## Sources Consulted
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Service API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- kube-state-metrics Service metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/service/service-metrics.md
- kube-state-metrics Endpoint metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/service/endpoint-metrics.md
- kube-state-metrics Deployment metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/deployment-metrics.md
- kube-state-metrics Pod metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- kube-state-metrics PersistentVolumeClaim metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/storage/persistentvolumeclaim-metrics.md
- Prometheus operators documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Kyverno validate rules documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno JMESPath and time function documentation: https://kyverno.io/docs/policy-types/cluster-policy/jmespath/
- Kyverno DeletingPolicy documentation: https://kyverno.io/docs/policy-types/deleting-policy/

## Issues Found
- The zero-replica workload section claimed to find Deployments and StatefulSets but only queried Deployments. Added a StatefulSet query and made the wording clear that the results are candidates requiring review.
- The zero-replica PromQL used `kube_deployment_spec_replicas{replicas="0"}`, but `replicas` is the metric value, not a label. Replaced it with a value comparison against `kube_deployment_spec_replicas`.
- The zero-replica PromQL joined deployments directly to PVCs by namespace, which overstates precision. Updated the label and query so it is explicitly a namespace-level signal.
- The orphaned PVC shell script matched mounted PVCs by claim name only, causing false negatives when different namespaces used the same PVC name. Updated the mounted PVC list and grep check to include namespace and claim name.
- The PVC `unless` PromQL did not specify vector matching labels. Added `unless on (namespace, persistentvolumeclaim)` so it compares the intended objects.
- The LoadBalancer shell command used `--field-selector spec.type=LoadBalancer`, but Service `spec.type` is not a supported Kubernetes field selector. Replaced it with JSON filtering via `jq`.
- The LoadBalancer shell command attempted to emit `.spec.selector` as TSV even though it is an object. Converted selectors into a comma-separated Kubernetes label selector and handled Services without selectors.
- The LoadBalancer PromQL used `kube_service_info{type="LoadBalancer"}` and `kube_endpoint_address_available`. Current kube-state-metrics exposes Service type via `kube_service_spec_type` and ready endpoints via `kube_endpoint_address{ready="true"}`. Updated both queries and aligned the `endpoint` label to `service` using `label_replace`.
- The pod restart jq filter checked only the first container status and could error on missing statuses. Updated it to check all present container restart counts and require a start time.
- The namespace script sorted Events by `.lastTimestamp`, which is less reliable in current Events output. Changed it to `.metadata.creationTimestamp`.
- The Kyverno "delete idle PVCs" example was a validate rule, not an automated deletion policy, and used a non-documented `time_since()` expression. Reframed it as an audit/reporting policy and replaced the time expression with documented `time_diff()` and `time_now_utc()` usage plus a duration comparison.
- The Kyverno labeling example labeled every PVC rather than only potentially idle PVCs and used `{{time_now_utc}}` without calling the function. Added pod-count context/preconditions and corrected the timestamp expression to `{{time_now_utc()}}`.
- The cost dashboard PromQL reused the invalid Service type and endpoint metrics and had PVC `unless` matching without labels. Updated the queries to use current kube-state-metrics metrics and explicit vector matching.

## Review Notes
- `kubectl`, `promtool`, and Ruby were not installed in this environment, so live CLI and PromQL parser validation could not be run locally. The corrected commands and queries were checked against official documentation and locally tested where possible with `jq`.
- The cost examples still assume dashboard variables such as `$storage_cost_per_gb_month`, `$lb_monthly_cost`, and `$avg_deployment_overhead_cost` are substituted by the dashboarding tool.
