# Validation Summary: How to Set Up Autoscaling for Azure Virtual Desktop Session Hosts Based

## Status
validated

## Post Type
Technical tutorial

## Technologies Covered
- Azure Virtual Desktop
- Azure Virtual Desktop autoscale scaling plans
- Azure PowerShell Az.DesktopVirtualization module
- Azure CLI role assignment and VM tagging
- ARM template scaling plan schedule configuration
- Azure Monitor activity logs

## Sources Consulted
- Microsoft Learn: Create and assign an autoscale scaling plan for Azure Virtual Desktop - https://learn.microsoft.com/en-us/azure/virtual-desktop/autoscale-create-assign-scaling-plan
- Microsoft Learn: Autoscale glossary for Azure Virtual Desktop - https://learn.microsoft.com/en-us/azure/virtual-desktop/autoscale-glossary
- Microsoft Learn: Azure Virtual Desktop autoscale FAQ - https://learn.microsoft.com/en-us/azure/virtual-desktop/autoscale-faq
- Microsoft Learn: Troubleshoot autoscale issues in Azure Virtual Desktop - https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-desktop/troubleshoot-autoscale
- Microsoft Learn: Assign Azure RBAC roles or Microsoft Entra roles to a service principal - https://learn.microsoft.com/en-us/azure/virtual-desktop/service-principal-assign-roles
- Microsoft Learn: New-AzWvdScalingPlan - https://learn.microsoft.com/en-us/powershell/module/az.desktopvirtualization/new-azwvdscalingplan
- Microsoft Learn: Update-AzWvdScalingPlan - https://learn.microsoft.com/en-us/powershell/module/az.desktopvirtualization/update-azwvdscalingplan
- Microsoft Learn: New-AzWvdScalingPlanPooledSchedule - https://learn.microsoft.com/en-us/powershell/module/az.desktopvirtualization/new-azwvdscalingplanpooledschedule
- Microsoft Learn: Microsoft.DesktopVirtualization/scalingPlans ARM template reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.desktopvirtualization/2025-10-10/scalingplans
- Microsoft Learn: az desktopvirtualization Azure CLI reference - https://learn.microsoft.com/en-us/cli/azure/desktopvirtualization

## Issues Found
- The post used `az desktopvirtualization scaling-plan create` and `az desktopvirtualization scaling-plan update`, but the current Microsoft Azure CLI reference does not expose a `scaling-plan` command group. Replaced those examples with documented `New-AzWvdScalingPlan` and `Update-AzWvdScalingPlan` PowerShell examples.
- The post recommended scoping the autoscale power-management role to a resource group for tighter security. Microsoft autoscale setup documentation says to assign `Desktop Virtualization Power On Off Contributor` at the subscription scope that contains the host pool and session hosts. Removed the resource-group example and clarified subscription-scope guidance.
- The post described capacity threshold as a percentage of used sessions. Microsoft defines it as used host pool capacity against available host pool capacity. Updated the explanation and ramp-up example wording.
- The schedule examples included unsupported ARM fields: `peakMinimumHostsPct`, `peakCapacityThresholdPct`, `offPeakMinimumHostsPct`, and `offPeakCapacityThresholdPct`. Removed those fields and clarified that peak uses ramp-up threshold behavior and off-peak uses ramp-down threshold behavior.
- The post said `ZeroSessions` means VMs have no active sessions. Corrected the prose to say no sessions, and clarified that connected and disconnected sessions affect whether hosts can shut down.

## Review Notes
Azure CLI was not installed in the local environment, so CLI-specific checks were verified against Microsoft Learn rather than local `az --help`. The post remains focused on power management autoscaling for pooled host pools; dynamic autoscaling is in preview and was not added because that would change the scope of the article.
