# Validation Summary: How to Avoid HPA Feedback Loops When Scaling on Per-Pod Request Concurrency

## Status

validated

## Post Type

Technical guide and troubleshooting tutorial.

## Technologies Covered

- Kubernetes HorizontalPodAutoscaler (HPA), autoscaling/v2, and Deployments.
- Pods, Object, and External metrics and custom metrics adapters.
- kubectl and YAML configuration.
- Request concurrency instrumentation, queues, and downstream overload.

## Sources Consulted

- [Kubernetes HPA algorithm and scaling behavior](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/).
- [Kubernetes v1.35.0 autoscaling/v2 API definitions](https://github.com/kubernetes/kubernetes/blob/v1.35.0/staging/src/k8s.io/api/autoscaling/v2/types.go).
- [Kubernetes v1.35.0 replica calculator implementation](https://raw.githubusercontent.com/kubernetes/kubernetes/v1.35.0/pkg/controller/podautoscaler/replica_calculator.go).
- [kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/).
- [Kubernetes custom metrics versioned client](https://raw.githubusercontent.com/kubernetes/metrics/v0.35.0/pkg/client/custom_metrics/versioned_client.go).
- [Custom metrics v1beta1 response types](https://raw.githubusercontent.com/kubernetes/metrics/v0.35.0/pkg/apis/custom_metrics/v1beta1/types.go).
- [Kubernetes SIGs Prometheus adapter walkthrough](https://github.com/kubernetes-sigs/prometheus-adapter/blob/master/docs/walkthrough.md).
- [Prometheus instrumentation guidance](https://prometheus.io/docs/practices/instrumentation/).
- [Kubernetes Service documentation](https://kubernetes.io/docs/concepts/services-networking/service/).
- [Google SRE: Handling Overload](https://sre.google/sre-book/handling-overload/).
- [Google SRE: Addressing Cascading Failures](https://sre.google/sre-book/addressing-cascading-failures/).

## Issues Found

No technical issues found.

## Review Notes

- README.md was left unchanged. The post contains actionable configuration and commands and qualifies for technical validation.
- Reviewed YAML syntax and fields against the autoscaling/v2 API. The Pods metric uses the correct AverageValue target; the replica limits, Deployment reference, 300-second stabilization window, and one-Pod-per-60-second downscale policy are valid.
- Recalculated the four-Pod example and the service-total examples: each produces an unconstrained recommendation of eight replicas. Verified Object and External AverageValue normalization against the controller implementation. Duplicate totals and double normalization would distort these recommendations as described.
- Confirmed that multiple metrics select the largest recommendation. Missing samples, tolerance, stabilization, and rate limits can affect actual scaling; the post distinguishes its basic arithmetic from controller behavior.
- Checked shell syntax with bash -n. The quoted raw URI protects the wildcard and query string from shell expansion; labelSelector selects Pod labels. The adapter must serve the chosen custom metrics API version and metric, and app=checkout must select the intended workload Pods.
- Verified response object identity, timestamp, and value fields. A genuine idle zero differs from missing telemetry, which must retain its missing-data semantics.
- The concurrency advice is conditional on workload distribution and downstream capacity. Work still consuming resources after a client timeout remains real outstanding work until cancellation or completion; abandoned work can inflate demand for useful requests. Existing long-lived sessions need not migrate when replicas are added.
- The v1.35.0 source link is a valid pinned reference, not a claim to be the latest Kubernetes release. The examples use stable autoscaling/v2 and apps/v1 APIs. Custom metrics API version availability remains adapter-dependent, as the article states.
- Both technical links and the author profile resolve to the intended resources.
- Validation used official documentation, source inspection, manual configuration review, shell syntax checks, and arithmetic checks. Automated YAML parsing was unavailable because PyYAML is not installed. No live Kubernetes deployment, adapter query, or traffic experiment was performed.
