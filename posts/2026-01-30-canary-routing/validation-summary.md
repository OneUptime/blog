# Validation Summary: How to Create Canary Routing

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- Kubernetes Ingress
- ingress-nginx canary annotations and session affinity
- Istio VirtualService and DestinationRule
- Prometheus, PromQL, and PrometheusRule
- Argo Rollouts canary strategy and AnalysisTemplate
- Kubernetes Python client
- Node.js, Express middleware, and prom-client
- Grafana dashboard JSON
- OpenTelemetry JavaScript SDK and semantic conventions

## Sources Consulted
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- ingress-nginx canary annotation documentation: https://kubernetes.github.io/ingress-nginx/examples/canary/
- ingress-nginx annotation reference: https://github.com/kubernetes/ingress-nginx/blob/main/docs/user-guide/nginx-configuration/annotations.md
- Istio VirtualService and traffic management documentation: https://istio.io/latest/docs/concepts/traffic-management/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Argo Rollouts rollout specification: https://argo-rollouts.readthedocs.io/en/stable/features/specification/
- Argo Rollouts NGINX traffic management documentation: https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/nginx/
- Argo Rollouts analysis documentation: https://argo-rollouts.readthedocs.io/en/stable/features/analysis/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- prom-client README: https://github.com/siimon/prom-client
- Kubernetes Python client documentation: https://github.com/kubernetes-client/python
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JavaScript SDK 2.x migration guide: https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/upgrade-to-2.x.md
- OpenTelemetry JavaScript semantic conventions README: https://github.com/open-telemetry/opentelemetry-js/blob/main/semantic-conventions/README.md

## Issues Found
- The automated traffic ramping script queried only the canary 5xx request rate but compared it to an error-rate threshold. Updated the Prometheus query to divide canary 5xx rate by total canary request rate and used `--data-urlencode` with `jq -r` for a safer Prometheus API call.
- The application-level sticky-session example said it updated the canary percentage without resetting assignments, but the method cleared the assignment cache. Updated the comment to match the actual deterministic reassignment behavior.
- The Argo Rollouts NGINX traffic-routing example omitted the required `canaryService` and `stableService` fields. Added both fields and adjusted the analysis arguments and PromQL queries to evaluate canary-version metrics instead of aggregate application metrics.
- The OpenTelemetry JavaScript tracing example used the deprecated `SemanticResourceAttributes` namespace and the removed `new Resource(...)` constructor style for current OpenTelemetry JS SDK 2.x usage. Updated it to use `resourceFromAttributes` and stable `ATTR_SERVICE_NAME` / `ATTR_SERVICE_VERSION` constants.

## Review Notes
Local syntax checks passed for all YAML, JSON, JavaScript, Python, and Bash fenced code blocks. `kubectl` was not installed in the workspace, so Kubernetes CLI behavior was verified against official documentation rather than local `kubectl --help`.
