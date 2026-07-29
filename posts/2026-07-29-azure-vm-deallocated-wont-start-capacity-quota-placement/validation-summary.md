# Validation Summary: Why Won't a Deallocated Azure VM Start Again?

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- Microsoft Azure
- Azure Virtual Machines
- Azure CLI
- Azure Monitor Activity Log
- Azure compute quotas and regional capacity
- Availability Zones and availability sets
- Virtual Machine Scale Sets
- Proximity placement groups
- Accelerated Networking
- Ephemeral OS disks, Ultra Disk, and Premium SSD v2
- Azure Dedicated Host
- Azure Spot Virtual Machines
- On-demand Capacity Reservation and Azure Reservations

## Sources Consulted

- [Troubleshoot Azure VM allocation failures](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/allocation-failure)
- [States and billing status of Azure Virtual Machines](https://learn.microsoft.com/en-us/azure/virtual-machines/states-billing)
- [Check Azure VM vCPU quotas](https://learn.microsoft.com/en-us/azure/virtual-machines/quotas)
- [Azure CLI reference: `az monitor activity-log`](https://learn.microsoft.com/en-us/cli/azure/monitor/activity-log?view=azure-cli-latest)
- [Azure Monitor Activity Log](https://learn.microsoft.com/en-us/azure/azure-monitor/platform/activity-log)
- [Azure CLI reference: `az vm`](https://learn.microsoft.com/en-us/cli/azure/vm?view=azure-cli-latest)
- [Azure CLI reference: `az network nic`](https://learn.microsoft.com/en-us/cli/azure/network/nic?view=azure-cli-latest)
- [Resolve errors for SKU not available](https://learn.microsoft.com/en-us/azure/azure-resource-manager/troubleshooting/error-sku-not-available)
- [Availability sets overview](https://learn.microsoft.com/en-us/azure/virtual-machines/availability-set-overview)
- [Proximity placement groups](https://learn.microsoft.com/en-us/azure/virtual-machines/co-location)
- [Manage Accelerated Networking for Azure Virtual Machines](https://learn.microsoft.com/en-us/azure/virtual-network/manage-accelerated-networking)
- [About Azure Spot Virtual Machines](https://learn.microsoft.com/en-us/azure/virtual-machines/spot-vms)
- [On-demand Capacity Reservation overview](https://learn.microsoft.com/en-us/azure/virtual-machines/capacity-reservation-overview)
- [Overview of Azure Dedicated Hosts](https://learn.microsoft.com/en-us/azure/virtual-machines/dedicated-hosts)

## Issues Found

- The deallocation explanation implied that no compute capacity remains billed or reserved. Clarified that the VM's own compute allocation and billing stop, while a separately provisioned Dedicated Host remains billed and an on-demand Capacity Reservation remains billed and preserves reserved capacity.
- The placement inventory command returned only VM-side network interface references, so it did not expose the NIC-level `enableAcceleratedNetworking` setting. Added a full NIC lookup with `az network nic show`, and expanded the VM query to include availability-set, scale-set, Dedicated Host, host-group, and network-interface identifiers.
- The capacity-reservation recommendation did not mention that the feature is incompatible with several placement models discussed in the guide. Qualified the recommendation and documented the current exclusions for Spot VMs, availability sets, Dedicated Hosts, proximity placement groups, Ultra Disk, and single-placement-group scale sets.

## Review Notes

- The Azure CLI commands and flags are current and non-deprecated. Their syntax was checked against both the installed Azure CLI 2.71.0 help output and the current Microsoft Learn CLI reference.
- `az vm list-skus --all` reports subscription and zonal restrictions but is not a real-time capacity guarantee; the post already states this correctly.
- A zonal VM cannot be moved to another zone by directly editing its zone property. The post correctly points readers toward recreation from copied disks or a supported migration workflow.
- On-demand Capacity Reservation availability is governed by its applicable SLA and requires a matching, unused reserved unit for a supported VM configuration.
