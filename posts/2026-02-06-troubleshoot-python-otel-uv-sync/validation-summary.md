# Validation Summary: How to Troubleshoot OpenTelemetry Python Auto-Instrumentation Not Working After

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTelemetry Python zero-code instrumentation
- OpenTelemetry Python auto-instrumentation CLI
- OpenTelemetry bootstrap tooling
- uv package manager
- Python packaging with pyproject.toml
- Docker

## Sources Consulted
- OpenTelemetry Python zero-code instrumentation: https://opentelemetry.io/docs/zero-code/python/
- OpenTelemetry Python automatic instrumentation troubleshooting: https://opentelemetry.io/docs/zero-code/python/troubleshooting/
- OpenTelemetry Python agent configuration: https://opentelemetry.io/docs/zero-code/python/configuration/
- uv locking and syncing documentation: https://docs.astral.sh/uv/concepts/projects/sync/
- uv CLI reference for `uv sync`: https://docs.astral.sh/uv/reference/cli/#uv-sync
- uv pip package management documentation: https://docs.astral.sh/uv/pip/packages/

## Issues Found
- The dependency examples omitted `opentelemetry-distro`, but the official OpenTelemetry Python zero-code instrumentation docs state that a distro package is required for auto-instrumentation. Added `opentelemetry-distro>=0.42b0` to both dependency examples.
- The bootstrap discovery example installed `opentelemetry-instrumentation` with `uv pip install` and then ran `opentelemetry-bootstrap` directly. The current OpenTelemetry uv troubleshooting docs recommend adding the distro/exporter to the project and running bootstrap through `uv run`; updated the commands to use `uv add opentelemetry-distro opentelemetry-exporter-otlp-proto-http` and `uv run opentelemetry-bootstrap -a requirements`.
- The verification command used the long `--action=requirements` form. Updated it to the current documented `-a requirements` form used by the official OpenTelemetry uv troubleshooting guide.
- The examples set `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318` while using the HTTP OTLP port, but did not set the OTLP protocol. The OpenTelemetry Python configuration docs note that OTLP defaults to gRPC unless HTTP is selected with `http/protobuf`; added `OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf` to the environment-variable examples.

## Review Notes
The uv claims about exact syncing and removal of extraneous packages are accurate. The Docker example is technically valid, though uv's official installation docs also document standalone installers and prebuilt uv images as alternatives.
