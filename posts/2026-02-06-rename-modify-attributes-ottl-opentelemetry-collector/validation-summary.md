# Validation Summary: How to Rename and Modify Attributes Using OTTL in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Transformation Language (OTTL)
- Transform processor
- Resource processor
- Kubernetes attributes processor
- OpenTelemetry semantic conventions

## Sources Consulted
- OpenTelemetry Collector Transform Processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OTTL functions reference: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/ottlfuncs
- OpenTelemetry Collector transforming telemetry documentation: https://opentelemetry.io/docs/collector/transforming-telemetry/
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/attributes/http/
- OpenTelemetry database semantic conventions: https://opentelemetry.io/docs/specs/semconv/database/database-spans/
- OpenTelemetry resource/service semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/service/
- OpenTelemetry deployment semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/

## Issues Found
- Several OTTL converter names were outdated or incorrect. Replaced `Upper` with `ToUpperCase`, `Lower` with `ToLowerCase`, `time_now()` with `Now()`, and `DayOfWeek` with `Weekday` to match current OTTL functions.
- The `ExtractPatterns` examples treated unnamed regex captures as scalar return values. Reworked those examples to copy the original value and use `replace_pattern` with capture replacement, guarded by `IsMatch`.
- The HTTP semantic convention examples used deprecated attributes such as `http.method`, `http.status_code`, and `http.url`. Updated them to current attributes such as `http.request.method`, `http.response.status_code`, and `url.full`.
- The database semantic convention examples used older names `db.name` and `db.operation`. Updated them to `db.namespace` and `db.operation.name`.
- The resource examples used older `deployment.environment` and a non-semantic `service.instance` attribute. Updated them to `deployment.environment.name` and `service.instance.id`.
- The email regex used `[A-Z|a-z]`, which also matches a literal pipe character. Updated it to `[A-Za-z]`.
- The complete pipeline included a `k8scluster` receiver described as receiving Kubernetes logs but not used in the logs pipeline. Removed that unused receiver block from the logs-focused example.
- The resource processor rename example used `insert`, which would not update an existing destination attribute. Changed it to `upsert` before deleting the source attribute.

## Review Notes
The examples intentionally remain focused on log-level OTTL transformations. In production configurations, add `where` guards for type-sensitive conversions when inputs may be missing or malformed, even though the transform processor can ignore statement errors depending on `error_mode`.
