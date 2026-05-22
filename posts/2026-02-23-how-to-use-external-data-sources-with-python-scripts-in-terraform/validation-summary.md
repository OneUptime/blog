# Validation Summary: How to Use External Data Sources with Python Scripts in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp External provider
- HashiCorp AWS provider
- Python
- JSON
- GitHub REST API

## Sources Consulted
- HashiCorp External provider data source documentation: https://github.com/hashicorp/terraform-provider-external/blob/main/docs/data-sources/external.md
- Terraform `jsonencode` function documentation: https://developer.hashicorp.com/terraform/language/functions/jsonencode
- Terraform strings and templates documentation: https://developer.hashicorp.com/terraform/language/expressions/strings
- Python `ipaddress` module documentation: https://docs.python.org/3/library/ipaddress.html
- Python `urllib.request` module documentation: https://docs.python.org/3/library/urllib.request.html
- GitHub REST API repository endpoint documentation: https://docs.github.com/en/rest/repos/repos?apiVersion=2022-11-28#get-a-repository

## Issues Found
- The GitHub API example used the older `application/vnd.github.v3+json` media type. Updated it to `application/vnd.github+json`, which is the current media type recommended by GitHub's REST API documentation.
- The password policy example was labeled as validation, but the code did not accept or validate a password, and the `forbidden_words` query value was ignored. Updated the section wording to describe a policy summary, removed unused password generation code, and returned `forbidden_words` in the result so the snippet is internally consistent.

## Review Notes
The Terraform external data source protocol claims are consistent with the official provider documentation: `query` is a map of string values, the external program reads JSON from stdin, and successful output must be a JSON object whose values are strings. Embedded Python snippets were syntax-checked with Python 3.12.3. Terraform CLI validation could not be run because `terraform` is not installed in the workspace.
