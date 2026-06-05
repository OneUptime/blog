# Validation Summary: Integrate OpenTelemetry Trace Links into Your Pull Request Review Workflow

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Collector
- OTLP/HTTP
- W3C Trace Context
- Jaeger
- Docker Compose
- GitHub Actions
- actions/github-script
- actions/upload-artifact
- Jest
- Axios
- jq

## Sources Consulted
- OpenTelemetry OTLP exporter configuration: https://opentelemetry.io/docs/concepts/sdk-configuration/otlp-exporter-configuration/
- OpenTelemetry Protocol Exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Collector Docker installation docs: https://opentelemetry.io/docs/collector/install/docker/
- OpenTelemetry Collector configuration docs: https://opentelemetry.io/docs/collector/configuration/
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/
- Jaeger deployment docs: https://www.jaegertracing.io/docs/1.76/deployment/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version top-level element docs: https://docs.docker.com/reference/compose-file/version-and-name/
- GitHub Actions workflow syntax and permissions docs: https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions
- GitHub REST API issue comments docs: https://docs.github.com/v3/issues/comments/
- actions/github-script documentation: https://github.com/actions/github-script
- actions/upload-artifact documentation: https://github.com/actions/upload-artifact
- Jest CLI options: https://jestjs.io/docs/cli
- Axios response schema: https://axios-http.com/docs/res_schema
- jq manual: https://jqlang.org/manual/

## Issues Found
- The Docker Compose example used the obsolete top-level `version` field. Removed it because current Docker Compose uses the Compose Specification and treats `version` as informative/obsolete.
- The OpenTelemetry Collector contrib example mounted the config at `/etc/otelcol/config.yaml`, which is not the contrib distribution's default config path. Updated the mount to `/etc/otelcol-contrib/config.yaml` and added an explicit `--config` command.
- The app exporter endpoint used port `4318` without explicitly selecting OTLP/HTTP. Added `OTEL_EXPORTER_OTLP_PROTOCOL: http/protobuf` so the example matches the HTTP endpoint.
- The post claimed most instrumented servers return `traceparent` in response headers. W3C Trace Context defines `traceparent` as HTTP trace context propagation, commonly sent on requests; response headers are application-specific. Reworded the guidance to say this works when the app deliberately echoes or exposes the trace ID.
- The GitHub Actions workflow posted PR comments without declaring token permissions. Added least-privilege `contents: read` and `pull-requests: write` permissions for the REST comment calls.
- The readiness loop could succeed even if the service never became healthy. Changed it to fail the job after the retry window.
- The Jest command used the older `--testPathPattern` option. Updated it to the current documented `--testPathPatterns` option.

## Review Notes
- The workflow still assumes the application exposes or logs trace IDs in a way the tests can capture. That is valid as an application convention, but it is not automatic behavior from OpenTelemetry instrumentation.
- Jaeger links that point to `localhost` only work while the CI environment is alive and reachable. The post correctly discusses persistent Jaeger, screenshots, and JSON artifacts as ways to make traces reviewable after CI finishes.
