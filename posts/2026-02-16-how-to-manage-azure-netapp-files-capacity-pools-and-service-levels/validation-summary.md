# Validation Summary: How to Manage Azure NetApp Files Capacity Pools and Service Levels

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure NetApp Files
- Azure CLI
- Azure Monitor metrics
- NFS volumes
- Capacity pools and QoS types

## Sources Consulted
- Microsoft Learn: Service levels for Azure NetApp Files, https://learn.microsoft.com/en-us/azure/azure-netapp-files/azure-netapp-files-service-levels
- Microsoft Learn: Create a capacity pool for Azure NetApp Files, https://learn.microsoft.com/en-us/azure/azure-netapp-files/azure-netapp-files-set-up-capacity-pool
- Microsoft Learn: Resource limits for Azure NetApp Files, https://learn.microsoft.com/en-us/azure/azure-netapp-files/azure-netapp-files-resource-limits
- Microsoft Learn: Dynamically change the service level of an Azure NetApp Files volume, https://learn.microsoft.com/en-us/azure/azure-netapp-files/dynamic-change-volume-service-level
- Microsoft Learn: Metrics for Azure NetApp Files, https://learn.microsoft.com/en-us/azure/azure-netapp-files/azure-netapp-files-metrics
- Microsoft Learn: Supported metrics for Microsoft.NetApp/netAppAccounts/capacityPools, https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-netapp-netappaccounts-capacitypools-metrics
- Microsoft Learn Azure CLI reference: az netappfiles pool, https://learn.microsoft.com/en-us/cli/azure/netappfiles/pool?view=azure-cli-latest
- Microsoft Learn Azure CLI reference: az netappfiles volume, https://learn.microsoft.com/en-us/cli/azure/netappfiles/volume?view=azure-cli-latest
- Microsoft Learn Azure CLI reference: az monitor metrics, https://learn.microsoft.com/en-us/cli/azure/monitor/metrics?view=azure-cli-latest

## Issues Found
- The post described Azure NetApp Files service levels as only Standard, Premium, and Ultra. Current Microsoft documentation also lists Flexible and Elastic, so the capacity pool model wording was updated while keeping the table focused on the common Standard, Premium, and Ultra levels used by the examples.
- The post stated that the minimum capacity pool size is 4 TiB for all service levels and the maximum is 500 TiB. Current Azure NetApp Files documentation lists a 1 TiB minimum when all volumes use Standard network features, a 4 TiB minimum if any volume uses Basic network features, and a 2,048 TiB maximum. The limits were corrected.
- The cost optimization script toggled a volume from Premium to Ultra during business hours and back to Premium at night. Microsoft documents a required 24-hour wait before moving back to a lower service level after moving to a higher service level. The example was changed to a weekly high-performance window and the cooldown caveat was added.

## Review Notes
The Azure CLI command names and flags used in the post match the current Microsoft Learn CLI reference, including `az netappfiles pool create`, `az netappfiles pool update`, `az netappfiles volume create`, `az netappfiles volume pool-change`, `--qos-type`, `--usage-threshold`, `--throughput-mibps`, and the Azure Monitor `--metric` usage. The local environment did not have Azure CLI installed, so command validation was performed against the official CLI reference rather than local `az --help` output.
