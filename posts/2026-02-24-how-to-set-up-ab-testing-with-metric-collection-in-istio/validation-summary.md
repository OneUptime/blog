# Validation Summary: How to Set Up A/B Testing with Metric Collection in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio VirtualService
- Istio DestinationRule
- Kubernetes Deployments and Services
- Prometheus and PromQL
- Prometheus Python client
- Grafana dashboards
- kubectl patch
- Alerting rules

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus Python client labels documentation: https://prometheus.github.io/client_python/instrumenting/labels/
- Prometheus Python client histogram documentation: https://prometheus.github.io/client_python/instrumenting/histogram/
- Grafana dashboard JSON model documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/view-dashboard-json-model/

## Issues Found
- The sticky-routing example used short service names while the rest of the post used the fully qualified Kubernetes service name. Istio supports short names, but its documentation recommends fully qualified domain names to avoid namespace-based ambiguity. Updated the sticky-routing VirtualService hosts and destinations to `product-page.production.svc.cluster.local`.
- The sticky-routing fallback comment said new users are randomly assigned 50/50. A weighted VirtualService route splits requests, but it does not persist an assignment cookie by itself. Updated the comment and explanation to clarify that requests without the assignment cookie use the 50/50 fallback, and that the API gateway or frontend must set the cookie before or with the first response.

## Review Notes
The Istio traffic-splitting, subset, metric label, PromQL, Prometheus HTTP API, Python client, Grafana JSON, alert rule, and `kubectl patch --type='json'` examples are technically consistent with the referenced documentation. The A/B testing statistics guidance is directionally correct, but a production experimentation platform should also account for sample-ratio mismatch, multiple comparisons, guardrail metrics, and user-level assignment analysis.
