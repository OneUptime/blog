# Validation Summary: How to Make REST API Calls from Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp `http` provider
- HashiCorp `external` provider
- Terraform `local-exec` provisioner
- Mastercard `restapi` provider
- HCL
- Python
- Bash, curl, and jq
- REST APIs and GraphQL APIs

## Sources Consulted
- HashiCorp `http` provider data source documentation: https://registry.terraform.io/providers/hashicorp/http/latest/docs/data-sources/http
- HashiCorp `http` provider source documentation: https://github.com/hashicorp/terraform-provider-http/blob/main/docs/data-sources/http.md
- HashiCorp `external` provider data source documentation: https://registry.terraform.io/providers/hashicorp/external/latest/docs/data-sources/external
- HashiCorp `external` provider source documentation: https://github.com/hashicorp/terraform-provider-external/blob/main/internal/provider/data_source.go
- HashiCorp Terraform provisioners documentation: https://developer.hashicorp.com/terraform/language/provisioners
- Mastercard `restapi` provider documentation: https://registry.terraform.io/providers/Mastercard/restapi/latest/docs
- Mastercard `restapi_object` resource documentation: https://registry.terraform.io/providers/Mastercard/restapi/latest/docs/resources/object
- Mastercard `restapi` provider source documentation: https://github.com/Mastercard/terraform-provider-restapi

## Issues Found
- The post described the `http` data source as built-in. Changed this to "HashiCorp `http` data source" because it is provided by the `hashicorp/http` provider, not Terraform core.
- The `restapi` provider example pinned `~> 1.18`, while the current provider release is 3.0.0. Updated the version constraint to `~> 3.0`; the documented fields used in the example remain available.
- The Python `external` data source error path printed JSON to stdout and then exited with a non-zero status. Changed it to print the error to stderr, matching the external provider's failure behavior.
- The retry example could emit an arbitrary API response body directly, which may violate the `external` provider requirement that stdout be a JSON object with string keys and string values. Changed it to return `{ "body": "<response body>" }` and to print terminal errors to stderr.
- The cache example used a `null_resource` trigger and `depends_on` to imply data source reads would be cached. Terraform data sources are read during planning, so this would not reliably cache API responses. Replaced the snippet with a script-level TTL cache that still returns a flat string map to Terraform.

## Review Notes
Terraform was not installed in the review environment, so `terraform validate` could not be run locally. Snippets were reviewed against the current official provider schemas and Terraform documentation instead. The `local-exec` examples are technically valid, but provisioners should still be treated as a fallback when a provider-native resource or data source is available.
