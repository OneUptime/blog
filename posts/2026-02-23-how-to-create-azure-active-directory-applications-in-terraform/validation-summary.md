# Validation Summary: How to Create Azure Active Directory Applications in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AzureAD provider
- HashiCorp AzureRM provider
- Microsoft Entra ID / Azure Active Directory app registrations
- Microsoft Graph API permissions
- OAuth 2.0 / OpenID Connect

## Sources Consulted
- HashiCorp AzureAD provider v2.47.0 `azuread_application` resource documentation: https://github.com/hashicorp/terraform-provider-azuread/blob/v2.47.0/docs/resources/application.md
- HashiCorp AzureAD provider v2.47.0 `azuread_application_password` resource documentation: https://github.com/hashicorp/terraform-provider-azuread/blob/v2.47.0/docs/resources/application_password.md
- HashiCorp AzureAD provider v2.47.0 `azuread_application_certificate` resource documentation: https://github.com/hashicorp/terraform-provider-azuread/blob/v2.47.0/docs/resources/application_certificate.md
- HashiCorp AzureAD provider v2.47.0 `azuread_service_principal` resource documentation: https://github.com/hashicorp/terraform-provider-azuread/blob/v2.47.0/docs/resources/service_principal.md
- HashiCorp AzureAD provider v2.47.0 `azuread_app_role_assignment` resource documentation: https://github.com/hashicorp/terraform-provider-azuread/blob/v2.47.0/docs/resources/app_role_assignment.md
- HashiCorp AzureAD provider v2.47.0 `azuread_application_published_app_ids` data source documentation: https://github.com/hashicorp/terraform-provider-azuread/blob/v2.47.0/docs/data-sources/application_published_app_ids.md
- HashiCorp AzureAD provider v2.47.0 redirect URI validation source: https://github.com/hashicorp/terraform-provider-azuread/blob/v2.47.0/internal/tf/validation/uri.go
- Microsoft Learn, Redirect URI best practices and limitations: https://learn.microsoft.com/en-us/entra/identity-platform/reply-url
- Microsoft Learn, Microsoft Graph permissions reference: https://learn.microsoft.com/en-us/graph/permissions-reference
- Microsoft Learn, Consent experience for applications in Microsoft Entra ID: https://learn.microsoft.com/en-us/entra/identity-platform/application-consent-experience
- HashiCorp Terraform CLI plan documentation: https://developer.hashicorp.com/terraform/cli/commands/plan

## Issues Found
- The SPA example used root redirect URIs with trailing slashes. In the AzureAD provider v2.47.0 schema, `single_page_application.redirect_uris` rejects a URI whose only path is `/`, so `https://app.example.com/` and `http://localhost:3000/` were changed to `https://app.example.com` and `http://localhost:3000`.
- The SPA example requested an API app role with `type = "Role"` for a browser-based delegated access scenario. This was changed to request the API's exposed OAuth2 permission scope with `azuread_application.api.oauth2_permission_scope_ids["api.access"]` and `type = "Scope"`.
- The certificate example read a PEM file with `filebase64()` while leaving the certificate resource's default encoding as PEM. The AzureAD provider expects PEM text for default `encoding = "pem"`, so this was changed to `file()`.
- The admin consent example referenced `azuread_service_principal.msgraph` without defining it. A Microsoft Graph service principal resource with `use_existing = true` was added.
- The daemon app requested both `Mail.Send` and `User.Read.All` application permissions, but the consent example only granted `Mail.Send`. A second `azuread_app_role_assignment` was added for `User.Read.All`.
- The final permissions note said the Terraform service principal needs only an Entra directory role. The provider documentation distinguishes service principal authentication, which uses Microsoft Graph application permissions, from user authentication, which may use directory roles. The note was updated accordingly.

## Review Notes
Terraform CLI was not installed in the review environment, so `terraform validate` could not be run locally. The review was performed against the pinned AzureAD provider v2.47.0 documentation and source validation logic. The provider version is older than the current AzureAD provider line, but the post pins `~> 2.47`, so the examples were validated for that version rather than migrated to provider 3.x.
