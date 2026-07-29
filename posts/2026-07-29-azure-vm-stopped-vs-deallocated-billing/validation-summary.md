# Validation Summary: Why Is My Azure VM Still Charging After Shutdown?

## Status

validated

## Post Type

Technical troubleshooting and cost-management guide

## Technologies Covered

- Microsoft Azure Virtual Machines
- Azure VM power states and provisioning states
- Azure CLI
- Azure Compute REST API
- Azure managed disks, snapshots, and disk bursting
- Azure public IP addresses and networking services
- Azure Backup and Azure Site Recovery
- Azure Cost Management
- Azure Reservations and Azure savings plans
- Azure VM auto-shutdown

## Sources Consulted

- [States and billing status of Azure Virtual Machines](https://learn.microsoft.com/en-us/azure/virtual-machines/states-billing)
- [Azure CLI: `az vm`](https://learn.microsoft.com/en-us/cli/azure/vm?view=azure-cli-latest)
- [Create and manage Linux VMs with the Azure CLI](https://learn.microsoft.com/en-us/azure/virtual-machines/linux/tutorial-manage-vm)
- [Virtual Machines instance-view REST operation](https://learn.microsoft.com/en-us/rest/api/compute/virtual-machines/instance-view)
- [Virtual Machines deallocate REST operation](https://learn.microsoft.com/en-us/rest/api/compute/virtual-machines/deallocate)
- [Manage Windows VMs and review VM power states](https://learn.microsoft.com/en-us/azure/virtual-machines/windows/tutorial-manage-vm)
- [Delete a VM and attached resources](https://learn.microsoft.com/en-us/azure/virtual-machines/delete)
- [Find and delete unattached Azure disks](https://learn.microsoft.com/en-us/azure/virtual-machines/disks-find-unattached-portal)
- [Azure managed disk types](https://learn.microsoft.com/en-us/azure/virtual-machines/disks-types)
- [Managed disk bursting](https://learn.microsoft.com/en-us/azure/virtual-machines/disk-bursting)
- [Public IP addresses in Azure](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-addresses)
- [Upgrade Basic Public IP Address to Standard SKU](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-basic-upgrade-guidance)
- [Estimate and understand Azure Backup pricing](https://learn.microsoft.com/en-us/azure/backup/azure-backup-pricing)
- [Azure Site Recovery FAQ](https://learn.microsoft.com/en-us/azure/site-recovery/site-recovery-faq)
- [Start using Cost Analysis](https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/quick-acm-cost-analysis)
- [Understand Cost Management data](https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/understand-cost-mgt-data)
- [What are Azure savings plans?](https://learn.microsoft.com/en-us/azure/cost-management-billing/savings-plan/savings-plan-overview)
- [View amortized benefit costs](https://learn.microsoft.com/en-us/azure/cost-management-billing/reservations/view-amortized-costs)
- [Auto-shutdown an Azure VM](https://learn.microsoft.com/en-us/azure/virtual-machines/auto-shutdown-vm)
- [Azure Virtual Machines overview: local temporary storage](https://learn.microsoft.com/en-us/azure/virtual-machines/overview)
- [Troubleshoot Azure VM allocation failures](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/allocation-failure)

## Issues Found

- The introduction said VM compute billing stops only when the VM reaches **Stopped (deallocated)**. Microsoft documents both **Deallocating** and **Deallocated** as not billed for VM instance usage. Updated the text to distinguish the non-billed transitional state from the stable terminal state that confirms the allocation was fully released.
- The portal guidance similarly described **Stopped (deallocated)** as the value that ends billing. Updated it to describe that value as the stable confirmation of completed deallocation, avoiding a conflict with the documented billing status of **Deallocating**.
- The post described `ProvisioningState/succeeded` as meaning the resource model was provisioned successfully. Azure defines the provisioning state as the status of the most recent user-initiated control-plane operation. Updated the explanation accordingly.

## Review Notes

- All three Azure CLI examples use current GA commands and valid arguments. The `az vm get-instance-view` JMESPath query correctly filters `instanceView.statuses` for the `PowerState/` status, `az vm deallocate` waits for the long-running operation unless `--no-wait` is supplied, and the `az vm show` query uses the current VM resource schema.
- The distinction between guest-initiated shutdown, `az vm stop`, portal Stop/deallocation, and `az vm deallocate` is technically correct.
- The retained-resource billing discussion is accurate: persistent managed disks, public IPv4 addresses, independently deployed networking services, backup data, restore points, and Site Recovery replication can continue to generate charges after VM deallocation.
- Basic SKU public IP addresses were retired on September 30, 2025 but can remain operational without support or SLA guarantees while customers migrate. Standard public IP addresses use static allocation, while legacy dynamic Basic addresses can change after stop/deallocation.
- Cost Management data can be delayed. Microsoft documents typical availability of 8-24 hours for EA and MCA subscriptions and up to 72 hours for pay-as-you-go subscriptions.
- Deallocation can require a fresh capacity allocation at the next start, and data on local temporary storage is lost across deallocation. Persistent managed disks and statically allocated public IP resources remain.
