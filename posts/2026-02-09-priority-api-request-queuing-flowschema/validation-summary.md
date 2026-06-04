# Validation Summary: How to Set Up Priority-Based API Request Queuing with FlowSchema

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes API Priority and Fairness
- FlowSchema
- PriorityLevelConfiguration
- kubectl
- Kubernetes API server metrics
- PrometheusRule

## Sources Consulted
- Kubernetes API Priority and Fairness documentation: https://kubernetes.io/docs/concepts/cluster-administration/flow-control/
- Kubernetes FlowSchema v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/flowcontrol/flow-schema-v1/
- Kubernetes PriorityLevelConfiguration v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/flowcontrol/priority-level-configuration-v1/
- Kubernetes APF debugging documentation: https://kubernetes.io/docs/reference/debug-cluster/flow-control/
- Kubernetes metrics reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Kubernetes deprecated API migration guide: https://v1-32.docs.kubernetes.io/docs/reference/using-api/deprecation-guide/

## Issues Found
- The examples used `flowcontrol.apiserver.k8s.io/v1beta3`, which is no longer served as of Kubernetes v1.32. Updated FlowSchema and PriorityLevelConfiguration manifests to `flowcontrol.apiserver.k8s.io/v1`, which is the current served API version.
- Several wildcard `resourceRules` omitted both `clusterScope` and `namespaces`. Added `clusterScope: true` and `namespaces: ["*"]` where the examples intend to match all resources across namespaced and cluster-scoped requests.
- The `queueLengthLimit` and `handSize` comments were inaccurate. Updated them to describe the per-queue wait limit and the number of queues considered for a queued request.
- The metrics command comment said it enabled metrics. Updated it to say it queries the metrics endpoint.
- The debugging section implied FlowSchema names could be obtained directly from logs or client output. Updated it to use the official APF response-header UID mapping approach and to grep for `X-Kubernetes-PF` headers.

## Review Notes
The Prometheus metrics used in the post are present in Kubernetes documentation, but several APF metrics are beta or alpha depending on the metric. The local environment did not have `kubectl`, Ruby, or yq installed, so command execution against a cluster and local YAML schema validation were not performed.
