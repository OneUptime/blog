# Validation Summary: How to Set Up Azure Boards GitHub Integration to Link Commits

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Boards
- Azure DevOps
- GitHub
- Azure Boards GitHub app
- Git
- Azure DevOps Work Item Tracking REST API
- Mermaid

## Sources Consulted
- Microsoft Learn: Connect Azure Boards to GitHub - https://learn.microsoft.com/en-us/azure/devops/boards/github/connect-to-github?view=azure-devops
- Microsoft Learn: Install the Azure Boards App for GitHub - https://learn.microsoft.com/en-us/azure/devops/boards/github/install-github-app?view=azure-devops
- Microsoft Learn: Link GitHub commits, pull requests, branches, and issues to work items in Azure Boards - https://learn.microsoft.com/en-us/azure/devops/boards/github/link-to-from-github?view=azure-devops
- Microsoft Learn: Automate work item completion with pull requests - https://learn.microsoft.com/en-us/azure/devops/boards/work-items/auto-complete-work-items-pull-requests?view=azure-devops
- Microsoft Learn: Add status badges for your GitHub repo - https://learn.microsoft.com/en-us/azure/devops/boards/github/configure-status-badges?view=azure-devops
- Microsoft Learn: Link work items to objects - https://learn.microsoft.com/en-us/azure/devops/boards/backlogs/add-link?view=azure-devops
- Microsoft Learn: Query work items by link or attachment count - https://learn.microsoft.com/en-us/azure/devops/boards/queries/linking-attachments?view=azure-devops
- Microsoft Learn: Work Items - Get Work Item REST API - https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/get-work-item
- Git documentation: git-commit - https://git-scm.com/docs/git-commit

## Issues Found
- The post said `AB#` references in a pull request title create Azure Boards links. Microsoft documentation states that pull request links are created from the PR description, and that `AB#ID` in a PR title or comment does not create a work item link. Updated the introduction, PR section, example, and best-practice guidance to use the PR description.
- The setup path placed GitHub connections under Project Settings > Boards > GitHub connections. Current Microsoft documentation places this under Project Settings > GitHub connections. Updated both occurrences.
- The work item automation section described board-level column-to-state mapping and PR-created/PR-closed transitions. Microsoft documentation describes automatic completion during PR completion, the "Complete linked work items after merging" option, repository settings, and state-transition syntax in the PR description. Rewrote that section to match documented behavior.
- The branch naming section said branch names do not automatically create links. Microsoft documentation supports GitHub branch links created from Azure Boards work items and automatic updates when PRs are created from linked branches. Updated the wording to distinguish linked branches from manual naming conventions.
- The querying section used a non-documented "Development Link = Pull Request (exists)" query filter. Microsoft documentation recommends link-count fields and direct-link queries for this kind of analysis. Updated the example to use `External Link Count > 0`.
- The status badge section said badges show work item or sprint status. Microsoft documentation describes board status badges based on board columns. Updated the wording.

## Review Notes
The Git commit examples use valid `git commit -m` syntax, including a multi-line message accepted by the shell. The REST API example uses the documented work item endpoint with `$expand=relations`; filtering exact GitHub relation types may need adjustment for a team's specific returned relation attributes, but the endpoint and approach are valid.
