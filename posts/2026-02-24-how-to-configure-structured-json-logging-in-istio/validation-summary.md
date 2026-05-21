# Validation Summary: How to Configure Structured JSON Logging in Istio

## Status
validated

## Post Type
Technical guide / Configuration tutorial

## Technologies Covered
- Istio MeshConfig and IstioOperator
- Istio Telemetry API
- Envoy access logging and substitution formatters
- Istiod component logging
- Fluent Bit log parsing
- Grafana Alloy and Loki
- Elasticsearch queries

## Sources Consulted
- Istio Envoy access logs task: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio MeshConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio component logging docs: https://istio.io/latest/docs/ops/diagnostic-tools/component-logging/
- Istio 1.12 release notes for Telemetry API access logging support: https://istio.io/latest/news/releases/1.12.x/announcing-1.12/
- Istio v1 API promotion announcement: https://istio.io/latest/blog/2024/v1-apis/
- Istio access log implementation source: https://github.com/istio/istio/blob/master/pilot/pkg/model/telemetry_logging.go
- Istio MeshConfig API source: https://github.com/istio/api/blob/master/mesh/v1alpha1/config.proto
- Envoy access log usage docs: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage.html
- Envoy substitution formatter docs: https://www.envoyproxy.io/docs/envoy/latest/configuration/advanced/substitution_formatter.html
- Fluent Bit parser filter docs: https://docs.fluentbit.io/manual/pipeline/filters/parser
- Fluent Bit Kubernetes filter docs: https://docs.fluentbit.io/manual/data-pipeline/filters/kubernetes/
- Grafana Alloy loki.process docs: https://grafana.com/docs/alloy/latest/reference/components/loki.process/
- Grafana Loki Promtail CRI stage docs, including Promtail deprecation/EOL notice: https://grafana.com/docs/loki/latest/clients/promtail/stages/cri/

## Issues Found
- Corrected the proxy update wording. Istio pushes updated xDS configuration through Istiod; proxies do not need to wait specifically for a reconnect.
- Added the missing `x_forwarded_for` field to the example default Istio JSON access log fields, matching Istio's default JSON access log structure.
- Clarified the Telemetry API version statement. Access logging support arrived with the Telemetry API work in Istio 1.12, while the stable `telemetry.istio.io/v1` API used in the snippet is available in Istio 1.22 and later.
- Replaced unsupported peer namespace/workload substitution operators in the extension provider example with documented Envoy certificate SAN operators: `%DOWNSTREAM_PEER_URI_SAN%` and `%UPSTREAM_PEER_URI_SAN%`.
- Fixed the Fluent Bit pipeline. The original Kubernetes filter settings removed the `log` field before the parser filter tried to parse it, so those settings were removed and the parser filter now operates on the CRI `log` field.
- Replaced the Promtail example with a Grafana Alloy `loki.process` example because Promtail is deprecated and reached EOL on March 2, 2026.

## Review Notes
- The custom JSON access log examples use Envoy command operators supported by Istio's access log formatting path.
- The Elasticsearch query is structurally valid as an illustrative example, though production Elasticsearch mappings may require querying a `.keyword` field for exact `upstream_cluster` matches.
- JSON snippets in the post were parsed successfully after the corrections.
