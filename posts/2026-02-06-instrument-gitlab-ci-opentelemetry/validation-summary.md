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

## Re-review 2026-06-25 (issue #146)

A reader (issue #146) followed the post but could not get the "project-level configuration" working, and asked two specific questions: (1) is this feature Ultimate-tier only, as some other GitLab docs seemed to imply, and (2) is editing `gitlab.rb` mandatory to get project-level functionality? Re-verified against current official GitLab documentation and made targeted, body-only edits to address the confusion.

### Facts verified (official sources)
- CI/CD pipeline telemetry for GitLab Observability is documented as `Tier: Free, Premium, Ultimate`, `Offering: GitLab.com, GitLab Self-Managed`, `Status: Experiment`. It is NOT Ultimate-only in the current (GitLab 18.1+) docs. Source: https://docs.gitlab.com/operations/observability/ci_cd/
- GitLab Observability itself carries the same tier badge (`Free, Premium, Ultimate`) and `Status: Experiment`, and is described as available for all tiers. Source: https://docs.gitlab.com/operations/observability/observability/
- The reporter's "Ultimate-only" impression matches the older (GitLab 16.x/17.x) implementation, where observability/distributed tracing required Ultimate and the `observability_features` feature flag (flags introduced around 16.2, beta in 17.x). That earlier model was reworked. Sources: https://docs.gitlab.com/operations/observability/observability/ and the GitLab feature-flag history (`observability_features`, formerly `observability_tracing`).
- On GitLab.com, GitLab Observability is enabled per group in the UI (Settings > Observability > Setup > Enable Observability) by a user with Developer/Maintainer/Owner role; no `gitlab.rb` edit. Source: https://docs.gitlab.com/operations/observability/setup_gitlab_com/
- On GitLab Self-Managed (18.1+), GitLab Observability runs as a separate deployed backend (Docker/Docker Compose host, OTLP ports 4317/4318) and is connected to a group via the Rails console object `Observability::GroupO11ySetting` (fields: `group_id`, `o11y_service_url`, `o11y_service_user_email`, `o11y_service_password`, `o11y_service_post_message_encryption_key`). It is NOT enabled by editing `gitlab.rb`. Source: https://docs.gitlab.com/operations/observability/setup_self_managed/

### Changes made to README.md
- Added an H3 "Tier and Availability (Read This First)" under "GitLab's Built-in OpenTelemetry Support" stating the current Free/Premium/Ultimate tier and Experiment status, and explaining that the Ultimate-only impression comes from the older 16.x/17.x implementation that has since been reworked.
- Added a new H2 "Prerequisite: Set Up GitLab Observability First" that explains the export targets GitLab Observability (not an arbitrary OTLP endpoint), documents the GitLab.com UI enablement path, documents the Self-Managed path (separate backend plus `Observability::GroupO11ySetting` via Rails console), and explicitly answers the two reader questions (not Ultimate-only; `gitlab.rb` editing is not how you enable it).
- Updated the "Enabling OpenTelemetry in GitLab" section so it now depends on the prerequisite and adds a troubleshooting note that missing data usually means Observability is not set up/connected for the group.

### Notes / caveats
- The feature remains an Experiment, so tier, feature flags, and setup steps can change between releases. The post now points readers to the official docs to re-verify.
- Self-managed setup specifics (instance sizing, ports, exact Rails fields) are summarized from the official setup page and may evolve; the post links to that page for the authoritative steps.
