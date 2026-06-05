# Validation Summary: How to Monitor Build Times and CI Pipeline Performance with OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Protocol (OTLP)
- OpenTelemetry Collector
- OpenTelemetry Python SDK
- otel-cli
- GitHub Actions
- Jenkins, GitLab CI, and CircleCI CI/CD concepts
- YAML, Bash, and Python

## Sources Consulted
- otel-cli README and configuration reference: https://github.com/equinix-labs/otel-cli
- otel-cli releases and Linux asset names: https://github.com/equinix-labs/otel-cli/releases
- otel-cli v0.4.5 local `--help` output for `exec` and `span background`
- OpenTelemetry Python instrumentation docs: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python SDK metrics export API docs: https://opentelemetry-python.readthedocs.io/en/stable/sdk/metrics.export.html
- OpenTelemetry Collector processor docs: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector configuration docs: https://opentelemetry.io/docs/collector/configuration/
- GitHub Actions workflow commands and environment files: https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions
- Jenkins OpenTelemetry plugin page: https://plugins.jenkins.io/opentelemetry

## Issues Found
- The `otel-cli` installation URL used `releases/latest/download/otel-cli-linux-amd64.tar.gz`, but current release assets use versioned names such as `otel-cli_0.4.5_linux_amd64.tar.gz`. Changed the workflow to use the officially documented `go install github.com/equinix-labs/otel-cli@latest` path and add `$HOME/go/bin` to `GITHUB_PATH`.
- The workflow configured `OTEL_EXPORTER_OTLP_ENDPOINT` as `https://collector.example.com:4317` without specifying the protocol. `otel-cli` treats `http://` and `https://` endpoint URLs as HTTP unless the protocol is set to gRPC. Added `OTEL_EXPORTER_OTLP_PROTOCOL: "grpc"` for the 4317 endpoint.
- The pipeline-level trace wrapper used `otel-cli span background` in command substitution and expected it to return a `TRACEPARENT`. The official `span background` command is a long-running socket-based background span handler and must be run with a socket directory for events/end operations. Replaced the example with a working `otel-cli exec` parent span that runs nested `otel-cli exec` child spans in the same shell context.
- The Python example created the same histogram instrument inside every `run_step` call. Moved histogram creation into telemetry setup and passed the instrument into `run_step`, matching the intended use of a reusable metric instrument.
- Removed an unused `sys` import and unused `subprocess.run` result assignment from the Python example while preserving behavior.

## Review Notes
- The corrected GitHub Actions examples assume the hosted runner has Go available, which is true for standard `ubuntu-latest` runners at the time of review.
- The Collector example is structurally valid for OTLP gRPC/HTTP receivers, resource and batch processors, and OTLP export pipelines, but real deployments still need backend-specific authentication and TLS settings.
- The Python snippet was syntax-checked with `python3 -m py_compile`; package import execution was not attempted because the repository does not vendor the OpenTelemetry Python dependencies.
