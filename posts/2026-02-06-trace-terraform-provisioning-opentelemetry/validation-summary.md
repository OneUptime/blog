# Validation Summary: How to Trace Terraform Infrastructure Provisioning with OpenTelemetry

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Terraform CLI
- Terraform machine-readable JSON UI
- OpenTelemetry Protocol (OTLP) HTTP traces
- OpenTelemetry Collector
- Bash
- Python
- GitHub Actions
- jq

## Sources Consulted
- HashiCorp Terraform machine-readable UI output reference: https://developer.hashicorp.com/terraform/internals/machine-readable-ui
- HashiCorp Terraform apply command reference: https://developer.hashicorp.com/terraform/cli/commands/apply
- HashiCorp Terraform plan command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp Terraform JSON output format overview: https://developer.hashicorp.com/terraform/internals/json-format
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry trace API status guidance: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry Collector configuration environment variable substitution: https://opentelemetry.io/docs/specs/otel/configuration/data-model/
- OpenTelemetry Collector attributes processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Collector resource processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourceprocessor/README.md
- HashiCorp setup-terraform action README: https://github.com/hashicorp/setup-terraform
- GitHub actions/checkout README: https://github.com/actions/checkout
- GitHub actions/setup-python README: https://github.com/actions/setup-python

## Issues Found
- The post overclaimed that Terraform JSON tracing can show individual cloud provider API calls, throttled API calls, retry counts, and the full runtime dependency graph. Terraform's machine-readable UI emits Terraform operation, resource progress, planned change, drift, summary, output, and diagnostic messages, but not individual provider HTTP/API calls or explicit dependency graph edges. I changed those claims to provider operation timing, resource operation patterns, observed ordering/concurrency, and Terraform diagnostics.
- The Bash wrapper used `set -e` and then attempted to capture `terraform`'s exit code. With `set -e`, a failing Terraform command would terminate the script before sending the error span. I added a `set +e` / `set -e` block around the Terraform invocation.
- The Python tracer read `hook.resource.provider`, but Terraform's resource object uses `implied_provider` in the machine-readable UI. I changed the provider attribute lookup to `hook.resource.implied_provider`.
- The Python tracer ignored `OTEL_EXPORTER_OTLP_ENDPOINT` and `OTEL_SERVICE_NAME`, even though the CI example sets them. I changed the script to read those environment variables and append `/v1/traces` to the base OTLP HTTP endpoint.
- The Python tracer piped stderr separately without reading it, which can deadlock if Terraform writes enough stderr. I changed stderr to `subprocess.STDOUT`.
- The Collector attributes processor example used `action: upsert` with `pattern` and `from_attribute`, which is not the documented syntax for regex extraction. I changed it to `action: extract` with `key: terraform.resource.address` and a named regex matcher.
- The Collector resource processor attempted to copy `TF_WORKSPACE` using `from_attribute`, which reads another telemetry attribute rather than a process environment variable. I changed it to use Collector environment variable substitution: `"${env:TF_WORKSPACE:-default}"`.
- The drift-check snippet counted `planned_change` messages and called them drift. Terraform emits `resource_drift` messages specifically for detected outside-Terraform changes. I changed the jq filters to count `resource_drift` updates and deletes.
- The drift-check snippet sourced `scripts/traced-terraform.sh`, but that script contains executable top-level code and would run unexpectedly when sourced. I made the drift-check snippet self-contained by including its own `send_span` helper.
- The GitHub Actions workflow used older action majors. I updated the example to current documented major versions for checkout, setup-terraform, and setup-python.

## Review Notes
- Terraform and the OpenTelemetry Collector binaries were not installed in the local environment, so CLI validation used current official documentation rather than local `--help` output.
- The example sends raw OTLP JSON with shell string interpolation for readability. A production wrapper should construct JSON with a proper encoder such as `jq` or an SDK to avoid escaping issues in attribute values.
