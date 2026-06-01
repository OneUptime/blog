# Validation Summary: How to Configure Azure Repos Required Reviewers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Repos
- Azure DevOps branch policies
- Pull requests and code review policies
- Azure DevOps Policy REST API
- Python `requests`

## Sources Consulted
- Microsoft Learn: Git branch policies and settings - Azure Repos: https://learn.microsoft.com/en-us/azure/devops/repos/git/branch-policies?view=azure-devops
- Microsoft Learn: Branch policies - Azure Repos: https://learn.microsoft.com/en-us/azure/devops/repos/git/branch-policies-overview?view=azure-devops
- Microsoft Learn: Policy Configurations - Create - Azure DevOps REST API 7.1: https://learn.microsoft.com/en-us/rest/api/azure/devops/policy/configurations/create?view=azure-devops-rest-7.1
- Microsoft Learn: az repos policy approver-count: https://learn.microsoft.com/en-us/cli/azure/repos/policy/approver-count?view=azure-cli-latest

## Issues Found
1. The post implied Azure Repos has "code owner files." Azure Repos does not have a native GitHub-style CODEOWNERS file for reviewer assignment, so the wording was changed to "CODEOWNERS-style ownership rules."
2. The required reviewers explanation was too broad for groups. Microsoft documents that a required group can be satisfied by group member approvals, so the text now clarifies the group case.
3. Several path filter examples used root-level filenames without a leading `/` or wildcard, which Azure Repos path filters do not match. Updated examples such as `azure-pipelines.yml` and `Dockerfile` to `/azure-pipelines.yml` and `/Dockerfile`, and added a short note about valid path filter prefixes.
4. The REST API sample used an incorrect policy type ID for required reviewers. Updated it to the documented required reviewers type ID: `fd2167ab-b0be-447a-8ec8-39368250530e`.
5. The REST API sample used placeholder reviewer IDs named like generic IDs. Updated them to indicate GUID placeholders, matching the REST API's `requiredReviewerIds` expectations.
6. The vote reset section used option names and behavior that did not match current Azure Repos documentation. Replaced it with the documented options for approval iteration and vote reset behavior.
7. The review workflow said approvals from previous iterations are always reset after new pushes. Changed it to say Azure Repos enforces the configured vote or iteration policy.

## Review Notes
The post is now technically aligned with current Microsoft documentation for Azure Repos branch policies and the Azure DevOps Policy REST API. The UI labels in Azure DevOps can vary slightly between Azure DevOps Services and Azure DevOps Server versions, especially for approval iteration options.
