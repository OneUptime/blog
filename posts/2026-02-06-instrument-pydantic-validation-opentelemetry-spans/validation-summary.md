# Validation Summary: How to Instrument Pydantic Validation with OpenTelemetry Spans

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- Pydantic
- OpenTelemetry Python SDK
- OpenTelemetry tracing spans

## Sources Consulted
- Pydantic validators documentation: https://pydantic.dev/docs/validation/2.10/concepts/validators/
- Pydantic v2 migration guide: https://pydantic.dev/docs/validation/2.0/get-started/migration/
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/

## Issues Found
- The post used Pydantic v1 `@validator` examples. Updated them to Pydantic v2 `@field_validator` with classmethod validators, matching current Pydantic documentation.
- The post used a Pydantic v1 `@root_validator`. Updated the section and example to use a Pydantic v2 `@model_validator(mode='after')`, return `self`, and read values from the validated model instance.
- The nested-model validator used the removed v1 `field` validator argument and `field.name`. Updated it to receive validator info and use `info.field_name`.
- The OpenTelemetry status example called `trace.Status` and `trace.StatusCode`. Updated it to import `Status` and `StatusCode` from `opentelemetry.trace`, matching current OpenTelemetry Python documentation.
- Several validation calls used direct construction in places where explicit validation was clearer for current Pydantic examples. Updated them to `model_validate(data)` where appropriate.

## Review Notes
The updated Python examples were executed successfully with Pydantic 2.13.4 and OpenTelemetry SDK 1.42.1 in a temporary local package install. The automatic instrumentation example still intentionally wraps `__init__`, so its final demonstration uses direct model construction.
