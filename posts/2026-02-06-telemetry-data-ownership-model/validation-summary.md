# Validation Summary: How to Use Telemetry Data Ownership: Define Who Owns, Who Can Access,

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry semantic conventions
- OpenTelemetry Collector configuration concepts
- YAML
- Python
- Flask
- PyYAML
- ClickHouse SQL

## Sources Consulted
- Flask 3.1.x Quickstart: https://flask.palletsprojects.com/en/stable/quickstart/
- Flask 3.1.x API documentation: https://flask.palletsprojects.com/en/stable/api/
- PyYAML documentation: https://pyyaml.org/wiki/PyYAMLDocumentation
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector processor documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/
- OpenTelemetry service semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/attributes/service/
- ClickHouse Map data type documentation: https://clickhouse.com/docs/sql-reference/data-types/map
- ClickHouse date and time functions documentation: https://clickhouse.com/docs/sql-reference/functions/date-time-functions
- ClickHouse type conversion functions documentation: https://clickhouse.com/docs/sql-reference/functions/type-conversion-functions

## Issues Found
- The Collector section said the Python snippet generated Collector configurations that enforce access levels. The snippet actually emits an abstract policy document, not a valid OpenTelemetry Collector config with receivers, processors, exporters, and service pipelines. Updated the wording, filename, function name, and variable names to describe the output as access policies that can be translated into Collector processors or downstream access controls.
- The cost reporting query used `resource_attributes['team.name']` as the owner field. `team.name` is not an OpenTelemetry semantic convention. Updated it to `resource_attributes['service.namespace']` and added a comment that the query assumes `service.namespace` is populated with the owning team, which matches the OpenTelemetry service semantic convention guidance.
- Removed an unused `functools.wraps` import from the Flask example.

## Review Notes
The YAML ownership schema is intentionally custom, not an OpenTelemetry or Kubernetes CRD schema. The Python and YAML snippets were checked for syntax. The SQL query remains schema-dependent because table and column names such as `otel_traces`, `resource_attributes`, and `attributes` depend on the observability backend's ClickHouse schema.
