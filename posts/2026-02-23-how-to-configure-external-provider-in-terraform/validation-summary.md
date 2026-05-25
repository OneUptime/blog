# Validation Summary: How to Configure External Provider in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp External provider
- HCL provider and data source configuration
- Bash scripting
- Python scripting
- jq
- Git CLI
- HTTP API access from Python

## Sources Consulted
- HashiCorp External provider documentation: https://registry.terraform.io/providers/hashicorp/external/latest/docs
- HashiCorp External provider source documentation for the `external` data source: https://github.com/hashicorp/terraform-provider-external/blob/main/docs/data-sources/external.md
- HashiCorp Terraform `terraform_data` resource reference: https://developer.hashicorp.com/terraform/language/resources/terraform-data
- jq manual: https://jqlang.org/manual/
- Python `json` module documentation: https://docs.python.org/3/library/json.html
- Python `ipaddress` module documentation: https://docs.python.org/3/library/ipaddress.html
- Python `urllib.request` documentation: https://docs.python.org/3/library/urllib.request.html

## Issues Found
- The Bash examples built JSON by interpolating shell variables into string literals. That can produce invalid JSON if a returned value contains characters that require JSON escaping. Updated the `git-info.sh` and `check-tools.sh` examples to use `jq -n --arg`, matching the External provider documentation's recommendation for robust shell JSON output.
- Added `jq` to the prerequisites because the corrected shell examples and later shell examples depend on it.

## Review Notes
The External provider contract is correctly described: the program reads a JSON object from stdin, returns a JSON object with string values on stdout, reports failures through stderr plus a non-zero exit code, and exposes results through `data.external.<name>.result`. The note about determinism is appropriate because the provider re-runs external programs when data sources are refreshed, so non-deterministic output can cause downstream plan churn.
