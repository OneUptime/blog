# Validation Summary: How to Configure the HTTP Forwarder Extension in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib HTTP Forwarder extension
- Collector extension configuration
- Collector HTTP client/server TLS configuration
- Collector authentication extensions
- Collector internal telemetry

## Sources Consulted
- OpenTelemetry Collector Contrib HTTP Forwarder extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/extension/httpforwarderextension
- OpenTelemetry Collector Contrib HTTP Forwarder extension config schema: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/httpforwarderextension/config.schema.yaml
- OpenTelemetry Collector Contrib HTTP Forwarder extension implementation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/httpforwarderextension/extension.go
- OpenTelemetry Collector Contrib HTTP Forwarder extension metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/httpforwarderextension/metadata.yaml
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector extensions registry: https://opentelemetry.io/docs/collector/components/extension/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector logging exporter removal announcement: https://github.com/open-telemetry/opentelemetry-collector/issues/11337

## Issues Found
- The post described the HTTP Forwarder extension as supporting multiple egress endpoints, weighted load balancing, fallback targets, request mirroring, routing rules, health checks, circuit breaking, rate limiting, and custom extension telemetry. The official component config only exposes `ingress` and `egress` HTTP settings, with one `egress.endpoint`. I changed those sections to state that these features are not implemented by the extension and should be handled by a proxy, gateway, service mesh, load balancer, or telemetry-specific Collector routing components.
- The multiple-endpoint example used unsupported fields such as `egress.endpoints`, `weight`, `fallback`, `load_balancing`, and `retry`. I replaced it with two separate `http_forwarder` instances, each with its own ingress listener and single egress endpoint.
- The routing example used unsupported `routing` and `match` configuration. I removed the invalid YAML and explained that the forwarder does not route based on headers, paths, or query parameters.
- The header manipulation example used unsupported nested `headers.add`, `headers.remove`, and `headers.set` lists. I changed it to the supported `headers` map syntax and clarified that the extension only adds static headers.
- The metrics example used an unsupported extension-level `telemetry.metrics` block and listed undocumented metrics such as `requests_total` and `backend_health`. I replaced it with standard Collector internal telemetry guidance.
- The examples used the removed `logging` exporter. I changed those examples to the current `debug` exporter.
- The examples used legacy-style environment variable substitutions such as `${AUTH_TOKEN}`. I updated them to the documented `${env:AUTH_TOKEN}` form.

## Review Notes
The HTTP Forwarder extension is beta in the contrib and k8s Collector distributions. It preserves the request URI, rewrites the scheme and host to the configured egress endpoint, adds configured egress headers, and adds a `Via` header. It is a focused forwarding extension rather than a general traffic-management proxy.
