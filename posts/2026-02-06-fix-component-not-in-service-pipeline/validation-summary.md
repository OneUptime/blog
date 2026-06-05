# Validation Summary: How to Fix the Common Mistake of Configuring a Component but Not Including It

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector configuration
- OpenTelemetry Collector contrib distribution
- Tail Sampling processor
- Memory Limiter processor
- Batch processor
- zPages extension
- YAML
- Python

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector architecture documentation: https://opentelemetry.io/docs/collector/architecture/
- OpenTelemetry Collector Tail Sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector Batch processor README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/batchprocessor/README.md
- OpenTelemetry Collector Memory Limiter processor README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/README.md
- OpenTelemetry Collector zPages extension README via Go package docs: https://pkg.go.dev/go.opentelemetry.io/collector/extension/zpagesextension
- Local validation with `otel/opentelemetry-collector-contrib:0.153.0 validate`

## Issues Found
- The `tail_sampling` processor example used `status_codes` directly under the policy. Current Collector contrib expects status-code policy options under `status_code`, so the example failed Collector validation. Changed it to `status_code: { status_codes: [ERROR] }` in block YAML form.
- The post said `validate` checks syntax but does not warn about unused components. The current command also validates component settings, even for unused components. Updated the sentence to say it validates syntax and component settings, but not unused component references.

## Review Notes
The core guidance is correct: configured receivers, processors, exporters, connectors, and extensions are not enabled unless referenced from the `service` section, and processor order in a pipeline determines processing order. The CI script intentionally checks receivers, processors, and exporters only; it does not check extensions or connectors.
