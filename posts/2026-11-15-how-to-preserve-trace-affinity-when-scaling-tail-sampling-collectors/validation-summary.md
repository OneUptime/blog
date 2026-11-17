# Validation Summary: How to Preserve Trace Affinity When Scaling Tail-Sampling Collectors

## Status

Validated through documentation review and the local checks listed below.

## Post Type

Practical troubleshooting tutorial.

## Technologies Covered

OpenTelemetry, Kubernetes

## Sources Consulted

- https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector-contrib/v0.120.0/exporter/loadbalancingexporter/README.md
- https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector-contrib/v0.120.0/processor/tailsamplingprocessor/README.md

## Issues Found

No unresolved structural issues found. Environment-dependent validation is identified below.

## Review Notes

- Reviewed technical guidance against the linked official documentation.
- Checked title length, canonical tags, unique title and slug, required metadata, and fenced code structure.
- YAML examples parsed with PyYAML; component schemas and environment-specific values require the documented runtime validation.
- Shell examples passed bash -n syntax checks; commands were not run against infrastructure.
- Parsed Kubernetes and exporter YAML and checked shell syntax. DNS convergence, hash routing, and rolling membership behavior were not tested against a live cluster.
