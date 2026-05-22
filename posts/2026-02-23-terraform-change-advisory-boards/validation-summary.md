# Validation Summary: How to Use Terraform with Change Advisory Boards

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI and JSON plan output
- Terraform AWS provider resource examples
- GitHub Actions
- HashiCorp setup-terraform action
- GitHub artifact upload and download actions
- ServiceNow Table API and Change Management states
- Python subprocess, JSON handling, and requests
- AWS Lambda runtime configuration

## Sources Consulted
- HashiCorp Terraform `show` command documentation: https://developer.hashicorp.com/terraform/cli/commands/show
- HashiCorp Terraform JSON output format documentation: https://developer.hashicorp.com/terraform/internals/json-format
- GitHub Actions workflow syntax documentation: https://docs.github.com/actions/learn-github-actions/workflow-syntax-for-github-actions
- HashiCorp `setup-terraform` action documentation: https://github.com/hashicorp/setup-terraform
- GitHub `actions/upload-artifact` documentation: https://github.com/actions/upload-artifact
- GitHub `actions/download-artifact` documentation: https://github.com/actions/download-artifact
- ServiceNow Table API documentation: https://www.servicenow.com/docs/r/api-reference/rest-apis/c_TableAPI.html
- ServiceNow change request state value documentation: https://www.servicenow.com/docs/r/BgFKZnPHldZ62gGtzQ71Mw/oSmKnJkzKAtngJgTDCCfmQ
- AWS Lambda runtime documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- OneUptime linked blog URL: https://oneuptime.com/blog/post/2025-12-20-terraform-pipeline-github-actions/view

## Issues Found
- The `generate_change_request.py` example imported `sys` and the workflow passed `plan.json`, but the script always ran `terraform show -json tfplan` and ignored command-line input. Updated the script to read a supplied plan JSON file or fall back to `terraform show -json tfplan`.
- The generator printed a CAB status message to stdout after the JSON document, which would make the workflow command `... | jq -r '.risk_level'` fail on mixed JSON and text output. Changed the status message to print to stderr.
- The `subprocess.run()` call did not use `check=True`, so a failed `terraform show` command could lead to parsing an empty or invalid stdout. Added `check=True`.
- The GitHub Actions workflow created `terraform/plan.json` after changing into the `terraform` directory, but later referenced `plan.json` from the repository root. Updated the generator and ServiceNow submission commands to use `terraform/plan.json`.
- The workflow used `hashicorp/setup-terraform` with the default wrapper enabled while redirecting machine-readable Terraform JSON output. Added `terraform_wrapper: false` to keep Terraform CLI output suitable for JSON parsing.
- The `close_change_request` example did not call `raise_for_status()` on the ServiceNow lookup or patch request. Added those calls so API failures are surfaced.

## Review Notes
Terraform was not installed in the local environment, so Terraform CLI behavior was checked against HashiCorp's official command and JSON format documentation rather than local `terraform --help` output. The Python and YAML snippets were syntax-checked locally. The ServiceNow examples remain intentionally generic and may need instance-specific fields, ACLs, authentication choices, and change model transitions before production use.
