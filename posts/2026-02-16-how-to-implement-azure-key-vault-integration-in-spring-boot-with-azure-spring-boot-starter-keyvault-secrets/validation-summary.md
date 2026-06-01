# Validation Summary: How to Use Azure Key Vault Integration in Spring Boot with

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Key Vault
- Spring Boot
- Spring Cloud Azure Key Vault Secrets
- Azure CLI
- Azure Identity and DefaultAzureCredential
- Managed identities
- Java configuration properties and health indicators

## Sources Consulted
- Microsoft Learn: Spring Cloud Azure secret management - https://learn.microsoft.com/en-us/azure/developer/java/spring-framework/secret-management
- Microsoft Learn: Spring Cloud Azure authentication - https://learn.microsoft.com/en-us/azure/developer/java/spring-framework/authentication
- Microsoft Learn: Azure Key Vault keys, secrets, and certificates overview - https://learn.microsoft.com/en-us/azure/key-vault/general/about-keys-secrets-certificates
- Microsoft Learn: az keyvault CLI reference - https://learn.microsoft.com/en-us/cli/azure/keyvault
- Microsoft Learn: Assign an Azure Key Vault access policy - https://learn.microsoft.com/en-us/azure/key-vault/general/assign-access-policy
- Microsoft Learn: Azure RBAC as default access control for new Key Vaults - https://learn.microsoft.com/en-us/azure/key-vault/general/access-control-default
- Microsoft Learn: Azure Key Vault RBAC guide - https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-guide
- Microsoft Learn: Enable Azure Key Vault logging - https://learn.microsoft.com/en-us/azure/key-vault/general/howto-logging
- Maven Central metadata for Spring Cloud Azure dependencies - https://repo1.maven.org/maven2/com/azure/spring/spring-cloud-azure-dependencies/maven-metadata.xml
- Maven Central metadata for Spring Cloud Azure Key Vault Secrets starter - https://repo1.maven.org/maven2/com/azure/spring/spring-cloud-azure-starter-keyvault-secrets/maven-metadata.xml

## Issues Found
- The post referred to the old `azure-spring-boot-starter-keyvault-secrets` name while using the current `spring-cloud-azure-starter-keyvault-secrets` artifact. Updated the prose to use the current artifact name.
- The dependency versions used `5.8.0`, while Maven Central lists `7.3.0` as the current release. Updated the starter and BOM versions to `7.3.0`.
- The health indicator example used Spring Boot Actuator classes without including the Actuator starter. Added `spring-boot-starter-actuator` to the dependency example.
- The `az keyvault create` example relied on access-policy commands later in the post. New Key Vaults now default to Azure RBAC, where access policies are ignored. Added `--enable-rbac-authorization false` so the later `az keyvault set-policy` commands are consistent.
- The post said later Key Vault property sources override earlier ones. Spring Cloud Azure documentation says definition order determines priority, with earlier property sources taking precedence. Corrected the explanation and inline YAML comment.
- The secret refresh section said secrets are only loaded at startup and used `refresh-interval` directly under `secret`. Spring Cloud Azure documents a default 30-minute property-source refresh interval and the configurable property under `property-sources[].refresh-interval`. Updated the explanation and YAML.
- The post implied Key Vault automatically logs every secret access to Azure Monitor. Azure documentation requires diagnostic settings to route audit logs. Updated the audit statements to say diagnostic settings must be enabled.

## Review Notes
The post intentionally uses the access-policy permission model for a concise tutorial. Azure RBAC is now the default and recommended model for new vaults, so a future revision could modernize the tutorial by replacing `az keyvault set-policy` with Azure role assignments such as Key Vault Secrets User or Key Vault Secrets Officer.
