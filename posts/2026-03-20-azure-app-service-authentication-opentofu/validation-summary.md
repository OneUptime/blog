# Validation Summary: How to Set Up Azure App Service Authentication with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- HCL
- Azure App Service
- AzureRM provider
- AzureAD provider
- Microsoft Entra ID (Azure AD)
- GitHub OAuth

## Sources Consulted
- AzureRM provider docs for `azurerm_linux_web_app`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/linux_web_app.html.markdown
- AzureAD provider docs for `azuread_application`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azuread/main/docs/resources/application.md
- AzureAD provider docs for `azuread_application_password`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azuread/main/docs/resources/application_password.md
- AzureAD provider docs for `azuread_client_config`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azuread/main/docs/data-sources/client_config.md
- Microsoft Learn, Configure Microsoft Entra authentication for App Service: https://learn.microsoft.com/en-us/azure/app-service/configure-authentication-provider-aad
- Microsoft Learn, Authentication and authorization in Azure App Service and Azure Functions: https://learn.microsoft.com/en-us/azure/app-service/overview-authentication-authorization
- Microsoft Learn, Configure GitHub authentication for App Service: https://learn.microsoft.com/en-us/azure/app-service/configure-authentication-provider-github

## Issues Found
- The post used `azurerm_linux_web_app_auth_settings_v2` as a standalone resource. In the current AzureRM provider, `auth_settings_v2` is configured as a nested block on `azurerm_linux_web_app`, so I moved the authentication examples into the web app resource.
- The post referenced `data.azuread_client_config.current.tenant_id` without defining the data source. I added `data "azuread_client_config" "current" {}` so the issuer URL example is complete.
- The Step 2 example declared a second `azurerm_linux_web_app` resource only to hold the secret app setting. I merged the app setting into the same web app resource because `client_secret_setting_name` expects an app setting on the target app.
- The multi-provider example used `scopes` inside `github_v2`, but the current AzureRM field name is `login_scopes`. I updated the block and added the required GitHub secret app setting.
- The app secret example used a fixed `end_date` of `2027-01-01T00:00:00Z`, which would make the sample stale over time. I replaced it with `end_date_relative = "8760h"` to keep the example valid without changing the intent.
- The prose described the feature and configuration slightly inaccurately by referring to `auth_settings_v2` as a resource and listing older provider names. I corrected the wording to match current Azure and provider documentation.

## Review Notes
- The Microsoft Entra redirect URI for App Service still uses the `/.auth/login/aad/callback` path even though Azure AD is now branded as Microsoft Entra ID.
- OpenTofu and Terraform CLIs were not installed in this workspace, so the snippets were verified against the current official provider and Microsoft documentation rather than executed locally.
