# Validation Summary: How to Move Azure Subscriptions Between Management Groups

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Management Groups
- Azure subscriptions
- Azure RBAC
- Azure Policy
- Microsoft Cost Management budgets
- Azure Blueprints
- Azure CLI
- Azure PowerShell
- Azure Resource Manager REST API

## Sources Consulted
- Microsoft Learn: Manage your Azure subscriptions at scale with management groups - https://learn.microsoft.com/en-us/azure/governance/management-groups/manage
- Microsoft Learn: Organize your resources with Azure management groups - https://learn.microsoft.com/en-us/azure/governance/management-groups/overview
- Microsoft Learn: Azure CLI `az account management-group subscription` - https://learn.microsoft.com/en-us/cli/azure/account/management-group/subscription
- Microsoft Learn: Azure CLI `az account management-group` - https://learn.microsoft.com/en-us/cli/azure/account/management-group
- Microsoft Learn: Azure CLI `az policy assignment` - https://learn.microsoft.com/en-us/cli/azure/policy/assignment
- Microsoft Learn: Azure CLI `az role assignment` - https://learn.microsoft.com/en-us/cli/azure/role/assignment
- Microsoft Learn: Azure CLI `az policy state` - https://learn.microsoft.com/en-us/cli/azure/policy/state
- Microsoft Learn: `New-AzManagementGroupSubscription` - https://learn.microsoft.com/en-us/powershell/module/az.resources/new-azmanagementgroupsubscription
- Microsoft Learn: Management Group Subscriptions - Create REST API - https://learn.microsoft.com/en-us/rest/api/managementgroups/management-group-subscriptions/create
- Microsoft Learn: Hierarchy Settings - Create Or Update REST API - https://learn.microsoft.com/en-us/rest/api/managementgroups/hierarchy-settings/create-or-update
- Microsoft Learn: Understand and work with Cost Management scopes - https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/understand-work-scopes
- Microsoft Learn: Azure built-in roles for Management and governance - https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/management-and-governance
- Microsoft Learn: Azure Blueprints deprecation notice - https://learn.microsoft.com/en-us/azure/governance/blueprints/overview

## Issues Found
- The prerequisites understated the permissions required to move a subscription between management groups. Updated the list to include the required child subscription permissions, target parent permission, and current parent permission documented by Microsoft.
- The practical permissions guidance incorrectly stated that Management Group Contributor at both source and target plus Reader on the subscription is sufficient. Updated it to recommend Owner on the subscription plus Contributor or Management Group Contributor on the source and target management groups, with the documented inherited Owner limitation.
- The current policy assignment command claimed to include inherited assignments but did not use the documented `--disable-scope-strict-match` option. Added `--disable-scope-strict-match true`.
- The target policy query assumed every policy assignment has a parameter named `effect`. Replaced it with `enforcementMode`, which is a policy assignment property.
- The compliance pre-check implied the shown command could evaluate the subscription against target management group policies before the move. Updated the wording to say it checks current compliance and should be compared with target assignments.
- The REST API examples used `api-version=2021-04-01`, while the official Management Groups REST documentation for these operations uses `2020-05-01`. Updated both REST URLs.
- The move verification command used `az account management-group show` without expanding children. Replaced it with the direct `az account management-group subscription show` command.
- The post-move compliance query labeled `results.nonCompliantResources` as `compliant`. Renamed the output field to `nonCompliantResources`.

## Review Notes
Azure CLI was not installed in the local workspace, so CLI syntax was validated against official Microsoft Learn command documentation rather than local `az --help` output. Azure Blueprints is still documented but has a scheduled deprecation date of July 11, 2026; future updates should recommend Template Specs and Deployment Stacks for new governance deployments.
