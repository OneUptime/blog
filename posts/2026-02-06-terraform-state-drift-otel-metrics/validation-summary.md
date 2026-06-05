# Validation Summary: How to Monitor Terraform State Drift Detection and Plan Execution Duration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform CLI
- Terraform plan JSON output
- OpenTelemetry Python metrics SDK
- OpenTelemetry OTLP gRPC exporter
- OpenTelemetry Collector
- GitLab CI/CD
- GitHub Actions

## Sources Consulted
- HashiCorp Terraform `plan` command documentation: https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp Terraform JSON output format documentation: https://developer.hashicorp.com/terraform/internals/json-format
- HashiCorp Terraform releases: https://releases.hashicorp.com/terraform/
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/latest/exporter/otlp/otlp.html
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- GitLab Docker image and entrypoint documentation: https://docs.gitlab.com/ci/docker/using_docker_images/
- GitLab Runner Docker executor documentation: https://docs.gitlab.com/runner/executors/docker/
- GitHub Actions workflow syntax documentation: https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions

## Issues Found
- The wrapper used normal `terraform plan` for drift detection. Normal planning can include intended configuration changes as well as external drift, so the command was changed to `terraform plan -refresh-only -detailed-exitcode -json -out=tfplan`, which matches Terraform's refresh-only mode for reconciling state with remote changes.
- The comment for exit code 2 described all changes as drift. It was updated to clarify that exit code 2 means a non-empty diff from the refresh-only plan.
- The drift total was calculated by adding create, update, and delete counts, which can double-count a resource replacement because Terraform actions can contain multiple operations. It now counts changed resource entries instead.
- The Python exporter hardcoded `localhost:4317`, so the GitHub Actions `OTEL_EXPORTER_OTLP_ENDPOINT` variable would not affect the script. The code now reads `OTEL_EXPORTER_OTLP_ENDPOINT` and defaults to `http://localhost:4317`.
- The GitLab example used the `hashicorp/terraform` image and then ran `pip install`, but that image is not a Python image and GitLab jobs also need a usable shell entrypoint. The example now uses `python:3.12-slim`, installs Terraform 1.15.5 from HashiCorp releases, and installs the OpenTelemetry Python packages with `pip`.
- The CI examples ran `terraform init` in the repository root while the wrapper executed Terraform in `./infrastructure`. Both examples now initialize the same directory using `terraform -chdir=./infrastructure init`.
- The dashboard label called `terraform.plan.resources_changed` "Resources managed", but the metric records changed resources, not the total managed resource count. The label was corrected to "Resources to change".

## Review Notes
- The OpenTelemetry Collector configuration uses valid receiver, processor, exporter, and metrics pipeline structure. If `backend.internal:4317` is a plaintext OTLP endpoint, a production configuration may also need exporter TLS settings such as `tls.insecure: true`; that depends on the backend and was not assumed in the post.
- The wrapper defines `terraform.apply.duration` but does not implement an apply wrapper. This is not a correctness error for the drift-detection example, but future revisions could either add apply instrumentation or remove the unused metric from the sample.
