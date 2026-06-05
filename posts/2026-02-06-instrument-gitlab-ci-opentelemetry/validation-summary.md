# Validation Summary: How to Instrument GitLab CI Pipelines with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitLab CI/CD
- GitLab Observability
- OpenTelemetry and OTLP
- OpenTelemetry Collector
- Shell scripting
- GitLab downstream and multi-project pipelines
- GitLab CI/CD variables and dotenv artifacts

## Sources Consulted
- GitLab Docs: Show CI/CD pipeline telemetry for Observability - https://docs.gitlab.com/operations/observability/ci_cd/
- GitLab Docs: Observability - https://docs.gitlab.com/operations/observability/
- GitLab Docs: CI/CD variables - https://docs.gitlab.com/ci/variables/
- GitLab Docs: Downstream pipelines - https://docs.gitlab.com/ci/pipelines/downstream_pipelines/
- GitLab Docs: Pass dotenv variables to specific jobs - https://docs.gitlab.com/ci/variables/dotenv_variables/
- OpenTelemetry Docs: OTLP Specification - https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry Docs: OTLP exporter configuration - https://opentelemetry.io/docs/concepts/sdk-configuration/otlp-exporter-configuration/
- OpenTelemetry Docs: CI/CD semantic conventions - https://opentelemetry.io/docs/specs/semconv/registry/attributes/cicd/
- OpenTelemetry Docs: Collector processors - https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector Contrib: Attributes processor - https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md

## Issues Found
- The post claimed GitLab 15.11 added built-in pipeline export directly to any OTLP-compatible backend. Current GitLab documentation describes CI/CD pipeline telemetry as an experimental GitLab Observability feature enabled with `GITLAB_OBSERVABILITY_EXPORT`, not an arbitrary OTLP endpoint configured with `OTEL_EXPORTER_OTLP_ENDPOINT`. Updated the introduction, enablement section, diagram, and conclusion to match the documented GitLab Observability flow.
- The self-managed `gitlab.rb` example used OpenTelemetry environment variables as if they enabled CI/CD pipeline telemetry. Replaced it with the documented project/group CI/CD variable configuration for `GITLAB_OBSERVABILITY_EXPORT`.
- The custom shell example relied on non-existent GitLab CI variables such as `OTEL_TRACE_ID` and `OTEL_PARENT_SPAN_ID`. Updated the script to generate a valid 32-hex trace ID and 16-hex span IDs itself, and clarified that custom OTLP spans are separate from GitLab's automatic Observability export unless trace context is explicitly managed.
- The curl example treated `OTEL_EXPORTER_OTLP_HEADERS` as a direct curl header. OpenTelemetry exporter header configuration uses key-value syntax, while curl requires HTTP header syntax. Replaced it with an explicit `OTEL_EXPORTER_OTLP_AUTH_HEADER` example using `Authorization: Bearer ...`.
- The trace attribute examples used non-standard `ci.pipeline.*` and `ci.job.*` attributes. Updated representative examples and custom spans to use current OpenTelemetry CI/CD semantic convention names such as `cicd.pipeline.run.id`, `cicd.pipeline.task.run.id`, and `cicd.pipeline.task.run.result`.
- The collector example said it extracted a project name from a full path, but the configured attributes processor only copied one attribute to another. Updated the comment and source attribute to accurately describe the behavior.
- The multi-project pipeline example passed `OTEL_TRACE_ID`, which is not a GitLab predefined variable. Updated the example to generate a custom trace ID in a dotenv artifact and show the downstream job fetching that artifact with `needs`.
- The pipeline example used `source`, which is not portable in POSIX shells used by many GitLab images. Updated the examples to use `. scripts/trace-step.sh` and changed the helper to `/bin/sh`.

## Review Notes
- The embedded shell helper passes `sh -n`.
- All fenced YAML snippets parse successfully with PyYAML.
- Ruby was not installed in the review environment, so YAML validation was performed with PyYAML instead of Ruby.
- The custom span helper intentionally remains a lightweight OTLP/JSON example. Production use should handle JSON escaping for arbitrary step names and should prefer an OpenTelemetry SDK or a maintained CI tracing tool where practical.
