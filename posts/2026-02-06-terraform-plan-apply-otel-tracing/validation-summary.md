# Validation Summary: How to Monitor Terraform Plan and Apply Operations

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform CLI
- Terraform machine-readable JSON UI output
- OpenTelemetry Python tracing
- OpenTelemetry Python metrics
- OTLP gRPC exporters
- Python subprocess execution

## Sources Consulted
- Terraform `plan` command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform `apply` command reference: https://developer.hashicorp.com/terraform/cli/commands/apply
- Terraform machine-readable UI reference: https://developer.hashicorp.com/terraform/internals/machine-readable-ui
- Terraform JSON output format reference: https://developer.hashicorp.com/terraform/internals/json-format
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html

## Issues Found
- The wrapper only enabled Terraform JSON output for `plan`, but the post described visibility into `apply` operations and resource timing. Updated the wrapper to pass `-json` for both `plan` and `apply`, with a note that Terraform requires `-auto-approve` or a saved plan file for `apply -json`.
- The wrapper appended `-json` after user arguments, which could put the option after a saved plan file. Updated command construction so Terraform options are added before the remaining arguments.
- The wrapper created child spans for `planned_change` events only, which records planned resource metadata but does not measure apply resource duration. Added handling for Terraform machine-readable UI `apply_start`, `apply_complete`, and `apply_errored` messages so apply resource spans reflect operation timing.
- The wrapper used a separate `stderr` pipe while streaming only `stdout`, which can block if Terraform writes enough stderr output. Merged stderr into stdout and records the last output lines on failure.
- The code referenced `trace.StatusCode.ERROR`. Updated it to import and use `StatusCode` from `opentelemetry.trace`, matching the documented OpenTelemetry Python API.
- The metrics section said it collected metrics, but the snippet only defined instruments. Updated the wording to say the snippet defines metrics that can be recorded from the wrapper.

## Review Notes
- The post now validates as a practical wrapper-based approach. For production use, the wrapper could be extended to actually record the metric instruments shown in the metrics section and to redact sensitive Terraform output before attaching it to spans.
