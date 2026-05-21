# Validation Summary: How to Optimize Istio Log Storage Costs

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Envoy access logging
- Kubernetes
- Prometheus
- Elasticsearch Index Lifecycle Management
- Fluentd S3 output
- Amazon S3

## Sources Consulted
- Istio Envoy access logs documentation: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Telemetry API access log task: https://istio.io/latest/docs/tasks/observability/logs/telemetry-api/
- Envoy attributes documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/advanced/attributes.html
- Envoy access log format documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage.html
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Elasticsearch ILM rollover documentation: https://www.elastic.co/guide/en/elasticsearch/reference/current/ilm-rollover.html
- Elasticsearch ILM phases and actions documentation: https://www.elastic.co/guide/en/elasticsearch/reference/current/ilm-index-lifecycle.html
- Fluentd S3 output documentation: https://docs.fluentd.org/output/s3
- AWS S3 pricing: https://aws.amazon.com/s3/pricing/

## Issues Found
- Telemetry API snippets used `telemetry.istio.io/v1alpha1`. Updated them to the current stable `telemetry.istio.io/v1` API shown in current Istio documentation.
- Error-only filters used `response.code >= ...` without handling failed connections where `response.code` is absent. Added `!has(response.code)` checks and adjusted the explanatory text.
- Slow-request filters used `response.duration`, but Envoy exposes total request duration as `request.duration`. Updated the CEL expressions.
- The custom access log format used `%REQ(PATH)%`; Envoy HTTP pseudo-headers use `:PATH`. Updated it to `%REQ(:PATH)%`.
- The sampling example used `request.id.substring(0, 2)`, which is less consistent with the string helpers shown in Istio examples. Updated it to `request.id.startsWith('0a')` with a `has(request.id)` guard.
- The Prometheus log-byte metric was presented too generically. Added a note that the metric name varies by logging pipeline.
- The Elasticsearch ILM description said logs stayed warm for two weeks, but the sample deletes indices at 14 days. Clarified the hot, warm, and delete timing.
- The S3 price omitted that pricing is per GB-month and region/storage-class dependent. Clarified that the example is S3 Standard in us-east-1.

## Review Notes
The post is technically relevant and now aligns with current official Istio Telemetry API, Envoy attribute, Kubernetes CLI, Elasticsearch ILM, Fluentd S3, and AWS S3 pricing references. Cost figures remain illustrative and may vary by vendor, region, retention period, replicas, compression, indexing configuration, and query workload.
