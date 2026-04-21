# Validation Summary: How to Deploy Static Sites on Azure Static Web Apps with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu/Terraform HCL
- AzureRM provider
- Azure Static Web Apps
- Azure DNS custom domains
- Azure Functions API integration for Static Web Apps
- GitHub Actions
- GitHub Terraform provider

## Sources Consulted
- AzureRM `azurerm_static_web_app` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/static_web_app
- AzureRM `azurerm_static_web_app_custom_domain` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/static_web_app_custom_domain
- AzureRM DNS record resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/dns_cname_record and https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/dns_txt_record
- GitHub provider `github_actions_secret` resource documentation: https://registry.terraform.io/providers/integrations/github/latest/docs/resources/actions_secret
- Azure Static Web Apps overview: https://learn.microsoft.com/en-us/azure/static-web-apps/overview
- Azure Static Web Apps custom domains: https://learn.microsoft.com/en-us/azure/static-web-apps/custom-domain
- Azure Static Web Apps apex domains: https://learn.microsoft.com/en-us/azure/static-web-apps/apex-domain-external and https://learn.microsoft.com/en-us/azure/static-web-apps/apex-domain-azure-dns
- Azure Static Web Apps application settings: https://learn.microsoft.com/en-us/azure/static-web-apps/application-settings
- Azure Static Web Apps build configuration: https://learn.microsoft.com/en-us/azure/static-web-apps/build-configuration
- Azure Static Web Apps branch and named preview environments: https://learn.microsoft.com/en-us/azure/static-web-apps/branch-environments and https://learn.microsoft.com/en-us/azure/static-web-apps/named-environments
- Azure Static Web Apps hosting plans and quotas: https://learn.microsoft.com/en-us/azure/static-web-apps/plans and https://learn.microsoft.com/en-us/azure/static-web-apps/quotas
- Azure Static Web Apps deploy GitHub Action metadata: https://github.com/Azure/static-web-apps-deploy/blob/v1/action.yml

## Issues Found
1. **Incorrect terminology for environments**: Changed "environment slots" to "preview environments" because Static Web Apps uses preview/pre-production environments, not App Service-style slots.

2. **Incorrect apex-domain TXT record example**: Removed the TXT record that used `azurerm_static_web_app.main.default_host_name` as the TXT value. For `dns-txt-token` validation, the AzureRM custom domain resource exposes a `validation_token`, and apex routing should use ALIAS, ANAME, or CNAME flattening where supported.

3. **Deprecated GitHub provider argument**: Changed `plaintext_value` to `value` for `github_actions_secret`, matching the current GitHub provider documentation.

4. **Workflow did not create PR preview environments**: Added the `pull_request` trigger, a deploy-job condition, and a close job so the workflow matches the Static Web Apps PR preview environment flow.

5. **Prebuilt deployment configuration was incomplete**: Because the workflow runs `npm ci && npm run build` before deployment, changed the deploy action to use `app_location: "dist"`, an empty `output_location`, and `skip_app_build: true`.

6. **Non-functional staging environment HCL**: Replaced the unused `locals` example with a GitHub Actions preview-environment configuration using `production_branch` and the correct branch preview URL format.

7. **Incorrect Free tier limitation**: Corrected the claim that Free does not support custom domains with HTTPS. The Free plan supports custom domains with managed SSL, but has lower quotas and does not support private endpoints or an SLA.

8. **Incomplete validation-type guidance**: Updated the best-practice guidance to clarify that `cname-delegation` applies to regular subdomains outside Enterprise Grade Edge, while apex domains and Enterprise Grade Edge custom domains should use `dns-txt-token`.

9. **Over-broad preview environment claim**: Clarified that PR preview environments require a workflow that handles `pull_request` events and are limited by the hosting plan's preview-environment quotas.

## Review Notes
- The `azurerm_static_web_app`, `app_settings`, `api_key`, `default_host_name`, `sku_tier`, and `sku_size` usages match the current AzureRM provider documentation.
- Microsoft documentation currently differs on the exact Standard-plan custom-domain quota between the hosting plan and quotas pages, so the post now avoids a specific number.
- If a Static Web Apps configuration file is needed, it must be present in the deployed output directory when using `skip_app_build: true`.
