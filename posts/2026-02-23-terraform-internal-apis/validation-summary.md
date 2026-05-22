# Validation Summary: How to Use Terraform with Internal APIs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp HTTP provider
- Mastercard REST API provider
- Terraform external data source
- Terraform provisioners
- terraform_data resource
- Python
- REST APIs
- OAuth2 client credentials flow

## Sources Consulted
- HashiCorp HTTP provider data source documentation: https://registry.terraform.io/providers/hashicorp/http/latest/docs/data-sources/http
- HashiCorp HTTP provider source documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-http/main/docs/data-sources/http.md
- Mastercard restapi provider documentation: https://registry.terraform.io/providers/Mastercard/restapi/latest/docs
- Mastercard restapi_object resource documentation: https://registry.terraform.io/providers/Mastercard/restapi/latest/docs/resources/object
- Mastercard terraform-provider-restapi source documentation: https://raw.githubusercontent.com/Mastercard/terraform-provider-restapi/master/docs/index.md
- HashiCorp external provider data source documentation: https://registry.terraform.io/providers/hashicorp/external/latest/docs/data-sources/external
- HashiCorp Terraform provisioners documentation: https://developer.hashicorp.com/terraform/language/provisioners
- HashiCorp terraform_data resource documentation: https://developer.hashicorp.com/terraform/language/resources/terraform-data
- HashiCorp null_resource documentation: https://registry.terraform.io/providers/hashicorp/null/latest/docs/resources/resource

## Issues Found
- The post described the HTTP data source as built-in and GET-only. Updated the wording to identify it as the HashiCorp HTTP provider data source and clarified that current documentation supports GET, HEAD, and POST for read-only data-source use.
- The cost recommendation HTTP data source sent a request body without specifying POST. Added `method = "POST"` so the example matches the documented HTTP provider usage.
- The Python external data source script used `os.environ` without importing `os`. Added the missing import.
- The restapi provider version constraint was pinned to the older `~> 1.18` series. Updated it to `~> 3.0`, matching the current Terraform Registry release while keeping resource attributes that remain documented.
- The provisioner example used `null_resource`, while current HashiCorp documentation recommends `terraform_data` on Terraform 1.4 and later. Updated the example to `terraform_data` with `triggers_replace`.
- The provisioner example used `timestamp()` despite the comment saying it should re-run when the application version changes. Removed the timestamp trigger so replacement tracks `app_version`.
- The destroy-time provisioner referenced variables directly. Updated the example to store required values in `terraform_data.input` and reference them via `self.output`, which is compatible with destroy-time provisioner constraints.
- The provisioner example interpolated an API token directly from a Terraform variable. Updated it to use a `RELEASE_API_TOKEN` environment variable, matching the post's later recommendation to avoid hardcoded or state-stored tokens.

## Review Notes
The examples remain illustrative and depend on internal API behavior, especially response schemas and whether write endpoints return full objects for the restapi provider. For production use, teams should test provider behavior against their actual API and keep tokens out of Terraform state.
