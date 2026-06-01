# Validation Summary: How to Fix OSProvisioningTimedOut Errors When Creating Azure Linux VMs

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure Linux Virtual Machines
- Azure Linux Agent (WALA/waagent)
- cloud-init
- Azure Instance Metadata Service (IMDS)
- Azure wireserver endpoint
- Azure CLI
- Azure managed disks
- Linux DHCP and boot diagnostics

## Sources Consulted
- Microsoft Learn: Troubleshooting VM provisioning with cloud-init - https://learn.microsoft.com/en-us/azure/virtual-machines/linux/cloud-init-troubleshooting
- Microsoft Learn: cloud-init support for virtual machines in Azure - https://learn.microsoft.com/en-us/azure/virtual-machines/linux/using-cloud-init
- Microsoft Learn: Azure Linux VM Agent overview - https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/agent-linux
- Microsoft Learn: Azure IP address 168.63.129.16 overview - https://learn.microsoft.com/en-us/azure/virtual-network/what-is-ip-address-168-63-129-16
- Microsoft Learn: Azure Instance Metadata Service - https://learn.microsoft.com/en-us/azure/virtual-machines/instance-metadata-service
- Microsoft Learn Azure CLI reference: az vm boot-diagnostics - https://learn.microsoft.com/en-us/cli/azure/vm/boot-diagnostics
- Microsoft Learn Azure CLI reference: az disk - https://learn.microsoft.com/en-us/cli/azure/disk
- Microsoft Learn Azure CLI reference: az network nsg rule - https://learn.microsoft.com/en-us/cli/azure/network/nsg/rule
- Microsoft Learn Azure CLI reference: az network route-table route - https://learn.microsoft.com/en-us/cli/azure/network/route-table/route

## Issues Found
- The cloud-init timeout explanation was too broad. Azure documentation says cloud-init custom data that fails or hangs can be involved in OSProvisioningTimedOut, but also notes that cloud-init configurations applied after provisioning do not have the same 40-minute deployment timeout as Azure Linux Agent custom-data execution. Updated the wording to distinguish provisioning-blocking cloud-init failures from later configuration work.
- The networking section incorrectly implied that NSG rules, route tables, Azure Firewall, or NVAs can block or redirect VM agent traffic to 168.63.129.16. Microsoft documents that 168.63.129.16 is not subject to user-defined routes, and VM agent traffic to ports 80 and 32526 is not subject to configured NSGs. Replaced those checks with in-guest connectivity tests for the wireserver and IMDS, and clarified that local firewalls, proxies, DHCP, or NIC/IP configuration are the relevant guest-side causes.

## Review Notes
The Azure CLI binary was not installed in the local environment, so command validation was performed against the official Azure CLI reference instead of local `az --help` output. The remaining commands and file paths are consistent with Microsoft Learn guidance for Azure Linux VM provisioning, cloud-init logs, boot diagnostics, managed disk SKU updates, and waagent deprovisioning.
