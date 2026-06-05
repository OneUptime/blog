# Validation Summary: How to Instrument Terragrunt Runs with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terragrunt
- Terraform/OpenTofu
- OpenTelemetry
- Python
- Bash
- HCL

## Sources Consulted
- Terragrunt HCL blocks reference: https://docs.terragrunt.com/reference/hcl/blocks/
- Terragrunt HCL functions reference: https://docs.terragrunt.com/reference/hcl/functions/
- Terragrunt `run` command reference: https://docs.terragrunt.com/reference/cli/commands/run/
- Terragrunt OpenTelemetry troubleshooting guide: https://docs.terragrunt.com/troubleshooting/open-telemetry/
- Terragrunt hook context constants in Go package docs: https://pkg.go.dev/github.com/gruntwork-io/terragrunt/cli/commands/terraform
- OpenTelemetry Python instrumentation docs: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API docs: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/

## Issues Found
- The post used the older `terragrunt run-all` form. Updated examples to the current `terragrunt run --all -- <command>` syntax documented by Terragrunt.
- The hook configuration hardcoded `--command plan`, so apply and destroy traces would have been mislabeled. Updated it to use Terragrunt's hook context command environment variable through `get_env("TG_CTX_COMMAND", "unknown")`.
- The original `before_hook` started an OpenTelemetry span in one Python process and the `after_hook` attempted to complete it from another process. That does not work because spans are process-local objects, and the original span was never ended. Changed the before hook script to record a start timestamp and changed the after/error hook script to emit one completed span with explicit start and end timestamps.
- The original `after_hook` always passed `--exit-code 0`, even on failures. Replaced that with a normal success `after_hook` and an `error_hook` that records a non-zero status.
- The original Python status API usage was incorrect for current OpenTelemetry Python examples. Updated it to import and use `Status` and `StatusCode`.
- The temporary context file used only module basename and command, which could collide for modules with the same directory name. Updated it to include a hash of the module path.
- The wrapper referenced an undefined `report_summary.py` script. Removed that call and enabled Terragrunt's native OpenTelemetry trace exporter settings instead.
- The wrapper generated a raw trace ID but did not provide a valid propagation context. Updated it to set a W3C `TRACEPARENT` value.
- The analysis section claimed visibility into provider API calls, which the shown Terragrunt/Terraform-level instrumentation does not directly provide. Narrowed the wording to Terraform/OpenTofu commands or API-bound modules.

## Review Notes
Terragrunt now has native OpenTelemetry trace and metric export settings. The hook approach can still add custom spans, but the built-in telemetry should generally be preferred for the main Terragrunt execution trace.
