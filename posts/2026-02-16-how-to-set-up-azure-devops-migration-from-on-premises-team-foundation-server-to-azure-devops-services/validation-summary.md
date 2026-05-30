# Validation Summary: How to Set Up Azure DevOps Migration from On-Premises Team Foundation Server to

## Status
validated

## Post Type
Guide

## Technologies Covered
- Azure DevOps Services
- Azure DevOps Server and Team Foundation Server
- Azure DevOps Data Migration Tool
- Microsoft Entra ID identity mapping
- Azure DevOps CLI
- TFVC and Git migration
- Azure Pipelines YAML

## Sources Consulted
- Microsoft Learn: Get started with Azure DevOps Data Migration Tool - https://learn.microsoft.com/en-us/azure/devops/migrate/migration-get-started?view=azure-devops
- Microsoft Learn: Complete migration prerequisites - https://learn.microsoft.com/en-us/azure/devops/migrate/migration-prerequisites?view=azure-devops
- Microsoft Learn: Do test run migration - https://learn.microsoft.com/en-us/azure/devops/migrate/migration-test-run?view=azure-devops
- Microsoft Learn: Validate and prepare server environment for migration - https://learn.microsoft.com/en-us/azure/devops/migrate/migration-validate?view=azure-devops
- Microsoft Learn: Azure DevOps Server Product Lifecycle and Servicing - https://learn.microsoft.com/en-us/azure/devops/server/install/servicing?view=azure-devops-2022
- Microsoft Learn: View, run, or email a work item query - https://learn.microsoft.com/en-us/azure/devops/boards/queries/view-run-query?view=azure-devops
- Microsoft Learn: Azure CLI az repos reference - https://learn.microsoft.com/en-us/cli/azure/repos?view=azure-cli-latest
- Microsoft Learn: Azure CLI az pipelines reference - https://learn.microsoft.com/en-us/cli/azure/pipelines?view=azure-cli-latest
- Microsoft Learn: NuGetCommand@2 task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/nuget-command-v2?view=azure-pipelines

## Issues Found
- The post said TFS is end-of-life. I changed this to say older TFS versions are out of mainstream support, because Microsoft documents TFS and Azure DevOps Server under the fixed lifecycle with supported servicing versions.
- The post said the Data Migration Tool requires TFS 2018 Update 2 or later. I updated this to the current Microsoft guidance that the migration tool supports the two latest Azure DevOps Server releases at a given time, and listed the currently documented supported server versions.
- The cleanup example queried internal Azure DevOps Server database tables directly. I replaced it with the supported `Migrator.exe validate` workflow.
- The `Migrator.exe validate` example omitted the tenant and region parameters used by current Microsoft migration documentation. I added `/tenantDomainName` and `/region`.
- The identity mapping section described a hand-authored JSON mapping file. I replaced it with the documented generated `IdentityMapLog.csv` review process and clarified active versus historical identities.
- The import example used unsupported `/collection`, `/tenantdomainname`, and `/region` parameters for `Migrator.exe import`. I changed it to `Migrator.exe import /importFile:C:\DataMigrationToolFiles\migration.json` and corrected the pre-import steps.
- The post said the collection is read-only during migration. I changed this to say the collection is detached and kept offline while preparing the final migration backup.
- Updated remaining Azure AD wording in the migration steps to Microsoft Entra ID.

## Review Notes
The Azure DevOps CLI was not installed in the local environment, so CLI examples were checked against Microsoft Learn rather than local `az --help` output. The title appears truncated, but it was left unchanged because the review was limited to technical correctness.
