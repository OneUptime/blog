# Validation Summary: How to Use Observability Governance: Enforce Semantic Convention Compliance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry semantic conventions
- OpenTelemetry Collector
- OpenTelemetry Collector transform processor
- OpenTelemetry Collector filter processor
- OpenTelemetry Transformation Language (OTTL)
- Python
- YAML
- GitHub Actions

## Sources Consulted
- OpenTelemetry Semantic Conventions: https://opentelemetry.io/docs/specs/otel/semantic-conventions/
- OpenTelemetry Resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/
- OpenTelemetry Service semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/service/
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry HTTP semantic convention stability migration guide: https://opentelemetry.io/docs/specs/semconv/non-normative/http-migration/
- OpenTelemetry Database semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/database-spans/
- OpenTelemetry SQL database semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/sql/
- OpenTelemetry RPC semantic conventions: https://opentelemetry.io/docs/specs/semconv/rpc/rpc-spans/
- OpenTelemetry Messaging semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- GitHub Actions setup-python action: https://github.com/actions/setup-python

## Issues Found
- The RPC attribute list used `rpc.system`, but current stable RPC semantic conventions use `rpc.system.name`. Changed the example to `rpc.system.name`.
- The custom attribute naming regex rejected underscores inside path components, which would incorrectly mark valid OpenTelemetry attributes such as `http.response.status_code` as non-compliant. Updated the regex to allow underscores inside dot-separated lowercase components.
- The Collector filter comment said it dropped service names that do not follow the required pattern, but the condition only matched names beginning with an uppercase letter. Updated the condition to compare `service.name` against the full organization pattern.

## Review Notes
- The Collector filter processor `trace_conditions` format is documented for Collector versions 0.146.0 and later; earlier versions used the now-deprecated nested `traces.*` configuration.
- The Python checker is a lightweight static scanner. It is syntactically valid, but it will not catch every attribute usage pattern across all supported languages.
