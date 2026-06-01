# Validation Summary: How to Configure AKS Maintenance Windows for Planned Node OS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- AKS planned maintenance windows
- Azure CLI
- AKS cluster auto-upgrade channels
- AKS node OS auto-upgrade channels
- Kubernetes PodDisruptionBudget
- Azure Monitor activity log alerts

## Sources Consulted
- Microsoft Learn: Use planned maintenance to schedule and control upgrades for AKS clusters: https://learn.microsoft.com/en-us/azure/aks/planned-maintenance
- Microsoft Learn: Azure CLI `az aks maintenanceconfiguration`: https://learn.microsoft.com/en-us/cli/azure/aks/maintenanceconfiguration
- Microsoft Learn: Automatically upgrade an AKS cluster: https://learn.microsoft.com/en-us/azure/aks/auto-upgrade-cluster
- Microsoft Learn: Autoupgrade node OS images: https://learn.microsoft.com/en-us/azure/aks/auto-upgrade-node-os-image
- Microsoft Learn: Azure CLI `az monitor activity-log alert`: https://learn.microsoft.com/en-us/cli/azure/monitor/activity-log/alert
- Kubernetes documentation: Disruptions and PodDisruptionBudgets: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/

## Issues Found
- The post used `nodeOSUpgrade` as the node OS maintenance type name. Changed it to the supported maintenance configuration name `aksManagedNodeOSUpgradeSchedule`.
- The post described `aksManagedAutoUpgradeSchedule` as covering Kubernetes upgrades, node image upgrades, and runtime updates. Narrowed this to Kubernetes version upgrades scheduled by AKS cluster auto-upgrade channels.
- The post described `default` as weekly node image updates or a catch-all window. Corrected it to AKS weekly releases for control plane components and system add-ons.
- The prerequisites referenced Kubernetes 1.24+ and Azure CLI 2.40+ with the `aks-preview` extension. Updated the prerequisites to match current AKS documentation, which recommends an existing AKS cluster and the latest Azure CLI.
- Weekly and relative monthly maintenance window commands omitted required recurrence interval flags. Added `--interval-weeks 1` and `--interval-months 1` where needed.
- The date exclusion example used invalid `--start-date` and `--end-date` flags for exclusions. Replaced it with a `--config-file` example using `notAllowedDates`.
- The auto-upgrade channel list did not identify `node-image` as legacy. Marked it as legacy and adjusted the description.
- The `Unmanaged` node OS channel description incorrectly said OS updates follow node image upgrades. Updated it to describe OS built-in patching and reboot responsibility.
- The `SecurityPatch` node OS channel description overstated that it avoids full node image updates. Updated it to note AKS-tested patches, possible live patching, and reimaging when required.
- The post recommended `SecurityPatch` for all production use. Reworded it to describe where it is useful and added the Windows node pool support caveat.
- The Azure Monitor alert command used two separate `--condition` flags. Combined them into one valid condition expression.

## Review Notes
The Azure CLI was not installed in the local environment, so command verification was done against current Microsoft Learn Azure CLI reference pages and AKS product documentation rather than local `az --help` output.
