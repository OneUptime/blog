# Validation Summary: How to Implement A/B Testing with Kubernetes Ingress Header-Based Routing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes Deployments, Services, Ingress, and CronJobs
- ingress-nginx canary annotations
- Istio VirtualService routing
- Prometheus Operator ServiceMonitor
- PromQL
- kubectl
- JavaScript fetch and Express cookie handling

## Sources Consulted
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Ingress API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/ingress-v1/
- Kubernetes CronJob API reference: https://kubernetes.io/docs/reference/kubernetes-api/batch/cron-job-v1/
- kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- ingress-nginx annotation documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- Istio traffic management documentation: https://istio.io/latest/docs/concepts/traffic-management/
- Istio request routing documentation: https://istio.io/latest/docs/tasks/traffic-management/request-routing/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The ServiceMonitor selected Services with `app: api`, but the earlier Service examples did not define that metadata label. Added `app` and `version` labels to both Services so the ServiceMonitor can select them.
- The ServiceMonitor endpoint referenced a `metrics` service port that was not defined in the Service examples. Named the existing service port `http` and changed the ServiceMonitor endpoint to scrape `port: http` with `path: /metrics`.
- The Istio example included a `DestinationRule` for host `api` with subsets, but the VirtualService routed directly to the separate `api-stable` and `api-experiment` Services and did not reference those subsets. Removed the unused, inconsistent DestinationRule from the snippet.
- The Istio claim said retry logic and circuit breaking are automatic. Adjusted the wording to say Istio can provide these features, because retries and circuit breaking depend on Istio traffic policy configuration.
- The PromQL error-rate example divided by an unaggregated denominator that could retain labels such as HTTP status. Changed it to aggregate numerator and denominator with `sum by (version)` so it compares per-version error rates.
- The PromQL latency example did not aggregate histogram buckets by version and `le`. Changed it to use `sum by (version, le)` inside `histogram_quantile`.
- The ingress-nginx cookie canary example set `experiment_group=beta`, but `canary-by-cookie` routes to canary when the cookie value is `always` and avoids canary when it is `never`. Changed the cookie value to `always`.
- The rollback CronJob used the same unaggregated error-rate pattern as the dashboard query. Changed both Prometheus API queries to use `sum(rate(...)) / sum(rate(...))` for stable and experiment versions.

## Review Notes
- The Kubernetes APIs used in the examples are current: `networking.k8s.io/v1` for Ingress and `batch/v1` for CronJob.
- The ingress-nginx canary precedence described in the post matches the documented order: header, cookie, then weight.
- The frontend custom header example is technically valid, but real cross-origin deployments may also need CORS configuration to allow `X-Experiment-Version`.
