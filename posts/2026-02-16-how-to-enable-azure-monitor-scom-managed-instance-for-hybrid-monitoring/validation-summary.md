# Validation Summary: How to Enable Azure Monitor SCOM Managed Instance for Hybrid Monitoring

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Azure Monitor SCOM Managed Instance
- System Center Operations Manager
- Azure Virtual Network and subnetting
- Azure SQL Managed Instance
- Azure managed identities
- Azure Key Vault
- Azure Monitor alerts and action groups
- SCOM agents and gateway servers
- ARM templates
- Azure CLI
- PowerShell

## Sources Consulted
- Microsoft Learn: About Azure Monitor SCOM Managed Instance - https://learn.microsoft.com/en-us/azure/azure-monitor/scom-manage-instance/overview
- Microsoft Learn: Create an instance of Azure Monitor SCOM Managed Instance - https://learn.microsoft.com/en-us/azure/azure-monitor/scom-manage-instance/create-operations-manager-managed-instance
- Microsoft Learn: Create an Azure SQL managed instance for SCOM MI - https://learn.microsoft.com/en-us/azure/azure-monitor/scom-manage-instance/create-sql-managed-instance
- Microsoft Learn: Use managed identities with Azure Monitor SCOM Managed Instance - https://learn.microsoft.com/en-us/azure/azure-monitor/scom-manage-instance/use-managed-identities-with-scom-mi
- Microsoft Learn: Create a static IP for Azure Monitor SCOM Managed Instance - https://learn.microsoft.com/en-us/azure/azure-monitor/scom-manage-instance/create-static-ip
- Microsoft Learn: Scale Azure Monitor SCOM Managed Instance - https://learn.microsoft.com/en-us/azure/azure-monitor/scom-manage-instance/scale-scom-managed-instance
- Microsoft Learn: Microsoft.Scom/managedInstances ARM template reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.scom/managedinstances
- Microsoft Learn: Add or remove subnet delegation in Azure Virtual Network - https://learn.microsoft.com/en-us/azure/virtual-network/manage-subnet-delegation
- Microsoft Learn: Troubleshoot SCOM agent connectivity issues - https://learn.microsoft.com/en-us/troubleshoot/system-center/scom/troubleshoot-agent-connectivity-issues
- Microsoft Learn: Install a SCOM Gateway Server - https://learn.microsoft.com/en-us/system-center/scom/deploy-install-gateway-server
- Microsoft Learn: Azure Monitor alerts overview - https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alerts-overview
- Microsoft Learn: Azure Monitor action groups - https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/action-groups

## Issues Found
- Microsoft now marks Azure Monitor SCOM Managed Instance as no longer in support and planned for deprecation on 30 September 2026. Added this caveat to the introduction and changed the conclusion so the post does not recommend SCOM MI as a long-term platform for new deployments.
- The prerequisites incorrectly implied that SCOM MI can create its own SQL Managed Instance. Updated the prerequisites and portal steps to state that a SQL Managed Instance must be created or configured before SCOM MI onboarding.
- The prerequisites omitted required domain, DNS, gMSA, Key Vault, and managed identity details. Added these requirements in the existing prerequisite list.
- The subnet example delegated the SCOM MI subnet to `Microsoft.Scom/managedInstances`. Microsoft documentation describes delegation for the SQL Managed Instance subnet, not the SCOM MI subnet. Removed the SCOM subnet delegation from the Azure CLI command and clarified that the SQL MI subnet is the dedicated delegated subnet.
- The subnet creation command used `--address-prefix`; the current Azure CLI reference documents `--address-prefixes`. Updated the command accordingly.
- The managed identity section assigned Contributor at resource-group scope, which does not match the documented SCOM MI onboarding requirements. Replaced it with the required SQL Managed Instance and Key Vault access requirements.
- The ARM example used incorrect property names: `virtualNetworkSubnetId` and `managementEndpoints`. Updated the snippet to use `vNetSubnetId` and the documented `domainController`, `domainUserCredentials`, `gmsaDetails`, and `databaseInstance` properties.
- The portal instructions said to search the marketplace. Updated this to search the Azure Portal, matching the Microsoft deployment flow.
- The sample SCOM agent hostname used an Azure-style public DNS name. Replaced it with the SCOM MI load balancer DNS name pattern used by the documented static IP and DNS configuration.
- The certificate trust text referred to a "SCOM MI CA certificate". Reworded it to Operations Manager certificates and trust chain, which matches SCOM gateway and untrusted-boundary documentation.
- The management pack claim was too broad. Updated it to specify agent-based management packs.
- The Azure Monitor integration steps described unverified portal menu items and severity mapping. Reworked the section to match the documented integrated alerting, action group, and alert processing rule capabilities.
- The scaling thresholds were inaccurate. Updated the section to state that a new SCOM MI instance starts with one management server, that a management server can monitor up to 1000 endpoints, and that the portal recommends the management server count.

## Review Notes
The Azure CLI command syntax for subnet creation and managed identity creation is valid, but the local environment did not have the Azure CLI installed, so command validation was performed against Microsoft Learn rather than local `az --help` output.
