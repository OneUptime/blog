# Validation Summary: How to Configure Azure Boards to Integrate with GitHub Repositories

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Boards
- Azure DevOps Services
- GitHub repositories
- GitHub pull requests and commits
- Azure Boards app for GitHub
- Azure DevOps Work Item Tracking REST API
- Git CLI
- curl

## Sources Consulted
- Microsoft Learn: Connect Azure Boards to GitHub, https://learn.microsoft.com/en-us/azure/devops/boards/github/connect-to-github?view=azure-devops
- Microsoft Learn: Azure Boards-GitHub integration overview, https://learn.microsoft.com/en-us/azure/devops/boards/github/?view=azure-devops
- Microsoft Learn: Install the Azure Boards app for GitHub, https://learn.microsoft.com/en-us/azure/devops/boards/github/install-github-app?view=azure-devops
- Microsoft Learn: Link GitHub commits, pull requests, branches, and issues to work items in Azure Boards, https://learn.microsoft.com/en-us/azure/devops/boards/github/link-to-from-github?view=azure-devops
- Microsoft Learn: Work Items - Get Work Item REST API, https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/get-work-item?view=azure-devops-rest-7.1
- Git documentation: git-checkout, https://git-scm.com/docs/git-checkout

## Issues Found
- Corrected the pull request linking guidance. The post said `AB#` references in PR titles or descriptions are picked up, but Microsoft documentation says formal work item links are created from PR descriptions, not PR titles or comments.
- Replaced the state-transition configuration section. The post described configurable state mappings for PR opened, merged, and closed events, but current Azure Boards behavior is keyword-driven: state names, state categories, or `fix`/`fixes`/`fixed` keywords before an `AB#` reference can transition work items, and transition rules apply when the pull request is merged into the default branch.
- Corrected branch creation guidance. The post said the GitHub integration does not create branches for you automatically, but Azure Boards can create a GitHub branch from a work item and link it back to that work item.
- Updated troubleshooting guidance that pointed users to GitHub webhook delivery logs. The documented troubleshooting path is to verify repository access and check the Azure DevOps GitHub connections page for lost credentials or access warnings.
- Adjusted the GitHub permissions section to match the documented Azure Boards app behavior, including read access to repositories and read/write Checks permissions for pull request insights. Added the documented PAT scopes for PAT-based connections.
- Updated the REST API example from `api-version=7.0` to the current documented Work Item Tracking REST API version, `7.1`.

## Review Notes
The Git commands and `curl -u :$AZURE_PAT` authentication pattern are syntactically valid. The post is now technically aligned with current Microsoft Learn documentation as of 2026-06-01.
