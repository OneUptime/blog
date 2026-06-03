# Validation Summary: How to Configure Resource Requests Based on Historical Usage Patterns

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes resource requests and limits
- Kubernetes kubelet and cAdvisor metrics
- kube-state-metrics
- Prometheus and PromQL
- Prometheus HTTP API and promtool
- Vertical Pod Autoscaler
- Horizontal Pod Autoscaler
- jq
- Python requests library

## Sources Consulted
- Kubernetes resource management documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes node metrics documentation: https://kubernetes.io/docs/reference/instrumentation/node-metrics/
- Kubernetes system metrics documentation: https://kubernetes.io/docs/concepts/cluster-administration/system-metrics/
- Kubernetes kube-state-metrics documentation: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics
- Kubernetes HorizontalPodAutoscaler v2 API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes Vertical Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Prometheus PromQL query basics: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus PromQL functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus PromQL operators and vector matching documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus storage documentation: https://prometheus.io/docs/prometheus/latest/storage/
- Prometheus promtool command documentation: https://prometheus.io/docs/prometheus/latest/command-line/promtool/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Python json module documentation: https://docs.python.org/3/library/json.html
- Requests API documentation: https://requests.readthedocs.io/en/latest/api/
- jq manual: https://jqlang.org/manual/

## Issues Found
- The post implied that the shown annotated-pod Prometheus scrape config was enough for the later container usage and resource request queries. Updated the text to state that Prometheus must also scrape kubelet `/metrics/cadvisor` and kube-state-metrics.
- The CPU and memory request/usage ratio PromQL examples divided vectors with different label sets, which can return no matches under Prometheus vector matching rules. Added aggregation by `namespace`, `pod`, and `container` before division.
- The alert PromQL expressions had the same vector matching problem. Added aggregation on both usage and request metrics before division.
- The cAdvisor queries included only `container!=""`, which can still include the pause/infra `POD` container in common Kubernetes metric setups. Added `container!="POD"` to avoid recommending resources for the infra container.
- The text said a high usage/request ratio meant workloads were close to limits. Corrected this to say they are close to requests.
- The weekly `jq` command tried to run `tonumber` on values such as `35.0%`, which fails because of the percent sign. Updated it to strip `%` before conversion.
- The `promtool query instant` command omitted the required Prometheus server argument. Added `http://localhost:9090` for execution inside the Prometheus pod.
- The VerticalPodAutoscaler example placed `updateMode` directly under `spec`, but the current VPA API configures it under `spec.updatePolicy.updateMode`. Moved the field and changed the update mode from deprecated `Auto` to `Recreate`.
- The VPA explanation did not mention that `Recreate` mode updates requests by recreating pods. Clarified that behavior.

## Review Notes
The Prometheus deployment snippet is still a simplified example and assumes a PVC, RBAC, kubelet scraping, and kube-state-metrics are configured elsewhere. The resource recommendation script is suitable as an illustrative starting point, but production use should add HTTP error handling, Prometheus query status checks, workload-level aggregation, and policy guardrails before applying recommendations automatically.
