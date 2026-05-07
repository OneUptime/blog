# Validation Summary: How to Manage Azure App Service Certificates with OpenTofu

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OpenTofu
- Terraform `azurerm` provider
- Terraform `azuread` provider
- Azure App Service
- Azure Key Vault
- Azure DNS
- TLS/SSL certificates
- Custom domain binding

## Sources Consulted
- HashiCorp AzureRM provider docs: `azurerm_linux_web_app` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/linux_web_app.html.markdown
- HashiCorp AzureRM provider docs: `azurerm_app_service_custom_hostname_binding` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/app_service_custom_hostname_binding.html.markdown
- HashiCorp AzureRM provider docs: `azurerm_app_service_managed_certificate` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/app_service_managed_certificate.html.markdown
- HashiCorp AzureRM provider docs: `azurerm_app_service_certificate_binding` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/app_service_certificate_binding.html.markdown
- HashiCorp AzureRM provider docs: `azurerm_app_service_certificate` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/app_service_certificate.html.markdown
- HashiCorp AzureRM provider docs: `azurerm_key_vault` and `azurerm_key_vault_certificate` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/key_vault.html.markdown and https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/key_vault_certificate.html.markdown
- HashiCorp AzureAD provider docs: `azuread_service_principal` data source - https://raw.githubusercontent.com/hashicorp/terraform-provider-azuread/main/docs/data-sources/service_principal.md
- Microsoft Learn: Set up an existing custom domain in Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/app-service-web-tutorial-custom-domain
- Microsoft Learn: Install a TLS/SSL certificate for your app - https://learn.microsoft.com/en-us/azure/app-service/configure-ssl-certificate
- Microsoft Learn: Certificates in App Service Environment - https://learn.microsoft.com/en-us/azure/app-service/environment/overview-certificates

## Issues Found
- The custom hostname binding snippet would drift after certificate binding because `ssl_state` and `thumbprint` were being handled on the hostname binding resource. I replaced the null assignments with `lifecycle { ignore_changes = [ssl_state, thumbprint] }`, which matches the provider's documented pattern when `azurerm_app_service_certificate_binding` owns TLS binding state.
- The hostname binding only depended on the CNAME record even though the post also creates the TXT verification record. I updated `depends_on` to include the TXT record so the example consistently creates both DNS records before binding.
- The Key Vault example referenced `data.azurerm_client_config.current` without defining it. I added `data "azurerm_client_config" "current" {}`.
- The Key Vault access policy hardcoded an App Service principal object ID. I replaced it with a tenant-resolved `azuread_service_principal` lookup because the object ID is tenant-specific.
- The Key Vault certificate example said it would import an existing certificate but actually generated a self-signed certificate with `issuer_parameters { name = "Self" }`. I changed it to import a CA-issued PKCS#12 certificate into Key Vault, which aligns with App Service requirements for public custom-domain TLS bindings.
- The TXT record guidance stated that Azure requires `asuid.<subdomain>` to prove domain ownership. I corrected this to reflect current Microsoft guidance: the TXT record is used during domain verification and is strongly recommended to help prevent subdomain takeovers, but it is not absolutely required in every binding flow.

## Review Notes
- App Service managed certificates are still appropriate for the post, but they have important current limitations: no wildcard support, no private DNS support, no export capability, and no App Service Environment support.
- For root/apex domains, managed certificate issuance and renewal require the app to stay publicly reachable; IP restrictions can break that flow.
- If a Key Vault firewall is enabled, Azure App Service may also need the vault configured to allow trusted Microsoft services to bypass the firewall.
- Azure documents App Service Managed Certificate issuance and renewal changes effective July 28, 2025. The post remains technically valid after the fixes, but readers should check current Azure guidance if managed certificate issuance behaves differently than expected.
