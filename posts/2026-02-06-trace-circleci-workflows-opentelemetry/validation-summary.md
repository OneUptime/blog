# Validation Summary: How to Trace CircleCI Workflows with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry metrics
- OpenTelemetry Protocol (OTLP/HTTP and OTLP/gRPC)
- OpenTelemetry Collector
- OpenTelemetry Python SDK
- W3C Trace Context
- CircleCI workflows and workspaces
- CircleCI Docker execution environment
- Docker image builds in CircleCI
- Kubernetes deployment with kubectl

## Sources Consulted
- CircleCI workspaces documentation: https://circleci.com/docs/workspaces/
- CircleCI configuration reference for `persist_to_workspace` and `attach_workspace`: https://circleci.com/docs/configuration-reference/
- CircleCI OpenTelemetry integration documentation: https://circleci.com/docs/guides/integration/open-telemetry-integration/
- CircleCI convenience images documentation: https://circleci.com/docs/circleci-images/
- CircleCI `cimg/deploy` image page: https://circleci.com/developer/images/image/cimg/deploy
- CircleCI remote Docker documentation and support guidance: https://circleci.com/docs/building-docker-images/ and https://support.circleci.com/hc/en-us/articles/360009062913-How-do-I-run-commands-in-the-remote-Docker-environment-
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Collector processor documentation: https://opentelemetry.io/docs/collector/components/processor/
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/

## Issues Found
- The article called the shell method an "orb" even though it defined a sourced helper script, not a CircleCI orb. Renamed the section to "Tracing Helper Approach."
- The shell OTLP/HTTP example appended `/v1/traces` unconditionally to `OTEL_EXPORTER_OTLP_ENDPOINT`, which could produce an invalid endpoint when using the signal-specific `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`. Updated the script to prefer `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` and otherwise append `/v1/traces` to the base endpoint.
- The shell example emitted `parentSpanId` with an all-zero value for a root span. OTLP expects no parent span ID for root spans. Updated the script to omit `parentSpanId` when there is no parent.
- The CircleCI workspace example attempted to persist `.` from `/tmp/workspace` and did not actually copy the checked-out project into that workspace path. Updated the config to copy the checkout to `/tmp/workspace/project` and persist `trace-context` plus `project`.
- The CircleCI example had parallel `run-tests` and `build` jobs both persisting the same `trace-context/traceparent.txt`, which can fail because CircleCI workspaces are additive and concurrent layers with the same filename conflict. Updated the example so only the setup job persists the shared trace context.
- The Docker build job used `docker build` without `setup_remote_docker`. Added `setup_remote_docker`.
- The deploy job used `kubectl` in a Python executor image. Added a deploy executor using CircleCI's `cimg/deploy:stable` image.
- The Python SDK example used `span.set_status(trace.StatusCode.ERROR, ...)`, which does not match the documented Python API. Updated it to import and use `Status(StatusCode.ERROR, ...)`.
- The Python SDK example injected updated trace context after the `test-suite` span had ended, so it would not save the active test-suite span context. Moved injection inside the active span.
- The Python SDK example recorded failed child commands but always exited successfully. Updated it to exit nonzero if any traced command fails.
- The introductory wording overstated that dependencies were captured directly in the trace. Adjusted the wording to focus on timing and error context, and clarified that this workspace approach propagates a setup context to downstream jobs.

## Review Notes
- The examples use custom CI attributes such as `ci.pipeline.id` and `circleci.job`. These are acceptable as custom attributes, but future revisions could align more closely with the current OpenTelemetry CI/CD semantic conventions and CircleCI's native OpenTelemetry span names.
- The shell OTLP JSON approach is intentionally lightweight, but a real production implementation should escape JSON string values robustly or use an SDK/CLI tool to avoid malformed payloads when environment variables contain quotes or control characters.
- Local validation performed: embedded Python snippets compile with `python3`, embedded Bash snippets pass `bash -n`, and embedded YAML snippets parse with PyYAML.
