# Validation Summary: How to Set Up Azure App Service SSL Bindings with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Azure App Service
- Azure Key Vault
- AzureRM provider
- TLS/SSL certificates
- HTTPS

## Sources Consulted
- Azure App Service TLS/SSL overview: https://learn.microsoft.com/en-us/azure/app-service/overview-tls
- Add and manage TLS/SSL certificates in Azure App Service: https://learn.microsoft.com/en-us/azure/app-service/configure-ssl-certificate
- Manage minimum TLS versions for Azure App Service: https://learn.microsoft.com/en-us/azure/app-service/tls-minimum-version
- About Azure Key Vault certificates: https://learn.microsoft.com/en-us/azure/key-vault/certificates/about-certificates
- Certificate creation methods in Azure Key Vault: https://learn.microsoft.com/en-us/azure/key-vault/certificates/create-certificate
- About Azure Key Vault certificate renewal: https://learn.microsoft.com/en-us/azure/key-vault/certificates/overview-renew-certificate
- Tutorial: Configure certificate autorotation in Key Vault: https://learn.microsoft.com/en-us/azure/key-vault/certificates/tutorial-rotate-certificates
- AzureRM provider `azurerm_app_service_managed_certificate`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/app_service_managed_certificate.html.markdown
- AzureRM provider `azurerm_app_service_certificate_binding`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/app_service_certificate_binding.html.markdown
- AzureRM provider `azurerm_app_service_certificate`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/app_service_certificate.html.markdown
- AzureRM provider `azurerm_key_vault_certificate` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/key_vault_certificate.html.markdown
- AzureRM provider `azurerm_key_vault_certificate` data source docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/d/key_vault_certificate.html.markdown
- AzureRM provider `azurerm_linux_web_app`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/linux_web_app.html.markdown

## Issues Found
- Step 2 referenced `azurerm_key_vault_certificate.cert.secret_id`, but no such resource existed in the post. I replaced it with a documented `data "azurerm_key_vault_certificate"` lookup for an existing CA-issued PKCS#12 certificate in Key Vault.
- Step 2 omitted a required prerequisite for Key Vault-backed imports. I added the note that the App Service resource provider needs `Secret Get` and `Certificate Get` permissions on the Key Vault for `azurerm_app_service_certificate` to work.
- Step 3 was labeled as a Let's Encrypt or CA example, but the code actually created a self-signed Key Vault certificate using `issuer_parameters { name = "Self" }`. I retitled the section to match the implementation and clarified that it is for dev/staging only.
- Step 3 omitted the server-authentication EKU commonly required for TLS certificates in App Service. I added `extended_key_usage = ["1.3.6.1.5.5.7.3.1"]` to align the certificate policy with the App Service certificate requirements.
- Step 4 only configured `minimum_tls_version` for the main site. Microsoft documents a separate SCM/Kudu minimum TLS setting, so I added `scm_minimum_tls_version = "1.2"` to make the security guidance complete.
- The summary implied the generic Key Vault certificate example was production-ready. I corrected that guidance to refer specifically to Key Vault-backed CA-issued certificates for production lifecycle management.

## Review Notes
- App Service automatically syncs renewed certificates imported from Key Vault within 24 hours, provided the required Key Vault permissions remain in place.
- App Service Managed Certificates remain supported, but Microsoft notes issuance and renewal changes effective July 28, 2025 for some scenarios.
- Current AzureRM documentation for `azurerm_linux_web_app` also allows TLS `1.3`, but `1.2` remains a valid minimum and matches Microsoft's baseline guidance.
