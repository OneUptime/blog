# Validation Summary: How to Enable Automatic OS Image Upgrades on Azure VM Scale Sets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Virtual Machine Scale Sets
- Automatic OS image upgrades
- Azure CLI
- ARM templates
- Azure Compute Gallery
- Azure Monitor activity log alerts
- Azure Maintenance control
- Linux shell scripting

## Sources Consulted
- Microsoft Learn: Azure Virtual Machine Scale Set automatic OS image upgrades - https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/virtual-machine-scale-sets-automatic-upgrade
- Microsoft Learn: Configure rolling upgrades on Virtual Machine Scale Sets - https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/virtual-machine-scale-sets-configure-rolling-upgrades
- Microsoft Learn: Using Application Health extension with Virtual Machine Scale Sets - https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/virtual-machine-scale-sets-health-extension
- Microsoft Learn: Microsoft.Compute/virtualMachineScaleSets 2023-07-01 ARM template reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.compute/2023-07-01/virtualmachinescalesets
- Microsoft Learn: Azure CLI az vmss reference - https://learn.microsoft.com/en-us/cli/azure/vmss?view=azure-cli-latest
- Microsoft Learn: Azure CLI az vmss rolling-upgrade reference - https://learn.microsoft.com/en-us/cli/azure/vmss/rolling-upgrade?view=azure-cli-latest
- Microsoft Learn: Azure CLI az monitor activity-log alert reference - https://learn.microsoft.com/en-us/cli/azure/monitor/activity-log/alert?view=azure-cli-latest
- Microsoft Learn: Azure RBAC Compute permissions - https://learn.microsoft.com/en-us/azure/role-based-access-control/permissions/compute
- Microsoft Learn: Maintenance control for Azure Virtual Machine Scale Sets - https://learn.microsoft.com/en-us/azure/virtual-machines/virtual-machine-scale-sets-maintenance-control
- Microsoft Learn: ImageReference interface notes for Azure Compute Gallery latest image references - https://learn.microsoft.com/en-us/javascript/api/@azure/arm-compute/imagereference

## Issues Found
- The prerequisites incorrectly said the VMSS upgrade policy must be Rolling or Automatic and that Manual is incompatible. Microsoft documents upgrade policy mode and automatic OS upgrade policy as separate settings; automatic OS upgrades use rolling upgrade policy settings, and Manual mode requires bringing VMs to the latest scale set model after enabling. Updated the prerequisite accordingly.
- The prerequisites omitted the documented requirement that the image version be set to `latest`. Added it to the prerequisite list.
- The supported image wording used the older "Shared Image Gallery" name and did not say platform images must be supported SKUs. Updated wording to "supported platform image" and "Azure Compute Gallery image."
- The prerequisites omitted the documented Windows requirement that `enableAutomaticUpdates` be false. Added a concise Windows configuration prerequisite.
- The post claimed Azure detects new platform image versions within 24 hours. Microsoft documents the availability-first rollout process and up to 3 hours for the first rollout after enabling, but does not support a general 24-hour detection claim. Reworded this to describe regional eligibility through the availability-first rollout process.
- The activity log alert example used `Microsoft.Compute/virtualMachineScaleSets/rollingUpgrades/action`, which Microsoft RBAC documentation describes as canceling a rolling upgrade. Updated it to `Microsoft.Compute/virtualMachineScaleSets/osRollingUpgrade/action`, which starts an OS rolling upgrade.
- The maintenance section said Azure does not provide a built-in maintenance window for automatic OS image upgrades. Microsoft documents Maintenance control for Uniform VM scale sets. Updated the section to mention Maintenance control and retained the scheduled enable/disable workaround as an approximation when not using it.
- The platform vs. custom gallery section used the older "Shared Image Gallery" naming. Updated it to "Azure Compute Gallery images."

## Review Notes
- Azure CLI was not installed in the local environment, so CLI syntax was verified against Microsoft Learn CLI reference pages rather than local `az --help` output.
- Automatic OS image upgrades for VMSS Flexible orchestration mode are documented as preview, with additional requirements and limitations. The post mostly uses Uniform-style examples, so no broader rewrite was made.
