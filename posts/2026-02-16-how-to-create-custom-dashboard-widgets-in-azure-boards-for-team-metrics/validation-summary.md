# Validation Summary: How to Create Custom Dashboard Widgets in Azure Boards for Team Metrics

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Azure Boards dashboards and widgets
- Azure DevOps work item queries and WIQL
- Azure DevOps Analytics widgets
- Azure DevOps REST API
- Bash, curl, and jq

## Sources Consulted
- Microsoft Learn: Configure and monitor sprint burndown - https://learn.microsoft.com/en-us/azure/devops/report/dashboards/configure-sprint-burndown?view=azure-devops
- Microsoft Learn: Analytics widgets overview for Azure DevOps - https://learn.microsoft.com/en-us/azure/devops/report/dashboards/analytics-widgets?view=azure-devops
- Microsoft Learn: Configure a chart for work items widget - https://learn.microsoft.com/en-us/azure/devops/report/dashboards/configure-chart-work-items-widget?view=azure-devops
- Microsoft Learn: Track progress with status and trend query-based charts - https://learn.microsoft.com/en-us/azure/devops/report/dashboards/charts?view=azure-devops
- Microsoft Learn: Query by date or current iteration - https://learn.microsoft.com/en-us/azure/devops/boards/queries/query-by-date-or-current-iteration?view=azure-devops
- Microsoft Learn: Query by area or iteration path - https://learn.microsoft.com/en-us/azure/devops/boards/queries/query-by-area-iteration-path?view=azure-devops
- Microsoft Learn: WIQL syntax reference - https://learn.microsoft.com/en-us/azure/devops/boards/queries/wiql-syntax?view=azure-devops
- Microsoft Learn: Query by numeric fields - https://learn.microsoft.com/en-us/azure/devops/boards/queries/query-numeric?view=azure-devops
- Microsoft Learn: WIQL REST API - https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/wiql?view=azure-devops-rest-7.1
- Microsoft Learn: Work Items - List REST API - https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/list?view=azure-devops-rest-7.1
- Microsoft Learn: Team iterations REST API - https://learn.microsoft.com/en-us/rest/api/azure/devops/work/iterations/list?view=azure-devops-rest-7.1
- Microsoft Learn: Monitor pipelines with dashboard widgets - https://learn.microsoft.com/en-us/azure/devops/pipelines/reports/pipeline-widgets?view=azure-devops
- Microsoft Learn: Manage and organize queries - https://learn.microsoft.com/en-us/azure/devops/boards/queries/organize-queries?view=azure-devops

## Issues Found
- The Bug Trend query used `@StartOfIteration`, which is not a supported WIQL date macro. Changed the example to use `Iteration Path = @CurrentIteration` and added a note that created-after-sprint-start queries need an explicit sprint start date.
- The Bug Trend chart instructions said to group by Created Date and stack by Priority. Microsoft documents that work item query charts cannot group by date-time fields, so the instructions now use a Trend chart with count aggregation.
- The Sprint Progress query only used `State = Done`, which misses completed items in processes that use `Closed`. Changed it to `State IN (Done, Closed)`.
- The Unestimated Stories tile described querying for `0` story points. Azure Boards represents unestimated numeric fields as blank, so the text now says to query for blank Story Points.
- The REST API script used `@CurrentIteration` directly in WIQL and API version `7.0`. Updated the script to fetch the team's current iteration path through the Work API, use that explicit path in WIQL, and call Azure DevOps REST API version `7.1`.
- The REST API script said it calculated cycle time but only printed activated and closed dates. Updated it to calculate per-item cycle time and average cycle time in days.

## Review Notes
- The post remains accurate as a practical Azure DevOps dashboard guide after the fixes. Teams using Scrum, Agile, or customized processes may need to swap fields such as Story Points, Effort, Size, Done, or Closed to match their process configuration.
