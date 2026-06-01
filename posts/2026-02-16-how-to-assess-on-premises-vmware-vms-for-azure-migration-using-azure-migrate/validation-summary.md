# Validation Summary: How to Assess On-Premises VMware VMs for Azure Migration Using Azure Migrate

## Status
validated

## Post Type
Tutorial / migration assessment guide

## Technologies Covered
- Azure Migrate Discovery and assessment
- Azure VM assessment
- VMware vSphere and vCenter Server
- Azure Migrate appliance
- VMware PowerCLI
- Azure Hybrid Benefit

## Sources Consulted
- Microsoft Learn: Discover servers running in a VMware environment with Azure Migrate Discovery and assessment - https://learn.microsoft.com/en-us/azure/migrate/tutorial-discover-vmware
- Microsoft Learn: Azure Migrate appliance requirements - https://learn.microsoft.com/en-us/azure/migrate/migrate-appliance
- Microsoft Learn: Set up least privileged accounts in Azure Migrate - https://learn.microsoft.com/en-us/azure/migrate/best-practices-least-privileged-account
- Microsoft Learn: Assessment properties in Azure Migrate - https://learn.microsoft.com/en-us/azure/migrate/assessment-properties
- Microsoft Learn: Overview of assessment in Azure Migrate - https://learn.microsoft.com/en-us/azure/migrate/concepts-overview
- Microsoft Learn: Review Azure VM assessment - https://learn.microsoft.com/en-us/azure/migrate/review-assessment
- Microsoft Learn: Best practices for creating assessments - https://learn.microsoft.com/en-us/azure/migrate/best-practices-assessment
- Broadcom PowerCLI Reference: New-VIRole - https://developer.broadcom.com/powercli/latest/vmware.vimautomation.core/commands/new-virole
- Broadcom PowerCLI Reference: Get-VIPrivilege - https://developer.broadcom.com/powercli/latest/vmware.vimautomation.core/commands/get-viprivilege
- Broadcom vSphere Web Services API: AuthorizationManager - https://developer.broadcom.com/xapis/vsphere-web-services-api/latest/vim.AuthorizationManager.html

## Issues Found
- The prerequisites said the Azure Migrate appliance required "Windows Server 2016 or later." Current Microsoft documentation says the VMware appliance should run on Windows Server 2022 or Windows Server 2025, and the onboarding script blocks Windows Server 2016 or earlier. The post now describes the OVA appliance capacity requirement and Windows Server 2022 appliance image.
- The prerequisites said vCenter Server "version 5.5 or later." Current Azure Migrate appliance documentation lists supported vCenter Server versions as 5.5, 6.0, 6.5, 6.7, and 7.0. The post now lists those supported versions instead of using open-ended wording.
- The PowerCLI example created a sparse custom role and described it as the minimum permissions for discovery and performance collection. Microsoft guidance is to use the built-in Read-only role, or a copy of it, and add Guest operations privileges when software inventory and agentless dependency analysis are needed. The example now copies privileges from the Read-only role, adds Guest operations privileges, and assigns the role with propagation.

## Review Notes
- The remaining Azure Migrate workflow, assessment settings, readiness categories, performance-based sizing explanation, comfort factor explanation, cost-estimate discussion, and performance data collection guidance align with current Microsoft documentation.
- Azure Migrate UI labels can change over time. The flow in the post is accurate conceptually, but screenshots or exact portal labels may need occasional refreshes in future reviews.
