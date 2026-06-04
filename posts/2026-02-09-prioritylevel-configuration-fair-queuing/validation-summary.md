# Validation Summary: How to Configure PriorityLevelConfiguration for API Server Fair Queuing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes API Priority and Fairness
- PriorityLevelConfiguration resources
- kube-apiserver FlowControl metrics
- kubectl
- Prometheus / PromQL
- PrometheusRule
- Go client retry handling with client-go

## Sources Consulted
- Kubernetes PriorityLevelConfiguration API reference: https://kubernetes.io/docs/reference/kubernetes-api/flowcontrol/priority-level-configuration-v1/
- Kubernetes API Priority and Fairness documentation: https://kubernetes.io/docs/concepts/cluster-administration/flow-control/
- Kubernetes Metrics Reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Kubernetes Deprecated API Migration Guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide/
- client-go retry package documentation: https://pkg.go.dev/k8s.io/client-go/util/retry

## Issues Found
- The post used `flowcontrol.apiserver.k8s.io/v1beta3`, which is deprecated and no longer served as of Kubernetes v1.32. Updated all PriorityLevelConfiguration examples to `flowcontrol.apiserver.k8s.io/v1`.
- The fair queuing description said the flow distinguisher is typically username and namespace. Kubernetes FlowSchemas distinguish by user, namespace, or no distinguisher. Changed this to username or namespace.
- The post said PriorityLevelConfiguration status shows current utilization, queue depth, and rejected requests. The resource status contains conditions; utilization and queue data come from API server metrics. Updated the text accordingly.
- The concurrency formula described an exact actual concurrency calculation. Kubernetes computes a nominal concurrency limit with `ceil(...)`, and dynamic limits may be adjusted by borrowing. Updated the formula wording.
- The lending example treated `nominalConcurrencyShares` as directly lendable seats. Lendable capacity is calculated from the nominal concurrency limit, not raw shares. Updated the explanation.
- The queue parameter guidance said `queues` must be a power of two. The API requires a positive integer; examples often use 32-128. Updated the guidance.
- The exempt priority examples implied ordinary leader-election and scheduler/controller traffic should be exempt. Kubernetes default configuration gives leader-election and system traffic their own priority levels, while exempt is for requests that must bypass flow control, such as `system:masters`. Updated the use cases.
- The monitoring section labeled `apiserver_flowcontrol_current_limit_seats` as seats occupied. That metric is the dynamic concurrency limit. Replaced it with `apiserver_flowcontrol_current_executing_seats`.
- The queue saturation alert used `apiserver_flowcontrol_request_queue_length_after_enqueue_total`, which is not the current metric name, and divided a gauge by a histogram expression. Replaced it with a `histogram_quantile` expression over `apiserver_flowcontrol_request_queue_length_after_enqueue_bucket`.

## Review Notes
The examples now target the stable FlowControl v1 API available since Kubernetes v1.29. Several APF metrics are still alpha or beta in Kubernetes documentation, so dashboards and alerts should be rechecked during cluster upgrades.
