# Validation Summary: How to Configure Azure Boards Sprint Burndown Charts and Velocity Tracking

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Boards
- Azure DevOps Analytics
- Sprint Burndown widget and in-context Burndown Trend report
- Velocity widget and in-context Velocity chart
- Azure Boards sprint capacity planning
- Azure DevOps Analytics views
- Power BI reporting for Azure DevOps

## Sources Consulted
- Microsoft Learn: Define iteration paths (sprints) and configure team iterations - https://learn.microsoft.com/en-us/azure/devops/organizations/settings/set-iteration-paths-sprints?view=azure-devops
- Microsoft Learn: Configure and monitor sprint burndown - https://learn.microsoft.com/en-us/azure/devops/report/dashboards/configure-sprint-burndown?view=azure-devops
- Microsoft Learn: View and configure team velocity - https://learn.microsoft.com/en-us/azure/devops/report/dashboards/team-velocity?view=azure-devops
- Microsoft Learn: Set the team sprint capacity in Azure Boards - https://learn.microsoft.com/en-us/azure/devops/boards/sprints/set-capacity?view=azure-devops
- Microsoft Learn: What is Analytics? - https://learn.microsoft.com/en-us/azure/devops/report/powerbi/what-is-analytics?view=azure-devops
- Microsoft Learn: Widgets based on Analytics data - https://learn.microsoft.com/en-us/azure/devops/report/dashboards/analytics-widgets?view=azure-devops
- Microsoft Learn: Manage Analytics views - https://learn.microsoft.com/en-us/azure/devops/report/powerbi/analytics-views-manage?view=azure-devops
- Microsoft Learn: About Analytics views - https://learn.microsoft.com/en-us/azure/devops/report/powerbi/what-are-analytics-views?view=azure-devops

## Issues Found
- The sprint setup navigation conflated project-level iteration creation with team iteration selection. Updated it to distinguish Project Settings > Project configuration > Iterations for sprint dates from Project Settings > Boards > Team Configuration > Iterations for team selection.
- The article stated that velocity cannot distinguish between sprints without dates. Updated this to the documented behavior: missing iteration dates can prevent the Velocity widget from showing useful data and may display a "Set iteration dates to use this widget" message.
- The in-context burndown location was described as the sprint board. Updated it to the sprint backlog path under Boards > Sprints > Analytics.
- The Story Points metric was described as the "effort field of user stories." Updated this to reflect process-specific estimation fields: Story Points for Agile, Effort for Scrum, and Size for CMMI.
- The Sprint Burndown widget configuration listed non-existent or misleading settings such as "Sprint" and "Show: Completed work, Total scope, Ideal trend." Updated the configuration example to match current widget options: team, backlogs/work items, burndown field, selected iteration, and advanced features.
- The Analytics refresh delay was described as "within a few hours." Updated it to the current Microsoft Analytics latency guidance of up to about 30 seconds.
- The Velocity widget configuration and chart categories included imprecise options and color descriptions. Updated these to match documented options and state categories: planned, completed, incomplete, and completed late work.

## Review Notes
The post is technically relevant and accurate after the edits. The examples are conceptual text snippets rather than executable code, so no command or API syntax validation was required.
