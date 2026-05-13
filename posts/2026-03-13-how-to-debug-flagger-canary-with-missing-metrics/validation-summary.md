# Validation Summary: How to Debug Flagger Canary with Missing Metrics

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Flagger
- Kubernetes
- kubectl
- Prometheus and PromQL
- Prometheus Operator ServiceMonitor
- Istio metrics
- ingress-nginx metrics

## Sources Consulted
- Flagger Metrics Analysis documentation: https://docs.flagger.app/main/usage/metrics
- Flagger install documentation for `metricsServer` Helm value and `-metrics-server` deployment argument: https://docs.flagger.app/main/install/flagger-install-on-kubernetes
- Flagger source, Istio built-in metric queries: https://github.com/fluxcd/flagger/blob/main/pkg/metrics/observers/istio.go
- Flagger source, NGINX built-in metric queries: https://github.com/fluxcd/flagger/blob/main/pkg/metrics/observers/nginx.go
- Flagger source, MetricTemplate model fields: https://github.com/fluxcd/flagger/blob/main/pkg/apis/flagger/v1beta1/metric.go
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#run
- Istio standard metrics documentation: https://istio.io/latest/docs/reference/config/metrics/
- ingress-nginx monitoring documentation: https://kubernetes.github.io/ingress-nginx/user-guide/monitoring/

## Issues Found
- The command for checking Flagger's metrics server configuration searched for `metricsServer` in the rendered Deployment YAML. `metricsServer` is a Helm value and Canary spec field, while the Flagger container uses the `-metrics-server` argument. Updated the command to grep for `-metrics-server`.
- The `kubectl run` curl examples passed `curl` as arguments without `--command`. Updated both examples to use `--command -- curl ...`, matching kubectl's command override semantics.
- The pod port-forward example used a bare pod name. Updated it to `pod/<canary-pod>` for explicit current kubectl resource syntax.
- The Prometheus annotation Deployment snippet omitted required Deployment fields such as `selector`, matching pod labels, and a pod spec. Added a minimal complete structure around the annotations so the snippet is valid Kubernetes YAML.
- The Istio built-in request success query used `destination_workload="podinfo-canary"`, which does not match Flagger's current built-in query template. Updated it to use the `destination_workload=~"podinfo"` shape used by Flagger's Istio observer.
- The NGINX built-in request success query used `ingress="podinfo-canary"` and omitted Flagger's `canary!=""` label filter. Updated it to match Flagger's current NGINX observer query shape.
- The time range guidance conflated the canary analysis schedule interval with the metric query range interval. Updated the comments to distinguish `analysis.interval` from the metric `interval` used by `rate()`.

## Review Notes
- `kubectl` is not installed in this local environment, so command behavior was verified against Kubernetes documentation rather than local CLI help.
- The NGINX examples apply to the Kubernetes community ingress-nginx controller metrics, not the F5 NGINX Ingress Controller metric names.
