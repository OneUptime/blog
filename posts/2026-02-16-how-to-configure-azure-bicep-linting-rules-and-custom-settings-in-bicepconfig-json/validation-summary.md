# Validation Summary: How to Configure Azure Bicep Linting Rules

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Azure Bicep
- Bicep linter
- bicepconfig.json
- Azure Container Registry module aliases
- Template spec module aliases
- GitHub Actions
- Azure CLI Bicep commands

## Sources Consulted
- Microsoft Learn: Use Bicep linter - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/linter
- Microsoft Learn: Configure your Bicep environment - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/bicep-config
- Microsoft Learn: Linter settings for Bicep config - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/bicep-config-linter
- Microsoft Learn: Module setting for Bicep config - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/bicep-config-modules
- Microsoft Learn: Bicep modules - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/modules
- Microsoft Learn: Bicep file structure and syntax - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/file
- Microsoft Learn: Linter rule - use recent API versions - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/linter-rule-use-recent-api-versions
- Microsoft Learn: Linter rule - secure parameter default - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/linter-rule-secure-parameter-default
- Microsoft Learn: Linter rule - outputs should not contain secrets - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/linter-rule-outputs-should-not-contain-secrets
- Microsoft Learn: Linter rule - admin user name shouldn't be literal - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/linter-rule-admin-username-should-not-be-literal
- Microsoft Learn: Linter rule - no hardcoded environment URL - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/linter-rule-no-hardcoded-environment-urls
- Microsoft Learn: Linter rule - no hardcoded locations - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/linter-rule-no-hardcoded-location
- Microsoft Learn: Linter rule - use stable resource identifier - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/linter-rule-use-stable-resource-identifier
- Azure Bicep GitHub releases - https://github.com/Azure/bicep/releases

## Issues Found
- The main "comprehensive" linter configuration omitted several current Bicep linter rules documented by Microsoft. Added `nested-deployment-template-scoping`, `no-conflicting-metadata`, `no-explicit-any`, `no-unused-imports`, `use-recent-az-powershell-version`, and `use-secure-value-for-secure-inputs`.
- The `secure-parameter-default` explanation incorrectly implied every default value on a secure parameter is invalid. Updated it to specify hardcoded defaults, with the documented exceptions for empty string and `newGuid()`.
- The module examples used empty module bodies, which are not valid complete Bicep module declarations. Added `name` values and unique symbolic names.
- The experimental features snippet used outdated feature names, including `extensibility`, which has been removed. Replaced the snippet with current documented experimental feature examples, `assertions` and `testFramework`.
- The team-wide configuration examples used comments inside `json` code fences. Moved those labels outside the JSON snippets so the examples remain valid JSON.

## Review Notes
The Bicep CLI and Azure CLI were not installed in the local environment, so command behavior was verified against Microsoft Learn rather than local `az bicep` execution. Some Bicep resource snippets are intentionally partial to focus on linter behavior rather than full deployable VM or network resource definitions.
