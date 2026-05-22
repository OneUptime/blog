# Validation Summary: How to Implement Terraform CI/CD Pipeline Monitoring

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- Terraform CLI
- GitHub Actions
- Datadog Metrics API
- Prometheus Pushgateway and PromQL
- PagerDuty Events API v2
- Grafana dashboards
- jq
- AWS CLI for Amazon S3

## Sources Consulted
- HashiCorp Terraform `plan` command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp Terraform JSON output format: https://developer.hashicorp.com/terraform/internals/json-format
- HashiCorp Terraform apply workflow documentation: https://developer.hashicorp.com/terraform/tutorials/cli/plan
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions workflow commands and environment files: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands
- Datadog Metrics API documentation: https://docs.datadoghq.com/api/latest/metrics/
- Prometheus Pushgateway documentation: https://github.com/prometheus/pushgateway
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Grafana dashboard JSON model documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/view-dashboard-json-model/
- PagerDuty Events API v2 documentation: https://developer.pagerduty.com/docs/ZG9jOjExMDI5NTgx-send-an-alert-event
- AWS CLI S3 command documentation: https://docs.aws.amazon.com/cli/latest/userguide/cli-services-s3-commands.html

## Issues Found
- Terraform plan/apply commands piped through `tee` could hide Terraform failures under GitHub Actions' default unspecified Bash shell, which runs `bash -e` without `pipefail`. Added `PIPESTATUS[0]` checks after both commands so failed Terraform commands fail the step.
- Datadog, Prometheus, and audit snippets ran in `always()` steps but used environment variables that may be unset after earlier failures. Added numeric fallbacks for duration, resource count, and audit fields so the snippets do not emit invalid JSON, invalid Prometheus exposition text, or fail `jq tonumber`.
- PagerDuty alert JSON embedded raw shell output directly into a JSON string. Replaced manual JSON interpolation with `jq -n` so quotes and newlines in Terraform errors are escaped correctly.
- Drift monitoring treated Terraform `plan -detailed-exitcode` exit code `1` as no drift. Added explicit handling to fail the step on exit code `1`, while preserving exit code `2` as drift detected.
- Grafana success-rate query referenced `terraform_pipeline_total`, a metric not emitted by the post's Prometheus example. Updated it to use `avg_over_time(terraform_pipeline_success{environment='production'}[24h]) * 100`, matching the emitted 0/1 gauge metric.

## Review Notes
- Terraform was not installed in the local environment, so Terraform behavior was verified against HashiCorp documentation rather than local CLI execution.
- The dashboard JSON and revised `jq` PagerDuty payload were parsed locally with `jq`.
- The drift resource count still uses text output as a simple approximation. A future improvement would be to write the plan to a file and count changes from `terraform show -json` for more precise drift metrics.
