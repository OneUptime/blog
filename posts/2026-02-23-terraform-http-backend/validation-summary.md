# Validation Summary: How to Configure HTTP Backend for Terraform State

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform HTTP backend
- Terraform backend partial configuration
- Terraform Cloud / HCP Terraform
- GitLab-managed Terraform/OpenTofu state
- Python Flask
- Go net/http

## Sources Consulted
- HashiCorp Terraform HTTP backend documentation: https://developer.hashicorp.com/terraform/language/backend/http
- HashiCorp Terraform backend configuration documentation: https://developer.hashicorp.com/terraform/language/backend
- HashiCorp Terraform block and cloud block reference: https://developer.hashicorp.com/terraform/language/block/terraform
- HashiCorp HCP Terraform connection documentation: https://developer.hashicorp.com/terraform/cli/cloud/settings
- HashiCorp HCP Terraform state versions API documentation: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/state-versions
- GitLab-managed Terraform/OpenTofu state documentation: https://docs.gitlab.com/user/infrastructure/iac/terraform_state/

## Issues Found
- The post described the HTTP backend protocol as GET, POST, LOCK, and UNLOCK only. HashiCorp's documentation also states that state can be purged with DELETE, so the protocol description, minimal configuration comments, summary, and sample servers were updated to include DELETE.
- The post claimed Terraform HTTP backend supports custom headers for token-based authentication. The official backend options do not include arbitrary custom headers; they support basic authentication and mutual TLS options. The section was changed to mutual TLS and now uses the documented `client_certificate_pem`, `client_private_key_pem`, and `client_ca_certificate_pem` options.
- The Python sample configured `unlock_address` as `/unlock` in Terraform examples but implemented UNLOCK on `/lock`. The Flask route was corrected to `/terraform/<project>/unlock`.
- The Go sample was labeled production-grade but did not implement the lock endpoints or verify Terraform's lock ID query parameter during state updates. The sample now includes lock, unlock, and lock-check handling with Terraform lock info responses.
- The Terraform Cloud API example incorrectly suggested using the generic HTTP backend against Terraform Cloud's state version API. That API returns JSON:API metadata and uses bearer-token authentication, so it is not a drop-in HTTP backend endpoint. The section now recommends the native `cloud` block.
- The GitLab example paired `gitlab-ci-token` with a personal access token. GitLab documents personal access tokens with the GitLab username, while `gitlab-ci-token` is for CI job tokens, so the username placeholder was corrected.

## Review Notes
- The GitLab managed state example matches GitLab's documented HTTP backend pattern: state endpoint, `/lock` for both lock and unlock addresses, `POST` for locking, and `DELETE` for unlocking.
- Terraform and Go CLIs were not installed in the local workspace, so Terraform validation and Go compilation could not be run locally. The Python code block was syntax-checked with Python 3.12.3.
