# Validation Summary: How to Diagnose Uneven OTLP Traffic Behind a Network Load Balancer

## Status

Validated through documentation review and the local checks listed below.

## Post Type

Practical troubleshooting tutorial.

## Technologies Covered

OpenTelemetry, Kubernetes

## Sources Consulted

- https://opentelemetry.io/docs/collector/scaling/
- https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector/v0.120.0/config/configgrpc/README.md

## Issues Found

No unresolved structural issues found. Environment-dependent validation is identified below.

## Review Notes

- Reviewed technical guidance against the linked official documentation.
- Checked title length, canonical tags, unique title and slug, required metadata, and fenced code structure.
- Shell examples passed bash -n syntax checks; commands were not run against infrastructure.
- YAML examples parsed with PyYAML; component schemas and environment-specific values require the documented runtime validation.
- Reviewed gRPC resolver and balancing configuration for Collector 0.120.0. PromQL and network commands require a running deployment; no load-balancer experiment was executed.
