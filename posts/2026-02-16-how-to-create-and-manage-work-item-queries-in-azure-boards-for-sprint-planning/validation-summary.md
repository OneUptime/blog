# Validation Summary: How to Create and Manage Work Item Queries in Azure Boards for Sprint Planning

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Boards
- Azure DevOps work item queries
- WIQL
- Azure DevOps Work Item Tracking REST API
- Bash, curl, and jq
- Azure DevOps dashboards, query charts, and notifications

## Sources Consulted
- Microsoft Learn: Use managed queries to list work items - https://learn.microsoft.com/en-us/azure/devops/boards/queries/about-managed-queries?view=azure-devops
- Microsoft Learn: Define a work item query in Azure Boards - https://learn.microsoft.com/en-us/azure/devops/boards/queries/using-queries?view=azure-devops
- Microsoft Learn: Query by area or iteration path - https://learn.microsoft.com/en-us/azure/devops/boards/queries/query-by-area-iteration-path?view=azure-devops
- Microsoft Learn: Work Item Query Language (WIQL) syntax reference - https://learn.microsoft.com/en-us/azure/devops/boards/queries/wiql-syntax?view=azure-devops
- Microsoft Learn: Status and trend work item, query-based charts - https://learn.microsoft.com/en-us/azure/devops/report/dashboards/charts?view=azure-devops
- Microsoft Learn: Query By Wiql REST API - https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/wiql/query-by-wiql?view=azure-devops-rest-7.1
- Microsoft Learn: Work Items - List REST API - https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/list?view=azure-devops-rest-7.1
- Microsoft Learn: About notifications - https://learn.microsoft.com/en-us/azure/devops/organizations/notifications/about-notifications?view=azure-devops

## Issues Found
- The WIQL link query used `Source.[Field]` and `Target.[Field]` prefixes, which do not match documented WIQL link-query syntax. Changed them to `[Source].[Field]` and `[Target].[Field]`.
- The WIQL link query used the friendly link value `Related`. Changed it to the documented system link type name `System.LinkTypes.Related`.
- The WIQL example claimed to find work completed in the last two sprints, but the query only filtered under one explicit sprint path. Updated the surrounding sentence to match the query behavior.
- The WIQL link query used `MODE (MayContain)`, which can include source work items without matching target bugs. Changed it to `MODE (MustContain)` so the query matches the stated behavior.
- The REST example used API version `7.0` while the current documented Work Item Tracking REST examples use `7.1`. Updated the endpoint to `api-version=7.1`.
- The REST example used the `@CurrentIteration - 1` web query macro directly in WIQL sent to the REST API. Microsoft documentation notes that direct WIQL/REST calls require explicit iteration paths, so the script now uses an explicit `PREVIOUS_ITERATION` path.
- The REST example said it output a table, but it only printed IDs from the WIQL result. Updated it to use the documented two-step pattern: query IDs with WIQL, then fetch work item fields and output tab-separated rows.
- The tip about "query-based alerts" implied Azure DevOps sends notifications when new items match a saved query. Updated it to describe notification subscriptions with matching filters, which aligns with Azure DevOps notification documentation.

## Review Notes
Most query-builder examples are technically valid but depend on the team's process template and customized workflow states. For example, `Done`, `Closed`, `Removed`, `Resolved`, and `Ready for Review` might need adjustment in a real Azure DevOps project.
