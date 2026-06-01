# Validation Summary: How to Create and Manage Azure Artifacts Upstream Sources for npm Packages

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Artifacts
- Azure DevOps
- Azure Pipelines
- npm
- Node.js
- Azure DevOps CLI
- Azure DevOps Artifacts REST API

## Sources Consulted
- Microsoft Learn: Set up upstream sources - https://learn.microsoft.com/en-us/azure/devops/artifacts/how-to/set-up-upstream-sources?view=azure-devops
- Microsoft Learn: Use packages from the npm registry - https://learn.microsoft.com/en-us/azure/devops/artifacts/npm/upstream-sources?view=azure-devops
- Microsoft Learn: Azure Artifacts key concepts - https://learn.microsoft.com/en-us/azure/devops/artifacts/artifacts-key-concepts?view=azure-devops
- Microsoft Learn: Connect to an Azure Artifacts feed - npm - https://learn.microsoft.com/en-us/azure/devops/artifacts/npm/npmrc?view=azure-devops
- Microsoft Learn: Publish npm packages from the command line - https://learn.microsoft.com/en-us/azure/devops/artifacts/npm/publish?view=azure-devops
- Microsoft Learn: Publish npm packages with Azure Pipelines - https://learn.microsoft.com/en-us/azure/devops/pipelines/artifacts/npm?view=azure-devops
- Microsoft Learn: npmAuthenticate@0 task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/npm-authenticate-v0?view=azure-pipelines
- Microsoft Learn: Azure DevOps CLI reference - https://learn.microsoft.com/en-us/cli/azure/devops?view=azure-cli-latest
- Microsoft Learn: az artifacts universal reference - https://learn.microsoft.com/en-us/cli/azure/artifacts/universal?view=azure-cli-latest
- Microsoft Learn: Feed Management - Update Feed REST API - https://learn.microsoft.com/en-us/rest/api/azure/devops/artifacts/feed-management/update-feed?view=azure-devops-rest-7.1

## Issues Found
- The upstream-source resolution order omitted the separate "packages saved from an upstream source" step documented by Azure Artifacts. Updated the text and Mermaid diagram to show direct feed packages, saved upstream packages, then upstream lookup.
- The feed creation checklist labeled organization-scoped feeds as a Visibility option. Azure DevOps treats this as feed Scope, so the label was corrected.
- The manual upstream setup used "Public registry"; the current Azure DevOps UI and docs use "Public source", so the terminology was corrected.
- The post included an invalid `az artifacts universal upstream add` command. The current Azure DevOps CLI reference only exposes Universal Packages publish/download commands under `az artifacts universal`, so the invalid CLI example was removed.
- The local authentication snippet included an invalid `az artifacts npm login` command and used `vsts-npm-auth` without the documented installation step. Replaced it with the documented Windows `vsts-npm-auth` setup and added the documented PAT-based note for macOS/Linux.
- The `npmAuthenticate@0` explanation said the token expires after the pipeline finishes. The task reference says it appends credentials and reverts the `.npmrc` file at the end of execution, so the explanation was corrected.
- The `package.json` example used `publishConfig.registry`, but Microsoft documentation states that using `publishConfig` to override the registry at publish time is not supported for Azure Artifacts. Removed `publishConfig` and clarified that publishing should rely on the project-level `.npmrc`.
- The UI source filter listed a generic "Upstream sources" option. Azure Artifacts filters saved npm packages by the source name such as `npmjs`, so the example was corrected.
- The dependency-confusion section claimed Azure Artifacts allows blocking specific packages from upstream sources. I could not verify that as a current Azure Artifacts feature in official docs, so it was replaced with the supported mitigation of configuring upstream sources and their order.
- The troubleshooting note about local/upstream version conflicts was clarified to say packages published directly to the feed take precedence over upstream packages.

## Review Notes
The remaining examples are intentionally illustrative and use placeholder organization, project, feed, package, and scope names. The pipeline examples assume the referenced `.npmrc` file exists at the configured path and that the build service identity has Feed Publisher permissions when publishing.
