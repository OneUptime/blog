# Validation Summary: How to Handle Provider Authentication in Custom Providers

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Terraform Plugin Framework
- Terraform provider authentication
- Go
- OAuth2 client credentials flow
- HashiCorp Vault provider data sources
- Terraform sensitive and ephemeral values

## Sources Consulted
- Terraform Plugin Framework provider configuration documentation: https://developer.hashicorp.com/terraform/plugin/framework/providers
- Terraform Plugin Framework data source configuration documentation: https://developer.hashicorp.com/terraform/plugin/framework/data-sources/configure
- Terraform Plugin Framework string attribute documentation: https://developer.hashicorp.com/terraform/plugin/framework/handling-data/attributes/string
- Terraform plugin logging and log filtering documentation: https://developer.hashicorp.com/terraform/plugin/log/filtering
- Terraform sensitive data documentation: https://developer.hashicorp.com/terraform/language/manage-sensitive-data
- Go OAuth2 clientcredentials package documentation: https://pkg.go.dev/golang.org/x/oauth2/clientcredentials
- HashiCorp Vault provider `vault_generic_secret` documentation: https://registry.terraform.io/providers/hashicorp/vault/latest/docs/data-sources/generic_secret

## Issues Found
- The OAuth2 client credentials example used `oauth2.Config` with a `TokenURL` field and `TokenSource(ctx, token)` call. That is not the correct API for the client credentials grant in `golang.org/x/oauth2`; the official package is `golang.org/x/oauth2/clientcredentials`. Updated the example to use `clientcredentials.Config`, `TokenSource(ctx)`, and `Client(ctx)`.
- The post overstated `Sensitive: true` by implying it prevents exposure in logs or state files. Terraform documentation says `Sensitive` generally masks practitioner-facing output but does not change how data is stored, and provider logs require separate care. Updated the wording to reflect that limitation.
- The Vault data source example was labeled as a straightforward secure pattern. The official Vault provider documentation warns that secrets read through `vault_generic_secret` can be written to Terraform state and plan artifacts. Updated the example label to "use with caution."
- The Terraform variable example used only `sensitive = true`. Updated it to include `ephemeral = true` for Terraform 1.10+ so the example matches the stated goal of avoiding persistence in state and plan files when used in provider configuration.

## Review Notes
The Go snippets are illustrative and still depend on provider-specific placeholder types and helper functions such as `MyProvider`, `NewAPIClient`, `resolveString`, and `Authenticator`. Those placeholders are acceptable for this guide, but a production provider should also handle unknown provider configuration values during `Configure`.
