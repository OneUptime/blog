# Validation Summary: How to Tune Kubernetes API Server Request Throttling and Rate Limits

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes API server
- Kubernetes API Priority and Fairness (APF)
- FlowSchema
- PriorityLevelConfiguration
- kubectl
- Prometheus metrics and alert rules

## Sources Consulted
- Kubernetes documentation: API Priority and Fairness - https://kubernetes.io/docs/concepts/cluster-administration/flow-control/
- Kubernetes API reference: FlowSchema v1 - https://kubernetes.io/docs/reference/kubernetes-api/flowcontrol/flow-schema-v1/
- Kubernetes API reference: PriorityLevelConfiguration v1 - https://kubernetes.io/docs/reference/kubernetes-api/flowcontrol/priority-level-configuration-v1/
- Kubernetes Deprecated API Migration Guide - https://kubernetes.io/docs/reference/using-api/deprecation-guide/
- Kubernetes Metrics Reference - https://kubernetes.io/docs/reference/instrumentation/metrics/

## Issues Found
- The post used `flowcontrol.apiserver.k8s.io/v1beta3` for FlowSchema and PriorityLevelConfiguration manifests. That API version was deprecated in Kubernetes v1.29 and is no longer served as of Kubernetes v1.32. Updated all examples to `flowcontrol.apiserver.k8s.io/v1`.
- The PriorityLevelConfiguration examples used `assuredConcurrencyShares`. In the stable `v1` API this field is named `nominalConcurrencyShares`. Updated all manifests and the concurrency formula text.
- The apiserver configuration included `--enable-flowcontrol-api-v1beta3=true`, which is not the documented way to enable the APF API group and is obsolete for the stable API. Removed the flag.
- The article described APF as replacing max-inflight throttling. Kubernetes documentation describes APF as improving on those flags, while the flags still define the total server concurrency limit when APF is enabled. Updated the wording.
- The concurrency formula used only `--max-requests-inflight`. With APF enabled, the total server concurrency limit is the sum of `--max-requests-inflight` and `--max-mutating-requests-inflight`. Updated the formula and example numbers.
- One FlowSchema example used `namespaces: ["development", "dev-*"]`. FlowSchema namespace matching supports exact namespace names or the `*` wildcard, not glob patterns. Replaced `dev-*` with `dev`.
- The monitoring section labeled `apiserver_current_inflight_requests` as current requests by priority level. APF-specific priority-level breakdown is available through flowcontrol metrics such as `apiserver_flowcontrol_current_executing_requests`. Updated the metric example and related debugging command.
- The queue comment said the number of queues should be prime. Kubernetes documentation requires a positive number and provides guidance around shuffle sharding, but does not require prime values. Removed the incorrect recommendation.

## Review Notes
The post is technically valid after the fixes. Some tuning values remain illustrative rather than universal; production values should still be based on observed traffic, queueing, rejection, and wait-duration metrics for the specific cluster.
