# Validation Summary: How to Configure Azure Spring Apps with Managed Identity for Secure Access to

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Spring Apps
- Managed identities for Azure resources
- Microsoft Entra ID
- Azure Key Vault
- Azure RBAC
- Azure CLI
- Spring Boot
- Spring Cloud Azure Key Vault Secrets starter
- Azure SDK for Java
- Azure Monitor diagnostic settings
- Kusto Query Language

## Sources Consulted
- Microsoft Learn: Enable system-assigned managed identity for applications in Azure Spring Apps - https://learn.microsoft.com/en-us/azure/spring-apps/basic-standard/how-to-enable-system-assigned-managed-identity
- Microsoft Learn: az spring app identity CLI reference - https://learn.microsoft.com/en-us/cli/azure/spring/app/identity
- Microsoft Learn: Connect Azure Spring Apps to Key Vault using managed identities - https://learn.microsoft.com/en-us/azure/spring-apps/basic-standard/tutorial-managed-identities-key-vault
- Microsoft Learn: Azure Spring Apps retirement announcement - https://learn.microsoft.com/en-us/azure/spring-apps/basic-standard/retirement-announcement
- Microsoft Learn: Spring Cloud Azure secret management - https://learn.microsoft.com/en-us/azure/developer/java/spring-framework/secret-management
- Microsoft Learn: Credential chains in the Azure Identity library for Java - https://learn.microsoft.com/en-us/azure/developer/java/sdk/authentication/credential-chains
- Microsoft Learn: Azure Identity client library for Java - https://learn.microsoft.com/en-us/java/api/overview/azure/identity-readme
- Microsoft Learn: Grant permission to applications to access an Azure key vault using Azure RBAC - https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-guide
- Microsoft Learn: Azure built-in roles for Security - https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/security
- Microsoft Learn: az role assignment CLI reference - https://learn.microsoft.com/en-us/cli/azure/role/assignment
- Microsoft Learn: az keyvault CLI reference - https://learn.microsoft.com/en-us/cli/azure/keyvault
- Microsoft Learn: Enable Azure Key Vault logging - https://learn.microsoft.com/en-us/azure/key-vault/general/howto-logging
- Microsoft Learn: Diagnostic settings in Azure Monitor - https://learn.microsoft.com/en-us/azure/azure-monitor/essentials/diagnostic-settings

## Issues Found
- The post described managed identity as an Azure AD feature. Updated this to Microsoft Entra ID, the current product name used in Microsoft documentation.
- The Azure Spring Apps prerequisite omitted the current retirement status. Added a caveat that Azure Spring Apps is in retirement and is no longer available to new customers, while preserving the tutorial for existing customers.
- The Spring Cloud Azure BOM version was outdated. Updated `spring-cloud-azure-dependencies` from `5.8.0` to `5.25.0`, matching the current 5.x line documented by Microsoft.
- The Spring Cloud Azure Key Vault starter YAML used `spring.cloud.azure.keyvault.secret.endpoint`, which is not the documented property-source configuration. Updated the snippets to use `spring.cloud.azure.keyvault.secret.property-sources[].endpoint`.
- The Azure-hosted Spring Cloud Azure configuration did not explicitly enable managed identity for the Key Vault property source. Added `credential.managed-identity-enabled: true` to the Azure deployment snippets.
- The direct Azure SDK sample used `ManagedIdentityCredentialBuilder` while the local development section claimed fallback through the `DefaultAzureCredential` chain. Updated the direct SDK sample to use `DefaultAzureCredentialBuilder`, which supports managed identity in Azure and developer credentials such as Azure CLI locally.
- The diagnostic settings example passed a Log Analytics workspace name directly. Updated it to resolve the workspace resource ID first and pass that ID to `az monitor diagnostic-settings create`.

## Review Notes
The local workspace does not have the Azure CLI installed, so CLI validation was performed against Microsoft Learn command references instead of local `az --help` output. The illustrative `PaymentService` sample references application-specific classes such as `PaymentResult`, `PaymentRequest`, and `StripeClient`; those are acceptable placeholders but would need concrete implementations in a real project.
