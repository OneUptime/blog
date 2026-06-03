# Validation Summary: How to Implement Shadow Deployments That Mirror Production Traffic

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes Deployments and Services
- Istio VirtualService traffic mirroring
- NGINX and ingress-nginx request mirroring
- kubectl logs
- Express.js middleware
- Elasticsearch JavaScript client
- Prometheus Operator ServiceMonitor
- Prometheus alerting rules and PromQL

## Sources Consulted
- Kubernetes Deployment API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio traffic mirroring task: https://istio.io/latest/docs/tasks/traffic-management/mirroring/
- NGINX mirror module documentation: https://nginx.org/en/docs/http/ngx_http_mirror_module.html
- ingress-nginx annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- Elasticsearch JavaScript client search examples: https://www.elastic.co/docs/reference/elasticsearch/clients/javascript/search_examples
- Elasticsearch JavaScript client API reference: https://www.elastic.co/docs/reference/elasticsearch/clients/javascript/api-reference
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus Operator ServiceMonitor documentation: https://prometheus-operator.dev/docs/developer/getting-started/

## Issues Found
- The NGINX section incorrectly stated that NGINX did not have built-in mirroring. Updated it to note that ingress-nginx supports mirror annotations and that NGINX itself has the mirror module.
- The NGINX sidecar example did not expose a Service that routes traffic to the sidecar proxy, so traffic could bypass mirroring. Added a Service targeting the sidecar's named `http` port and a distinct `mirror-proxy: enabled` label.
- The Istio examples used `networking.istio.io/v1beta1`. Updated them to the current `networking.istio.io/v1` API and added an example `gateways` attachment for the external host.
- The `kubectl logs -l` examples could miss matching lines because `kubectl logs` defaults to only 10 lines when a selector is used. Added `--tail=-1`.
- The Express shadow response logging example only checked the custom NGINX mirror header. Updated it to also honor `SHADOW_MODE`, which is how the shadow Deployment is configured and how Istio mirrored traffic can be identified in this post's setup.
- The Elasticsearch JavaScript client example used the older `results.body.hits.hits` response shape and nested the query under `body`. Updated it to the current client style with top-level `query` and `results.hits.hits`.
- The Prometheus `ServiceMonitor` example selected Service labels, but the shadow Service had no matching labels. Added matching labels and named the Service port so `endpoints.port` can resolve.
- The PromQL error-rate expression divided per-status vectors instead of aggregating numerator and denominator. Updated it to aggregate with `sum(rate(...))`.
- The PromQL histogram quantile expression did not aggregate histogram buckets by `le`. Updated it to use `sum by (le)`.

## Review Notes
The examples are intentionally illustrative and still assume surrounding production details such as an Istio Gateway named `api-gateway`, application metrics exposed on `/metrics`, consistent request IDs in logs, and side-effect isolation for all external systems.
