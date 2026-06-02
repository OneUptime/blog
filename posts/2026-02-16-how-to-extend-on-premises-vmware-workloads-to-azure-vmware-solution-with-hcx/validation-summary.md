# Validation Summary: How to Extend On-Premises VMware Workloads to Azure VMware Solution with HCX

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure VMware Solution
- VMware HCX
- Azure CLI
- VMware PowerCLI HCX module
- vSphere / vCenter
- NSX-T network segments and HCX Network Extension

## Sources Consulted
- Microsoft Learn: Install VMware HCX in Azure VMware Solution - https://learn.microsoft.com/en-gb/azure/azure-vmware/install-vmware-hcx
- Microsoft Learn: Configure VMware HCX in Azure VMware Solution - https://learn.microsoft.com/en-us/azure/azure-vmware/configure-vmware-hcx
- Microsoft Learn: Create an HCX network extension - https://learn.microsoft.com/en-us/azure/azure-vmware/configure-hcx-network-extension
- Microsoft Learn: VMware HCX migration considerations - https://learn.microsoft.com/en-au/azure/azure-vmware/architecture-migrate
- Microsoft Learn: az vmware addon hcx - https://learn.microsoft.com/en-us/cli/azure/vmware/addon/hcx
- Microsoft Learn: az vmware hcx-enterprise-site - https://learn.microsoft.com/en-us/cli/azure/vmware/hcx-enterprise-site
- Microsoft Learn: Hcx Enterprise Sites REST API - https://learn.microsoft.com/en-us/rest/api/avs/hcx-enterprise-sites/create-or-update
- Microsoft Learn: az vmware workload-network - https://learn.microsoft.com/en-us/cli/azure/vmware/workload-network
- Broadcom Developer: VMware PowerCLI HCX migration cmdlets - https://developer.broadcom.com/powercli/latest/products/vmwarehcx/categories/hcxmigration
- Broadcom Developer: New-HCXMigration - https://developer.broadcom.com/powercli/latest/vmware.vimautomation.hcx/commands/new-hcxmigration
- Broadcom Developer: Connect-HCXServer - https://developer.broadcom.com/powercli/latest/vmware.vimautomation.hcx/commands/connect-hcxserver
- Broadcom Developer: New-HCXNetworkMapping - https://developer.broadcom.com/powercli/latest/vmware.vimautomation.hcx/commands/new-hcxnetworkmapping
- Broadcom Knowledge Base: HCX Bulk Migration operations and best practices - https://knowledge.broadcom.com/external/article?legacyId=87028

## Issues Found
- The post said HCX Advanced is included with AVS. Microsoft documentation now states HCX Enterprise is included and new HCX add-on installs use Enterprise. Updated the text and the Azure CLI `--offer` value to `VMware MaaS Cloud Provider (Enterprise)`.
- The activation key CLI example queried `activationKey` at the top level. Azure AVS returns it under `properties.activationKey`, so the JMESPath query was corrected.
- The prerequisites and network profile section omitted the replication network profile required by the Microsoft HCX configuration workflow. Added the replication profile and replaced the unsupported blanket `/26` prerequisite with a requirement for profile IP pools.
- The service mesh verification command used `az vmware workload-network list`, which is not a valid command in the Azure CLI reference and would not verify HCX service mesh status. Replaced it with the documented HCX UI appliance/tunnel health check.
- The network extension steps included choosing a destination NSX-T segment, but the Microsoft AVS workflow documents selecting on-premises networks and entering the on-premises gateway IP. Updated those steps.
- The Python HCX REST API sample used unsupported/uncited endpoints and payload fields. Replaced it with a VMware PowerCLI HCX module example using documented cmdlets: `Connect-HCXServer`, `Get-HCXSite`, `New-HCXNetworkMapping`, `New-HCXMigration`, `Test-HCXMigration`, and `Start-HCXMigration`.

## Review Notes
The post is technically relevant and accurate after the corrections. Azure CLI could not be checked locally because `az` is not installed in this environment, so CLI validation was performed against Microsoft Learn reference pages.
