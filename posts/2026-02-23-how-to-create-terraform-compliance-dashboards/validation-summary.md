# Validation Summary: How to Create Terraform Compliance Dashboards

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Checkov (compliance scanner)
- Open Policy Agent (OPA) / Rego
- Python (scanning, trends, reporting scripts)
- Chart.js (dashboard visualization)
- GitHub Actions (scheduled scanning workflow)
- AWS CloudWatch Metric Alarms + SNS (alerting via Terraform)

## Sources Consulted
- Checkov CLI Command Reference — https://www.checkov.io/2.Basics/CLI%20Command%20Reference.html
- Open Policy Agent — Policy Language — https://www.openpolicyagent.org/docs/latest/policy-language/
- Chart.js installation docs (jsDelivr CDN) — https://www.chartjs.org/docs/latest/getting-started/installation.html
- AWS provider `aws_cloudwatch_metric_alarm` resource — Terraform Registry
- GitHub Actions `actions/checkout@v4` — current major version
- GitHub Actions schedule/cron syntax

## Issues Found
- **Invalid Checkov CLI flag in GitHub Actions step.** The post used `--output-file compliance-results.json`, but Checkov does not have an `--output-file` flag. The correct flag is `--output-file-path`, which takes a directory (not a filename) and writes a file named after the chosen format (e.g., `results_json.json`) inside it. To preserve the original intent of producing a file named `compliance-results.json` (which the following upload step references), I replaced the flag with shell redirection: `checkov -d ${{ matrix.workspace }} --output json > compliance-results.json`. This keeps the downstream `--results compliance-results.json` step working without restructuring the workflow.

## Review Notes
- The Python scripts use `datetime.utcnow()`, which is deprecated in Python 3.12+. The modern replacement is `datetime.now(timezone.utc)`. The code still functions and produces correct ISO-formatted timestamps, so I did not change it, but a future revision should migrate to the timezone-aware API to silence `DeprecationWarning` and remain forward-compatible.
- The Rego policy uses the classic `deny[msg] { ... }` partial-rule syntax. This is still valid, but Rego v1 (default in OPA 1.0+) prefers `deny contains msg if { ... }`. Both forms work today; future updates may want to adopt the v1 form for clarity.
- The OPA policy only flags missing required tags on resources where `resource.change.after.tags != null`. Resources with no `tags` block at all will silently pass. This is a logic design choice (not an error), but worth noting if the policy is meant to enforce tagging across all taggable resources — adding a companion rule for the null/missing-tags case would close that gap.
- `--quiet` in Checkov suppresses CLI progress output and limits CLI display to failed checks, but JSON output via `--output json` still includes both `passed_checks` and `failed_checks`, so the Python scanner's iteration over both lists works as intended.
- The Chart.js snippet uses the v4-compatible `new Chart(canvasElement, config)` constructor and a valid jsDelivr CDN URL (`https://cdn.jsdelivr.net/npm/chart.js`), which resolves to the latest published version.
- The CloudWatch alarm Terraform resources use correct argument names and types for the AWS provider's `aws_cloudwatch_metric_alarm`.
