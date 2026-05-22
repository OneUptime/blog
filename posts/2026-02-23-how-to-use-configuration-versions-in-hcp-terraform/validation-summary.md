# Validation Summary: How to Use Configuration Versions in HCP Terraform

## Status
validated

## Post Type
Tutorial / API guide

## Technologies Covered
- HCP Terraform
- Terraform CLI workflow
- HCP Terraform configuration versions API
- HCP Terraform runs API
- curl, jq, and tar
- API-driven CI/CD automation

## Sources Consulted
- HCP Terraform configuration versions API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/configuration-versions
- HCP Terraform runs API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/run
- HCP Terraform workspace configuration management documentation: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/configurations
- HCP Terraform run modes and options documentation: https://developer.hashicorp.com/terraform/cloud-docs/run/modes-and-options
- GNU tar manual for create, gzip, file, and exclude options: https://www.gnu.org/software/tar/manual/tar.html
- curl manual for request method, headers, binary data upload, redirects, and output options: https://curl.se/docs/manpage.html

## Issues Found
- The post used `GET /configuration-versions/$CV_ID/runs`, which is not a documented HCP Terraform API endpoint. I changed the example to use the documented workspace runs endpoint with `include=configuration_version` and a `jq` filter for the configuration version relationship.
- The configuration version list example selected `.attributes["created-at"]`, but the current HCP Terraform configuration versions API response does not document that attribute. I removed it from the example output.
- The `source` value list included specific UI and CLI values that were not documented in the current configuration versions API reference. I narrowed the list to the documented examples and made the remaining wording general.
- The download example manually extracted a redirect URL before downloading. The documented API returns a redirect and supports following it with curl. I changed the example to use `curl -L` directly against the documented download endpoint.
- The post listed `uploading` as a configuration version state. Current HCP Terraform documentation lists `pending`, `fetching`, `uploaded`, `archived`, and `errored` for HCP Terraform, with `fetching` used for VCS fetches. I replaced `uploading` with `fetching`.

## Review Notes
The create configuration version, upload URL, `auto-queue-runs`, `speculative`, `provisional`, run creation relationship, and `.tar.gz` upload workflow matched the current official API documentation. The examples assume a workspace that allows direct API uploads for non-speculative runs; HCP Terraform only allows directly uploaded configuration versions to be used for speculative plans when the workspace is connected to VCS.
