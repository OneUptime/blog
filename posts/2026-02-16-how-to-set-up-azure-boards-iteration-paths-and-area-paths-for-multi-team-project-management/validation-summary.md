# Validation Summary: How to Set Up Azure Boards Iteration Paths

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Boards
- Azure DevOps
- Azure DevOps CLI
- Azure CLI azure-devops extension
- Bash scripting

## Sources Consulted
- Microsoft Learn: Define area paths and assign to a team - https://learn.microsoft.com/en-us/azure/devops/organizations/settings/set-area-paths?view=azure-devops
- Microsoft Learn: Define iteration paths (sprints) and configure team iterations - https://learn.microsoft.com/en-us/azure/devops/organizations/settings/set-iteration-paths-sprints?view=azure-devops
- Microsoft Learn: Azure CLI `az boards area project` reference - https://learn.microsoft.com/en-us/cli/azure/boards/area/project?view=azure-cli-lts
- Microsoft Learn: Azure CLI `az boards iteration project` reference - https://learn.microsoft.com/en-us/cli/azure/boards/iteration/project?view=azure-cli-lts
- Microsoft Learn: Azure CLI `az devops team` reference - https://learn.microsoft.com/en-us/cli/azure/devops/team?view=azure-cli-latest
- Microsoft Learn: Create or add a team - https://learn.microsoft.com/en-us/azure/devops/organizations/settings/add-teams?view=azure-devops
- Microsoft Learn: Configure your backlog view in Azure Boards - https://learn.microsoft.com/en-us/azure/devops/boards/backlogs/configure-your-backlog-view?view=azure-devops

## Issues Found
- The Azure DevOps CLI examples for creating child area paths used paths like `\\MyProject\\Backend`. Microsoft Learn documents project-level area CLI paths with the internal `Area` classification segment, so these were changed to paths like `\\MyProject\\Area\\Backend`.
- The Azure DevOps CLI examples for creating child iteration paths used paths like `\\MyProject\\2026-Q1`. Microsoft Learn documents project-level iteration CLI paths with the internal `Iteration` classification segment, so these were changed to paths like `\\MyProject\\Iteration\\2026-Q1`.
- The iteration hierarchy example used sprint dates that did not match the later CLI examples and script. The example dates were updated to match the Monday-to-Friday two-week sprint ranges used in the commands.
- The post stated that each iteration needs start and end dates to appear on the sprint board. Azure Boards visibility depends on the team's selected iteration paths; dates are used for scheduling, time frames, and reporting. The sentence was revised to state that sprint iterations should have dates for scheduling and time-based reporting.

## Review Notes
- The Azure DevOps CLI was not installed in the local environment, so command verification was performed against current Microsoft Learn CLI reference pages rather than local `az --help` output.
- Azure DevOps CLI commands are documented as unsupported for Azure DevOps Server; the post examples are appropriate for Azure DevOps Services.
