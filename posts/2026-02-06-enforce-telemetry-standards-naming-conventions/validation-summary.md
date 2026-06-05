# Validation Summary: How to Enforce Telemetry Standards and Naming Conventions Across Platform Teams

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Semantic Conventions
- OpenTelemetry Python SDK
- OpenTelemetry Collector transform processor
- OpenTelemetry Collector attributes processor
- OpenTelemetry Transformation Language (OTTL)
- Python AST-based CI validation
- PromQL-style compliance dashboards

## Sources Consulted
- OpenTelemetry Semantic Conventions 1.41.1: https://opentelemetry.io/docs/specs/semconv/
- OpenTelemetry HTTP span semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry database span semantic conventions: https://opentelemetry.io/docs/specs/semconv/database/database-spans/
- OpenTelemetry messaging span semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/
- OpenTelemetry Python SpanProcessor API: https://opentelemetry-python.readthedocs.io/en/stable/_modules/opentelemetry/sdk/trace.html
- OpenTelemetry Collector transforming telemetry docs: https://opentelemetry.io/docs/collector/transforming-telemetry/
- OpenTelemetry Collector transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector attributes processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Collector spanmetrics connector docs: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/connector/spanmetricsconnector

## Issues Found
- The standards document referenced OpenTelemetry Semantic Conventions v1.25 and used older or generic span naming placeholders such as `db.system`, `db.operation`, and `{system} {operation}`. Updated the reference to v1.41 and aligned example placeholders with current HTTP, database, and messaging semantic conventions.
- The Python `ValidatingSpanProcessor` example did not inherit from the OpenTelemetry SDK `SpanProcessor` base class, and `force_flush` did not return the boolean expected by the SDK API. Added the import/base class and returned `True` from `force_flush`.
- The Python validator allowed several older OTel prefixes but missed current common prefixes such as `url.`, `server.`, `client.`, `network.`, `cloud.`, `k8s.`, and `error.`. Expanded the allowlist to avoid incorrectly warning on standard semantic convention attributes.
- The Collector transform example used `replace_pattern` as if it copied or renamed attributes. OTTL `replace_pattern` replaces text inside a string value; attribute renaming should use `set` plus `delete_key`. Replaced those statements with valid OTTL `set`/`delete_key` operations and added `error_mode: ignore`.
- The Collector section said to use the filter processor to drop non-compliant data, but the shown configuration does not use a filter processor and explicitly keeps data in enforcement mode. Revised the wording to match the actual transform and attributes processor configuration.
- The attributes processor comment said it counted violations for metrics, but the snippet only marks spans for downstream querying. Updated the comment to describe the behavior accurately.

## Review Notes
The dashboard queries are backend-specific examples. The exact Prometheus metric and label names for span-derived metrics depend on the spanmetrics connector/exporter or tracing backend configuration, so teams should adjust those names to their own backend.
