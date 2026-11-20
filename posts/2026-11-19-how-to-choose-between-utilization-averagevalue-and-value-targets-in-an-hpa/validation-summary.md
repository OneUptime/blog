# Validation Summary: How to Choose Between Utilization, AverageValue, and Value Targets in an HPA

## Status
validated

## Post Type
Technical guide with Kubernetes HPA configuration examples.

## Technologies Covered
- Kubernetes HorizontalPodAutoscaler and the `autoscaling/v2` API
- Resource, container resource, custom Pod, object, and external metrics
- CPU requests, limits, millicores, and metric quantities
- YAML configuration and autoscaling feedback behavior

## Sources Consulted
- [Kubernetes HorizontalPodAutoscaler API reference](https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/horizontal-pod-autoscaler-v2/) — metric source fields and target quantities; the original URL redirects to the current API reference.
- [Horizontal Pod Autoscaling](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/) — scaling algorithm, controller adjustments, stable API, and container resource support.
- [HorizontalPodAutoscaler walkthrough](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/#autoscaling-on-metrics-not-related-to-kubernetes-objects) — external selectors, aggregation, and queue examples.
- [Kubernetes autoscaling API validation source](https://github.com/kubernetes/kubernetes/blob/master/pkg/apis/autoscaling/validation/validation.go) — supported metric source and target combinations.
- [Kubernetes replica calculator source](https://github.com/kubernetes/kubernetes/blob/master/pkg/controller/podautoscaler/replica_calculator.go) — external metric summation, per-replica targets, Ready Pod counting, and request calculation.
- [Resource Management for Pods and Containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/) — CPU units, scheduling, and CPU allocation under contention.
- [Author GitHub profile](https://github.com/nawazdhandala) — verified the author link resolves to the intended profile.

## Issues Found
No technical issues found.

## Review Notes
- Left README.md unchanged. The five source/target combinations in the table agree with Kubernetes documentation and API validation.
- Parsed all four YAML fragments successfully with Ruby's YAML parser. Reviewed their field names, nesting, target types, and quantities against the API. They are metric-list fragments intended for `spec.metrics`, not complete HPA manifests. No terminal commands are present.
- Verified the CPU examples: 60% of 500m is 300m, and 60% of 1000m is 600m. The absolute container CPU target remains 300m regardless of changes to requests or limits.
- Verified the basic recommendations: four Pods averaging 60 requests with a target of 40 yield six replicas; an external backlog of 240 with a per-replica target of 40 yields six; a Value ratio of 240/120 with four Running and Ready Pods yields eight. These remain subject to controller adjustments and configured replica bounds.
- Confirmed that external series selected by the metric selector are summed, so duplicate totals can inflate the signal. The warning against dividing a shared queue twice is correct.
- The explanation of Value correctly identifies its repeated proportional scaling behavior when the measured total stays unchanged. Whether a particular queue or concurrency metric responds well to scaling must be tested with the actual workload and adapter.
- `autoscaling/v2` is stable, and ContainerResource has been stable since Kubernetes 1.30. Pod-level request handling depends on the Kubernetes release and feature configuration; the post appropriately asks readers to verify their denominator. Upstream master source was used to corroborate implementation details, not as a guarantee for every older release.
- The linked Kubernetes documentation and external-metrics section resolve correctly, including redirects. No deprecated API is used in the examples.
- Review consisted of documentation/source verification, YAML parsing, and arithmetic checks. No live Kubernetes deployment or adapter integration test was performed; custom metric names require a corresponding adapter and the named application container must exist.
