# Validation Summary: Fix Azure VM OverconstrainedAllocationRequest Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Microsoft Azure
- Azure Virtual Machines
- Azure Virtual Machine Scale Sets
- Azure CLI
- Azure Resource Manager deployments
- Azure Monitor Activity Log
- Availability Zones and Availability Sets
- Proximity Placement Groups
- Accelerated Networking
- Ephemeral OS disks
- Ultra Disk and Premium SSD v2
- On-demand Capacity Reservations

## Sources Consulted
- [Troubleshoot Azure VM allocation failures](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/allocation-failure)
- [View Azure Resource Manager deployment history](https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/deployment-history)
- [Resolve SKU not available errors](https://learn.microsoft.com/en-us/azure/azure-resource-manager/troubleshooting/error-sku-not-available)
- [Azure Activity Log](https://learn.microsoft.com/en-us/azure/azure-monitor/platform/activity-log)
- [Azure CLI: `az deployment operation group`](https://learn.microsoft.com/en-us/cli/azure/deployment/operation/group)
- [Azure CLI: `az vm`](https://learn.microsoft.com/en-us/cli/azure/vm)
- [Proximity placement groups](https://learn.microsoft.com/en-us/azure/virtual-machines/co-location)
- [Accelerated Networking overview](https://learn.microsoft.com/en-us/azure/virtual-network/accelerated-networking-overview)
- [Manage Accelerated Networking](https://learn.microsoft.com/en-us/azure/virtual-network/manage-accelerated-networking)
- [Ephemeral OS disks](https://learn.microsoft.com/en-us/azure/virtual-machines/ephemeral-os-disks)
- [Ephemeral OS disk FAQ](https://learn.microsoft.com/en-us/azure/virtual-machines/ephemeral-os-disks-faq)
- [Deploy a Premium SSD v2 managed disk](https://learn.microsoft.com/en-us/azure/virtual-machines/disks-deploy-premium-v2)
- [Troubleshoot allocation failures on Virtual Machine Scale Sets](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machine-scale-sets/deploy/allocationfailed-or-zonalallocationfailed)
- [On-demand Capacity Reservation overview](https://learn.microsoft.com/en-us/azure/virtual-machines/capacity-reservation-overview)
- [Associate a VM with a Capacity Reservation group](https://learn.microsoft.com/en-us/azure/virtual-machines/capacity-reservation-associate-vm)

## Issues Found
- The post suggested that creation-time ephemeral OS disk alternatives could be tested with a cloned disk. Ephemeral OS disks do not support snapshots or disk copies. Changed the guidance to require a replacement deployment for ephemeral OS disks and limited disk-copy guidance to persistent managed OS disks.
- The zone-remediation guidance did not distinguish persistent and ephemeral OS disks. Qualified OS disk copying as applicable to persistent OS disks and stated that ephemeral workloads must be recreated from an image or infrastructure as code.
- The post referred to a "fully deallocated PPG." A proximity placement group is not itself deallocated; the resources using it are. Corrected the wording while preserving Microsoft's recommendation to start the most restrictive SKU first after all resources are deallocated.
- The Accelerated Networking section described a generic "network path" requirement and said disabling the feature returns packet processing to the vCPU path. Replaced those statements with documented requirements for a supported VM size and operating system, and the documented performance effect of increased CPU utilization when the accelerated data path is unavailable.
- The availability-set section used "restart" for an operation that only causes allocation after a VM has been deallocated. Clarified that the constrained operation is starting a deallocated VM and that all VMs must be started after coordinated full deallocation.
- The Capacity Reservation guidance did not state that workloads must explicitly reference a matching reservation group, that scale-out is guaranteed only up to sufficient matching reserved capacity, or that several configurations discussed elsewhere in the post are unsupported. Added the capacity and association requirements and noted that availability sets, PPGs, Ultra Disk, and single-placement-group scale sets are unsupported with on-demand Capacity Reservations.

## Review Notes
The Azure CLI commands and JMESPath queries are syntactically valid and use current GA command groups. The post correctly distinguishes quota from physical capacity, accurately lists the common overconstraint contributors, and gives remediation guidance consistent with current Microsoft documentation. Capacity Reservation support is version- and SKU-dependent, so readers should continue checking the current limitations before adopting it.
