# Validation Summary: How to Create Azure Key Vault Certificates with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AzureRM Provider
- Azure Key Vault
- Azure Key Vault Certificates
- TLS / X.509 Certificates
- DigiCert (integrated CA)
- Azure Application Gateway
- Azure App Service
- Azure RBAC
- PKCS#12 (.pfx) certificate format

## Sources Consulted
- AzureRM Provider docs: `azurerm_key_vault_certificate` (https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_certificate)
- AzureRM Provider docs: `azurerm_key_vault_certificate_issuer` (https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_certificate_issuer)
- AzureRM Provider docs: `azurerm_role_assignment` (https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)
- Microsoft Learn — Azure built-in roles: "Key Vault Certificate User" (https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles#key-vault-certificate-user)
- Microsoft Learn — Key Vault certificates concepts (https://learn.microsoft.com/en-us/azure/key-vault/certificates/about-certificates)
- Microsoft Learn — Integrated CA providers for Key Vault (DigiCert, GlobalSign, OneCertV2) (https://learn.microsoft.com/en-us/azure/key-vault/certificates/create-certificate)
- IANA / RFC 5280 — X.509 Extended Key Usage OID `1.3.6.1.5.5.7.3.1` (id-kp-serverAuth)

## Issues Found
No technical issues found.

All resource arguments and nested blocks match the AzureRM provider schema:
- `azurerm_key_vault_certificate` — `certificate_policy` with `issuer_parameters`, `key_properties` (`exportable`, `key_size`, `key_type`, `reuse_key`), `lifetime_action` (`action`/`trigger`), `secret_properties` (`content_type = "application/x-pkcs12"`), and `x509_certificate_properties` (`extended_key_usage`, `key_usage`, `subject`, `validity_in_months`, `subject_alternative_names`) are all correct.
- `azurerm_key_vault_certificate_issuer` — `provider_name = "DigiCert"` is one of the supported integrated CA values; `account_id`, `password`, and the `admin` block (with `email_address`, `first_name`, `last_name`, `phone`) match the provider schema.
- Import block — `certificate { contents, password }` with `filebase64()` is correct.
- RBAC — "Key Vault Certificate User" is the correct built-in role for reading certificates and performing certificate operations under the Key Vault RBAC permission model.
- OID `1.3.6.1.5.5.7.3.1` is correctly identified as TLS Server Authentication.
- Output attributes `secret_id` and `thumbprint` are valid exported attributes of `azurerm_key_vault_certificate`.

## Review Notes
- The example references `azurerm_app_service.main.identity[0].principal_id`. The `azurerm_app_service` resource was deprecated in AzureRM 3.x and removed in 4.0; new deployments should use `azurerm_linux_web_app` or `azurerm_windows_web_app`. The attribute path (`identity[0].principal_id`) shown still applies to the replacement resources, so the pattern is valid even if a reader updates the resource type.
- The Key Vault must have RBAC authorization enabled (`enable_rbac_authorization = true`) for the "Key Vault Certificate User" role assignments to take effect; otherwise, access policies would need to be used instead. This is implied but not stated.
- The DigiCert integration requires the Key Vault to be registered with DigiCert's CertCentral and uses the account ID and API key — the `password` field intentionally holds the API key for DigiCert.
- For Application Gateway certificate consumption, the gateway typically references the Key Vault `secret_id` via the `ssl_certificate.key_vault_secret_id` attribute; this consumption pattern is referenced in the conclusion but not shown in code, which is appropriate for the post's scope.
