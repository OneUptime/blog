# Validation Summary: Monitoring vs Observability: What SREs Actually Need

## Status
not-code-blog

## Post Type
Conceptual guide / opinion piece (SRE strategy, comparison, and maturity roadmap)

## Technologies Covered
- Monitoring and observability concepts
- OpenTelemetry (SDKs, collector, metrics/traces/logs)
- Distributed tracing, exemplars, tail-based sampling
- SLOs and burn-rate alerting
- OneUptime platform

## Sources Consulted
- OpenTelemetry semantic conventions (resource attributes such as `service.name`, `deployment.environment`) — https://opentelemetry.io/docs/specs/semconv/
- OpenTelemetry Collector tail-based sampling processor docs — https://opentelemetry.io/docs/collector/
- OpenTelemetry / Prometheus exemplars documentation — https://opentelemetry.io/docs/specs/otel/metrics/data-model/#exemplars
- Google SRE Workbook, multi-window multi-burn-rate alerting — https://sre.google/workbook/alerting-on-slos/

## Issues Found
No technical issues found. The post contains no code examples, terminal commands, or configuration snippets — it is a conceptual strategy/comparison guide. The technical concepts referenced (dual/multi-window burn-rate alerts, exemplars to jump from metrics to traces, tail-based sampling on errors/latency, OpenTelemetry SDK + collector instrumentation, standardized attribute keys) are all accurately described and consistent with authoritative sources.

## Review Notes
- The attribute key `deployment.environment` is the classic OpenTelemetry resource attribute and is still widely recognized; recent semantic conventions have moved toward `deployment.environment.name`. This is a passing inline mention rather than a code snippet, and `deployment.environment` remains valid and commonly used, so no change was made. Worth keeping in mind for future updates.
- All other claims are conceptual and accurate. No code to validate, hence the `not-code-blog` classification.
