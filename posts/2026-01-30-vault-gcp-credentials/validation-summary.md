# Validation Summary: How to Create Vault GCP Credentials

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Vault (GCP secrets engine)
- Google Cloud Platform (IAM, service accounts, OAuth2 access tokens)
- gcloud CLI
- hvac (Python Vault client)
- google-cloud-storage / google-auth Python libraries
- HashiCorp Configuration Language (HCL) for Vault policies and roleset bindings
- Terraform (hashicorp/vault provider)
- Kubernetes (Vault Agent Injector annotations)

## Sources Consulted
- HashiCorp Vault GCP secrets engine docs: https://developer.hashicorp.com/vault/docs/secrets/gcp
- HashiCorp Vault GCP API docs: https://developer.hashicorp.com/vault/api-docs/secret/gcp
- hvac GCP secrets engine docs: https://python-hvac.org/en/stable/usage/secrets_engines/gcp.html
- Terraform Vault provider registry: https://registry.terraform.io/providers/hashicorp/vault/latest/docs
- Terraform Vault provider source: https://github.com/hashicorp/terraform-provider-vault/tree/main/website/docs/d
- gcloud config reference: https://cloud.google.com/sdk/gcloud/reference/config/set
- Vault Agent Injector docs: https://developer.hashicorp.com/vault/docs/platform/k8s/injector

## Issues Found

1. **Invalid `gcloud config set` invocation with `/dev/stdin` heredoc** — The original snippet `gcloud config set auth/access_token_file /dev/stdin <<< "$TOKEN"` does not work as intended. `gcloud config set` does not read the token from stdin; it just stores the literal string `/dev/stdin` as the file path, and the here-string is discarded the moment the command returns. Replaced with the documented pattern: write the token to a real file, then point `auth/access_token_file` at it.

2. **Non-existent Terraform data source `vault_gcp_secret_roleset_credentials`** — The hashicorp/vault Terraform provider does not expose a `vault_gcp_secret_roleset_credentials` data source. The only GCP-related data source in the provider is `vault_gcp_auth_backend_role` (for the auth backend, not the secrets engine). Replaced the example with `vault_generic_secret` pointed at the roleset's `/key` endpoint, which is the documented workaround for reading dynamic GCP credentials via Terraform.

## Review Notes

- The `vault write gcp/config credentials=@file ttl=3600 max_ttl=86400` example uses the correct parameter names; `ttl` and `max_ttl` at the config level set defaults for generated credentials.
- The roleset CLI examples (`secret_type`, `project`, `bindings`, `token_scopes`) match the official Vault documentation. The single-scope string form `token_scopes="https://..."` mirrors the example shown in HashiCorp's own docs, so it is preserved as-is.
- `client.secrets.gcp.generate_service_account_key(roleset='...', mount_point='gcp')` is a real hvac method with the signature used (optional `key_algorithm`, `key_type`, `method` params default to sensible values).
- `vault write -f gcp/static-account/<name>/rotate-key` is the correct static account key rotation path.
- The `private_key_data` field is indeed base64-encoded JSON of a service account credentials file (because the default `key_type` is `TYPE_GOOGLE_CREDENTIALS_FILE`).
- The Vault Agent Injector template using `base64Decode` against `.Data.private_key_data` is correct because the field is base64-encoded.
- Future caveat: in any post-Vault 1.8 deployment, readers may prefer impersonated accounts (`gcp/impersonated-account/...`) for some use cases over rolesets, but this is a feature-coverage note, not a correctness issue.
