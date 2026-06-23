# Validation Summary: How to Attach Azure KeyVault SSL Certificate to Application Gateway

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Terraform
- Azure Application Gateway
- Azure Key Vault
- Azure managed identities
- Azure RBAC and Key Vault access policies
- Azure CLI

## Sources Consulted
- Microsoft Learn: TLS termination with Azure Key Vault certificates - https://learn.microsoft.com/en-us/azure/application-gateway/key-vault-certs
- Microsoft Learn: Common key vault errors in Azure Application Gateway - https://learn.microsoft.com/en-us/troubleshoot/azure/application-gateway/application-gateway-key-vault-common-errors
- HashiCorp Terraform Registry: azurerm_application_gateway - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/application_gateway
- HashiCorp Terraform Registry: azurerm_key_vault_certificate - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_certificate
- HashiCorp Terraform Registry: random_string - https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/string
- Microsoft Learn: Azure CLI az keyvault certificate - https://learn.microsoft.com/en-us/cli/azure/keyvault/certificate
- Microsoft Learn: Azure CLI az keyvault secret - https://learn.microsoft.com/en-us/cli/azure/keyvault/secret
- Microsoft Learn: Azure CLI az role assignment - https://learn.microsoft.com/en-us/cli/azure/role/assignment

## Issues Found
- The Terraform configuration used `random_string` without declaring the Random provider. Added `hashicorp/random` to `required_providers`.
- The Key Vault comment implied `enabled_for_deployment` and related flags enable general Azure service access. Updated the comment to reflect that these flags apply to VM and ARM deployment secret retrieval scenarios, not Application Gateway managed identity access.
- The Application Gateway certificate block used `azurerm_key_vault_certificate.ssl.secret_id`, which is versioned and prevents automatic rotation to newer certificate versions. Changed it to `versionless_secret_id`, matching Azure guidance for automatic renewal pickup.
- The Application Gateway `depends_on` list only waited for the access policy. Added the Key Vault certificate resource so the gateway is not created before the referenced certificate exists.
- The RBAC example assigned only `Key Vault Certificates Officer` to Terraform. Added `Key Vault Secrets User` because management operations that resolve Key Vault certificate secrets can also require secret read access.
- The certificate renewal troubleshooting example used a `null_resource` trigger, which detects a Terraform state change but does not renew the certificate or update Application Gateway. Replaced it with guidance to import a new certificate version under the same name and keep the gateway reference versionless.

## Review Notes
The tutorial uses AzureRM provider `~> 3.0`; the snippets remain valid for the documented pattern, but future maintenance should consider testing against the current AzureRM major version before publication.
