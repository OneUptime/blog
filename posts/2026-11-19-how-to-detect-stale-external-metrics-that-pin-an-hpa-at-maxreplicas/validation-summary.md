# Validation Summary: How to Detect Stale External Metrics That Pin an HPA at `maxReplicas`

## Status
validated

## Post Type
Technical troubleshooting guide.

## Technologies Covered
- Kubernetes HorizontalPodAutoscaler (HPA), including `autoscaling/v2` external metric targets.
- External Metrics API (`external.metrics.k8s.io/v1beta1`) and metrics adapters.
- Metric freshness, caching, label selectors, and aggregation.
- `kubectl`, Bash, jq, JSON, and YAML.

## Sources Consulted
- Kubernetes HPA concepts: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes external metrics walkthrough and HPA status conditions: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/#autoscaling-on-metrics-not-related-to-kubernetes-objects
- External metrics API field definitions: https://github.com/kubernetes/metrics/blob/master/pkg/apis/external_metrics/v1beta1/types.go
- Kubernetes v1.35.0 external metrics client: https://github.com/kubernetes/kubernetes/blob/v1.35.0/pkg/controller/podautoscaler/metrics/client.go
- Kubernetes v1.35.0 replica calculation: https://github.com/kubernetes/kubernetes/blob/v1.35.0/pkg/controller/podautoscaler/replica_calculator.go
- Kubernetes v1.35.0 HPA controller, including limit reasons and metric failure handling: https://github.com/kubernetes/kubernetes/blob/v1.35.0/pkg/controller/podautoscaler/horizontal.go
- Official kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Official jq manual: https://jqlang.org/manual/

## Issues Found
- The external metrics response inspection used `windowSeconds` as a JSON property. The Go field is named `WindowSeconds`, but its JSON tag is `window`. Consequently, the original jq filter would output null instead of the provided measurement window. Changed the filter to select `window` and changed the accompanying explanation to refer to `window` in seconds. The API definition confirms both the serialized name and the measurement interval semantics.

## Review Notes
- Reviewed the configuration fragment against the official external queue example. `External`, `metric.name`, `metric.selector.matchLabels`, and the `AverageValue` target with `averageValue: "40"` are appropriate under an `autoscaling/v2` HPA's `spec.metrics`.
- Confirmed the basic recommendation of 30 workers for 1200 jobs at 40 jobs per worker. Actual scaling remains subject to tolerance, configured replica limits, rate policies, and stabilization, as the post acknowledges.
- Confirmed that matching external series are summed, so duplicate observations can inflate the result. Determining whether series are duplicates requires the source metric's definition.
- Confirmed that the largest recommendation across metrics wins and a failed metric can block downscaling while another valid metric can still permit upscaling. Returning zero is therefore materially different from reporting unavailable data.
- The cited v1.35.0 client reads metric values and a timestamp without rejecting values based on age. Adapter freshness enforcement and source timestamps must be checked independently. The pinned source link is valid; it is not presented as the latest Kubernetes release.
- The API's optional `window` describes the calculation interval; it is not a cache expiration setting. An omitted window appears as null in the jq projection. Timestamp interpretation still requires understanding how the adapter produces its measurement.
- Checked the post's three technical reference links and their relevant contents. No deprecated API usage was identified in the examples.
- Verified kubectl JSON output, namespace selection, and raw URI support against its official reference. The encoded selector represents `queue=invoices` and matches the YAML selector.
- Both Bash snippets passed `bash -n`. Both jq filters executed successfully against representative JSON fixtures; the corrected external metric projection preserved a supplied window of 60 seconds.
- No live Kubernetes cluster or adapter failure/recovery experiment was run. Commands require the named HPA, an installed external metrics provider, appropriate permissions, and jq. Adapter-specific caching and timestamp behavior cannot be validated without a specific adapter and configuration.
