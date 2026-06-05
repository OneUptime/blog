# Validation Summary: How to Instrument Kong API Gateway with OpenTelemetry

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kong Gateway
- Kong OpenTelemetry plugin
- Kong Admin API
- Kong declarative configuration
- Kong Ingress Controller
- Kubernetes
- OpenTelemetry Collector
- OTLP/HTTP
- Distributed tracing and context propagation

## Sources Consulted
- Kong OpenTelemetry plugin overview: https://developer.konghq.com/plugins/opentelemetry/
- Kong OpenTelemetry plugin configuration reference: https://developer.konghq.com/plugins/opentelemetry/reference/
- Kong OpenTelemetry propagation example: https://developer.konghq.com/plugins/opentelemetry/examples/extract-clear-inject/
- Kong Gateway tracing reference: https://developer.konghq.com/gateway/tracing/
- Kong Gateway configuration reference: https://developer.konghq.com/gateway/configuration/
- Kong OpenTelemetry collect metrics, logs, and traces guide: https://developer.konghq.com/how-to/collect-metrics-logs-and-traces-with-opentelemetry/
- OpenTelemetry Collector processor documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry tail sampling documentation: https://opentelemetry.io/blog/2022/tail-sampling/
- OpenTelemetry Collector batch processor package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor/batchprocessor

## Issues Found
- The Kong Admin API and declarative examples used `config.endpoint`, which is deprecated for traces. Changed the examples to use `traces_endpoint`.
- The post did not state that Kong tracing requires `tracing_instrumentations` to be enabled. Added the required `kong.conf` guidance.
- The declarative and Kubernetes examples used the deprecated `header_type` field. Replaced it with the current `propagation` configuration.
- The Kubernetes example incorrectly represented plugin configuration as a Helm chart ConfigMap entry. Replaced it with a `KongClusterPlugin` resource for global plugin enablement under Kong Ingress Controller.
- The span attribute example included unsupported or outdated attribute names such as `kong.route`, `kong.service`, `kong.consumer`, and `kong.balancer.ip`. Updated the example to match current Kong trace output and documented balancer span attributes.
- The plugin latency section suggested querying a `kong.plugin` attribute. Updated it to query plugin spans by the `kong.<phase>.plugin.<plugin-name>` span-name pattern.
- The OpenTelemetry Collector pipeline placed `batch` before `tail_sampling`. Reordered processors so tail sampling runs before batching, consistent with Collector batch processor guidance.
- The tail sampling comment described the probabilistic policy as applying only to successful traces. Updated the comment to say it samples an additional 20% of traces.

## Review Notes
The guide focuses on tracing. Kong OpenTelemetry metrics are supported in current Kong Gateway versions, but the post does not include a metrics configuration example.
