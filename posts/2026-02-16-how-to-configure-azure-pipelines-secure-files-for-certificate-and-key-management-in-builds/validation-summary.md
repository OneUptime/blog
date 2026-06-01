# Validation Summary: How to Configure Azure Pipelines Secure Files for Certificate and Key Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Pipelines secure files
- Azure DevOps library security and pipeline permissions
- Azure Pipelines YAML tasks
- DownloadSecureFile@1
- DotNetCoreCLI@2 and PowerShell signing with signtool
- Gradle@3 for Android builds
- InstallAppleCertificate@2, InstallAppleProvisioningProfile@1, and Xcode@5
- Azure DevOps Distributed Task REST API
- SSH private keys in CI/CD

## Sources Consulted
- Microsoft Learn: Secure files for Azure Pipelines: https://learn.microsoft.com/en-us/azure/devops/pipelines/library/secure-files?view=azure-devops
- Microsoft Learn: DownloadSecureFile@1 task reference: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/download-secure-file-v1?view=azure-pipelines
- Microsoft Learn: Manage security in Azure Pipelines: https://learn.microsoft.com/en-us/azure/devops/pipelines/policies/permissions?view=azure-devops
- Microsoft Learn: Gradle@3 task reference: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/gradle-v3?view=azure-pipelines
- Microsoft Learn: InstallAppleCertificate@2 task reference: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/install-apple-certificate-v2?view=azure-pipelines
- Microsoft Learn: InstallAppleProvisioningProfile@1 task reference: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/install-apple-provisioning-profile-v1?view=azure-pipelines
- Microsoft Learn: Xcode@5 task reference: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/xcode-v5?view=azure-pipelines
- Microsoft Learn: Azure DevOps CLI command reference for `az pipelines`: https://learn.microsoft.com/en-us/cli/azure/pipelines?view=azure-cli-latest
- Microsoft Learn: Azure DevOps securefiles REST API: https://learn.microsoft.com/en-us/rest/api/azure/devops/distributedtask/securefiles?view=azure-devops-rest-7.2
- Microsoft Learn: Upload secure file REST API: https://learn.microsoft.com/en-us/rest/api/azure/devops/distributedtask/securefiles/upload-secure-file?view=azure-devops-rest-7.2
- Microsoft Learn: Get secure files REST API: https://learn.microsoft.com/en-us/rest/api/azure/devops/distributedtask/securefiles/get-secure-files?view=azure-devops-rest-7.2
- Microsoft Learn: Delete secure file REST API: https://learn.microsoft.com/en-us/rest/api/azure/devops/distributedtask/securefiles/delete?view=azure-devops-rest-7.2
- Azure DevOps CLI extension repository: https://github.com/Azure/azure-devops-cli-extension

## Issues Found
- The post said secure files can be any file type without mentioning the documented 10 MB per-file limit. Added the limit to the upload section.
- The post said only the uploader can authorize pipelines by default. Microsoft documents the creator as Administrator for the asset, with inherited library security roles also applying, so the wording was corrected.
- The Windows signing example looked for build outputs in `$(Build.ArtifactStagingDirectory)` immediately after `dotnet build`, where the assemblies would not normally be placed. Updated it to search Release build output under `$(Build.SourcesDirectory)`.
- The Windows signing example hard-coded a `signtool.exe` path that does not match the versioned Windows Kits layout commonly present on hosted Windows agents. Updated it to locate the x64 `signtool.exe` under the Windows Kits installation.
- The Azure CLI secure-file commands were not present in the official `az pipelines` command reference or the current Azure DevOps CLI extension command registrations. Replaced that section with supported Azure DevOps Distributed Task REST API `curl` examples for upload, list, and delete.

## Review Notes
The Azure Pipelines task examples for `DownloadSecureFile@1`, `Gradle@3`, `InstallAppleCertificate@2`, `InstallAppleProvisioningProfile@1`, and `Xcode@5` match the documented task names and inputs. `Gradle@4` is available in the current task index, but `Gradle@3` remains documented and was not treated as a technical error.
