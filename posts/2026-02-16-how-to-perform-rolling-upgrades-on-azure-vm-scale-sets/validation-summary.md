# Validation Summary: How to Perform Rolling Upgrades on Azure VM Scale Sets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Virtual Machine Scale Sets
- Azure CLI
- VM Scale Set rolling upgrade policies
- Azure Load Balancer health probes
- Azure Application Health Extension
- GitHub Actions

## Sources Consulted
- Microsoft Learn: Configure rolling upgrades on Virtual Machine Scale Sets - https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/virtual-machine-scale-sets-configure-rolling-upgrades
- Microsoft Learn: Set the upgrade policy mode on Virtual Machine Scale Sets - https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/virtual-machine-scale-sets-set-upgrade-policy
- Microsoft Learn: Change the upgrade policy mode on Virtual Machine Scale Sets - https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/virtual-machine-scale-sets-change-upgrade-policy
- Microsoft Learn: Modify an Azure Virtual Machine Scale Set - https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/virtual-machine-scale-sets-upgrade-scale-set
- Microsoft Learn: Using Application Health extension with Virtual Machine Scale Sets - https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/virtual-machine-scale-sets-health-extension
- Microsoft Learn: Azure VM Scale Set automatic OS image upgrades - https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/virtual-machine-scale-sets-automatic-upgrade
- Microsoft Learn Azure CLI reference: az vmss - https://learn.microsoft.com/en-us/cli/azure/vmss
- Microsoft Learn Azure CLI reference: az vmss rolling-upgrade - https://learn.microsoft.com/en-us/cli/azure/vmss/rolling-upgrade

## Issues Found
- Corrected the health monitoring guidance to distinguish Uniform orchestration, which can use a load balancer health probe or Application Health Extension, from Flexible orchestration, which requires Application Health Extension for rolling upgrades.
- Added the documented `az vmss update-instances --instance-ids "*"` step after adding the Application Health Extension, because existing Manual-mode instances must be updated to install the extension from the scale set model.
- Corrected the rollback guidance. Reimaging alone does not roll an instance back unless the scale set model has already been reverted, so the post now instructs reverting the model first and updating selected instances to that reverted model.
- Replaced the automatic repairs grace-period example with an Application Health Extension rich-health-states grace-period example. `automaticRepairsPolicy.gracePeriod` controls repair timing, not rolling-upgrade health initialization.
- Replaced the GitHub Actions example's use of `${{ github.sha }}` as an Azure image version with a published image version environment variable, because Azure platform and gallery image versions are not arbitrary commit SHAs.

## Review Notes
The Azure CLI was not installed locally, so CLI command validation was performed against the current Microsoft Learn Azure CLI reference instead of local `az --help` output.
