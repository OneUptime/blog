# Validation Summary: How to Modernize Monolithic Applications into Kubernetes Microservices

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Kubernetes Deployments and Services
- NGINX reverse proxy configuration
- Istio VirtualService traffic routing
- Prometheus and Prometheus Operator rules
- Go HTTP client code
- Bash scripting with curl, jq, bc, and kubectl
- Strangler Fig migration pattern and anti-corruption layers

## Sources Consulted
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Services documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- NGINX reverse proxy documentation: https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- kubectl set image reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/
- kubectl rollout status reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/

## Issues Found
- The `data-sync-service` Deployment had a selector with `app: data-sync` but no matching pod template labels. Added `spec.template.metadata.labels.app: data-sync` so the Deployment is valid under `apps/v1`.
- The Go anti-corruption layer snippet referenced undefined `UserService`, `Order`, `GetOrdersForUser`, and `translateOrders` symbols, and fetched a `user` variable without using it. Added minimal supporting types and translation functions, and used the fetched user ID when calling the monolith client.
- The Istio VirtualService used `subset: v1` and `subset: legacy` without defining matching DestinationRules. Removed the subset fields so the standalone weighted routing example works by routing between the two services directly.
- The Prometheus error-rate recording rules divided unaggregated vectors, which would not produce service-level error rates reliably because label sets would not match. Updated them to use `sum(rate(...)) / sum(rate(...))`.
- The Prometheus latency alert passed unaggregated histogram bucket rates to `histogram_quantile`. Updated it to use `sum by (le) (rate(..._bucket[5m]))`, matching Prometheus guidance for service-level histogram quantiles.
- The decommissioning script embedded raw PromQL in query URLs, which can break because braces and regex syntax need URL encoding. Replaced those calls with `curl -sG --data-urlencode`.
- The decommissioning script summed sampled rates over a query range and called the result an error count. Changed it to query `sum(increase(...[7d]))`, which matches the intended 7-day error count.
- Removed an unused `MICROSERVICE_TRAFFIC` assignment from the script because it did not affect the retirement decision.

## Review Notes
- YAML code fences were parsed with PyYAML, and Deployment selector/template label consistency was checked locally.
- The Bash snippet passed `bash -n` locally.
- Go and Kubernetes CLI validation tools were not installed in the local environment, so the Go example was reviewed manually against Go syntax rules and the Kubernetes examples were checked by YAML parsing plus official API documentation.
- The `nginx:1.21` image tag is old. It is not a syntax error, but the example should use a current, patched NGINX image in production.
