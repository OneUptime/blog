# Validation Summary: How to Set Up Service Mesh Observability Dashboards Comparing Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Linkerd
- Kubernetes
- Prometheus
- PromQL
- Grafana

## Sources Consulted
- Istio standard metrics documentation: https://istio.io/latest/docs/reference/config/metrics/
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Linkerd getting started and install documentation: https://linkerd.io/docs/getting-started/
- Linkerd proxy injection documentation: https://linkerd.io/2-edge/features/proxy-injection/
- Linkerd proxy metrics documentation: https://linkerd.io/2-edge/reference/proxy-metrics/
- Linkerd exporting metrics documentation: https://linkerd.io/docs/tasks/exporting-metrics/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/

## Issues Found
- The Linkerd install command omitted the CRD installation step. Added `linkerd install --crds | kubectl apply -f -` before `linkerd install | kubectl apply -f -`.
- The same `demo` namespace was used for both meshes while the text recommended separate namespaces. Changed the examples to `demo-istio` and `demo-linkerd`.
- The Prometheus section was labeled as federation but showed direct scraping. Updated the section to describe Prometheus scraping and changed the Istio job to scrape Envoy stats from `/stats/prometheus` on ports matching `.*-envoy-prom`, following Istio's documented custom scrape pattern.
- The Prometheus deployment wording implied the ConfigMap alone deployed Prometheus. Changed it to say the configuration is applied to an existing Prometheus deployment.
- The metric relabeling example attempted to rename a metric by using `source_labels: [request_total]`, which treats `request_total` as a label name. Changed it to use `source_labels: [__name__]`, `target_label: __name__`, and `replacement: linkerd_requests_total`.
- Tightened the `dst_service` relabeling rule with `regex: (.+)` so missing labels are not copied as empty `destination_service` values.
- Fixed PromQL examples in non-JSON code blocks that contained escaped quotes, which would fail if copied directly into Prometheus.
- Clarified that Linkerd's success/failure classification applies to `response_total`; current Linkerd docs note that `response_latency_ms` is recorded before classification labels are known.

## Review Notes
The Grafana JSON is still a minimal dashboard fragment rather than a complete production-ready dashboard export with datasource, panel type, and layout fields. The Prometheus examples assume cAdvisor/container metrics are already available for proxy CPU and memory queries.
