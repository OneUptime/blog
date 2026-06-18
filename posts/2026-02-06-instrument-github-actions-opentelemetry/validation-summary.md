# Validation Summary: How to Instrument GitHub Actions Workflows with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions
- OpenTelemetry
- OpenTelemetry Collector
- OTLP/HTTP
- Bash
- CI/CD tracing
- OpenTelemetry semantic conventions

## Sources Consulted
- OpenTelemetry Collector Docker installation: https://opentelemetry.io/docs/collector/install/docker/
- OpenTelemetry Collector configuration: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Protocol specification: https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry CI/CD semantic conventions: https://opentelemetry.io/docs/specs/semconv/cicd/
- OpenTelemetry CI/CD attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/cicd/
- OpenTelemetry VCS semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/entities/vcs/
- GitHub Actions service container documentation: https://docs.github.com/actions/guides/about-service-containers
- GitHub Actions workflow commands and GITHUB_ENV documentation: https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions
- GitHub Actions contexts documentation: https://docs.github.com/en/actions/learn-github-actions/contexts

## Issues Found
- The collector setup example used a GitHub Actions service container and set an `OTEL_CONFIG` environment variable, but the Collector does not automatically read arbitrary inline config from that variable. I changed the example to start the Collector with `docker run` and pass the config through the Collector's `--config=env:OTEL_CONFIG` mechanism.
- The collector example used the floating `latest` image tag. I changed it to a concrete Collector Contrib version to make the example reproducible.
- The trace script always generated a new span ID, so the finalized job span could not reuse the parent span ID referenced by step spans. I added `OTEL_SPAN_ID` support.
- The trace script built JSON by string interpolation, which could produce invalid JSON if workflow metadata contained quotes or other special characters. I changed the example to build the OTLP JSON payload with `jq`.
- The OTLP endpoint concatenation could produce a double slash if the endpoint secret ended with `/`. I changed it to use `${OTEL_EXPORTER_OTLP_ENDPOINT%/}/v1/traces`.
- The full workflow used `${{ env.JOB_SPAN_ID }}` and `${{ env.JOB_START }}` for values written to `$GITHUB_ENV`. I changed those to shell variables such as `$JOB_SPAN_ID` and `$JOB_START`, which is how GitHub exposes `$GITHUB_ENV` values to later steps.
- The step examples marked spans as successful unconditionally and would skip span emission when a command failed under GitHub Actions' default failing shell behavior. I added exit-code capture, status mapping, span emission, and re-exit logic.
- The CI/CD semantic convention section described the conventions as "proposed" and used outdated or non-standard VCS/runner attribute names. I updated the wording to development status and replaced the incorrect attributes with current `vcs.ref.head.*` and `cicd.worker.*` attributes.
- The failure-handling example captured the exit code of `tee` rather than the test command in the pipeline. I changed it to use `PIPESTATUS[0]`.
- The failure-handling example used GitHub expression syntax for values written to `$GITHUB_ENV`. I changed it to use shell variables in the later step.
- The article implied that a workflow-level trace happens automatically. I clarified that a workflow run can become one trace when the trace ID is shared across steps and jobs.

## Review Notes
- The shell-based OTLP approach is valid for a tutorial, but a production implementation should prefer an OpenTelemetry SDK, a maintained GitHub Action, or generated OTLP protobuf payloads over handwritten shell instrumentation.
- The current CI/CD and VCS semantic conventions referenced here are development-status conventions and may change before becoming stable.
