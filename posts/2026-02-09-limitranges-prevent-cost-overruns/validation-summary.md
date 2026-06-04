# Validation Summary: How to Configure K8s Limit Ranges That Prevent Cost Overruns from Unbounded

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes LimitRange
- Kubernetes ResourceQuota
- Kubernetes resource requests and limits
- kubectl
- Prometheus Operator PrometheusRule
- Kubernetes API server metrics

## Sources Consulted
- Kubernetes Limit Ranges documentation: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes LimitRange v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/limit-range-v1/
- Kubernetes Resource Quotas documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes Resource Management for Pods and Containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes Init Containers resource sharing documentation: https://kubernetes.io/docs/concepts/workloads/pods/init-containers/
- Kubernetes Metrics Reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Kubernetes kubectl create reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create
- Kubernetes kubectl rollout restart reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- Clarified that `LimitRange` is a policy enforced by the `LimitRanger` admission controller, not itself the admission controller.
- Clarified that LimitRange applies to newly created or updated pods and persistent volume claims, and that existing pods are unchanged after LimitRange changes.
- Reworded container and pod validation descriptions to match Kubernetes object behavior and effective pod resource accounting.
- Fixed the production LimitRange defaults so `default` and `defaultRequest` values satisfy the configured `maxLimitRequestRatio`.
- Fixed the "within limits" test pod so its CPU and memory limit-to-request ratios satisfy the configured `maxLimitRequestRatio`.
- Fixed the staging LimitRange memory default request so it satisfies the configured memory `maxLimitRequestRatio`.
- Corrected the statement that tiny requests cause OOM; tiny requests can overpack nodes, while memory limits and actual usage drive OOM kills.
- Corrected the multi-container pod guidance for regular init containers, which use the highest per-resource init request or limit instead of being summed like app and sidecar containers.
- Changed the API server log example from "audit logs" to API server logs and removed an unreliable namespace-counting command.
- Updated the Prometheus alert query and description to use current Kubernetes API server metric labels more precisely.

## Review Notes
The YAML uses current Kubernetes `v1` `LimitRange` and `ResourceQuota` APIs. The `PrometheusRule` example depends on the Prometheus Operator CRD being installed. Local `kubectl` was not available in this environment, so kubectl command validation was performed against the official Kubernetes command references.
