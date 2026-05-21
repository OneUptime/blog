# Validation Summary: How to Use Fault Injection for Chaos Engineering in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio VirtualService
- Istio fault injection
- Kubernetes
- kubectl
- Prometheus
- Bash
- jq

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio fault injection task guide: https://istio.io/latest/docs/tasks/traffic-management/fault-injection/
- Istio traffic management concepts: https://istio.io/latest/docs/concepts/traffic-management/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Kubernetes kubectl delete reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/
- Kubernetes labels and selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/

## Issues Found
- Updated all Istio `VirtualService` examples from `networking.istio.io/v1beta1` to the current stable `networking.istio.io/v1` API used in the current Istio documentation.
- Replaced raw PromQL-in-URL `curl` calls with `curl -G --data-urlencode` so the Prometheus `query` parameter is encoded correctly.
- Changed the retry wording in the partial-failure experiment to "application retry mechanism" because Istio notes that retries and timeouts are not enabled on the same client-side HTTP route where faults are enabled.
- Replaced the emergency-stop pipeline with `kubectl delete virtualservices -A -l chaos-experiment`, which directly uses Kubernetes label-selector deletion across namespaces and matches the rest of the article's labeling strategy.
- Corrected the emergency-stop comment from removing all VirtualService fault injections to removing all labeled chaos experiment VirtualServices, because unlabeled fault-injection rules cannot be safely selected by that command.

## Review Notes
- The examples assume the target Kubernetes services exist in the same namespace as each `VirtualService`; Istio supports short host names, but its documentation recommends fully qualified domain names to avoid namespace-related misconfiguration.
- The safety scripts assume `curl`, `jq`, and `bc` are available in the environment where the commands run.
