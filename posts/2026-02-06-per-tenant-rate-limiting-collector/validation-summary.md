# Validation Summary: How to Use Per-Tenant Rate Limiting in the Collector to Prevent Noisy Neighbor

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector routing connector
- OpenTelemetry Collector probabilistic sampler processor
- OpenTelemetry Collector internal telemetry
- Go
- `golang.org/x/time/rate`
- Prometheus alerting rules

## Sources Consulted
- OpenTelemetry Collector connector components documentation: https://opentelemetry.io/docs/collector/components/connector/
- OpenTelemetry Collector routing connector documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/connector/routingconnector
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector probabilistic sampler processor configuration source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/probabilisticsamplerprocessor/config.go
- OpenTelemetry Collector `ptrace` package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/pdata/ptrace
- Go `golang.org/x/time/rate` package documentation: https://pkg.go.dev/golang.org/x/time/rate

## Issues Found
- The post described the first Collector example as using the Transform Processor, but the example used routing. I changed the heading to refer to the routing connector.
- The Collector configuration used the deprecated routing processor style with `from_attribute`, `attribute_source`, `value`, and processor placement, then referenced `routing/traces` as a receiver. Current documentation uses a `routing` connector configured under `connectors`, with OTTL `condition` rules, and the connector acts as an exporter in the intake pipeline and a receiver in destination pipelines. I updated the snippet accordingly.
- The sampling comment said to "increase sampling" when a team exceeds budget, but the shown percentages reduced traffic by lowering the sampling percentage. I corrected the wording.
- The internal telemetry snippet used `service.telemetry.metrics.address`, which OpenTelemetry documents as ignored as of Collector v0.123.0. I replaced it with the current `readers.pull.exporter.prometheus.host` and `port` form.
- The Prometheus alert implied that a rate-limiter metric exists automatically. I clarified that the alert applies if the custom processor emits the counter, and adjusted the metric name to the `otelcol_` prefix used by current Collector Prometheus metrics.

## Review Notes
The custom Go code is illustrative and uses valid `ptrace` and `golang.org/x/time/rate` APIs, but it is not a complete Collector processor implementation with a factory, configuration loader, component registration, or metric emission. A future article could expand that into a full custom Collector component.
