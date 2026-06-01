# Validation Summary: How to Set Up Azure Bastion with Kerberos Authentication for Domain-Joined VMs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Bastion
- Kerberos authentication
- Active Directory Domain Services
- Windows Server / Windows VM domain join
- Azure CLI
- Azure Monitor diagnostic settings
- Log Analytics / KQL

## Sources Consulted
- Microsoft Learn: Configure Bastion for Kerberos authentication using the Azure portal - https://learn.microsoft.com/en-us/azure/bastion/kerberos-authentication-portal
- Microsoft Learn: Azure CLI `az network bastion` reference - https://learn.microsoft.com/en-us/cli/azure/network/bastion?view=azure-cli-latest
- Microsoft Learn: Deploy Bastion using Azure CLI - https://learn.microsoft.com/en-us/azure/bastion/create-host-cli
- Microsoft Learn: View or upgrade an Azure Bastion SKU - https://learn.microsoft.com/en-us/azure/bastion/upgrade-sku
- Microsoft Learn: Configure Microsoft Entra ID authentication for Azure Bastion - https://learn.microsoft.com/en-us/azure/bastion/bastion-entra-id-authentication
- Microsoft Learn: Introduction to Microsoft Entra Kerberos - https://learn.microsoft.com/en-us/entra/identity/authentication/kerberos
- Microsoft Learn: Azure CLI `az monitor diagnostic-settings` reference - https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings?view=azure-cli-latest
- Microsoft Learn: Azure Monitor Logs reference for `MicrosoftAzureBastionAuditLogs` - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/microsoftazurebastionauditlogs
- Microsoft Learn: Azure CLI `az ad ds` reference - https://learn.microsoft.com/en-us/cli/azure/ad/ds?view=azure-cli-latest

## Issues Found
- The post incorrectly described Bastion Kerberos as passwordless sign-in using Azure AD / Microsoft Entra credentials. Updated it to describe UPN-based domain sign-in where Bastion uses Kerberos instead of NTLM.
- The prerequisites incorrectly required Bastion Standard SKU, an Azure AD joined client, Azure AD DS or on-premises AD DS with password hash sync, and Azure AD Premium. Updated prerequisites to match Bastion Kerberos requirements: Basic SKU or higher, domain-joined VMs, an Azure-hosted AD DS domain controller in the same VNet, VNet DNS configuration, and required AD/Kerberos ports.
- The Azure AD DS CLI example used invalid `az ad ds create` parameters and did not match the supported Bastion Kerberos topology. Replaced it with VNet DNS configuration for an Azure-hosted domain controller.
- The Bastion CLI examples used the incorrect `--enable-kerberos` parameter. Updated them to the current `--kerberos` parameter.
- The existing Bastion update example omitted the required `--location` value and used the wrong SKU update syntax. Updated it to include `--location` and `--sku name=Standard`.
- The VM configuration section focused on Azure AD DS and per-VM DNS changes. Updated it to verify DNS inherited from VNet DNS and to use an AD DS domain controller reachable from the VNet.
- The post included an unrelated Microsoft Entra Kerberos server object setup with `AzureADHybridAuthenticationManagement`. Removed that flow and replaced it with a Bastion Kerberos configuration check.
- The Group Policy section recommended credential delegation settings and SPNs that are not part of the Bastion Kerberos validation procedure. Replaced it with Microsoft's recommended NTLM restriction validation method.
- The connection test incorrectly said to select Azure AD authentication and connect without credentials. Updated it to require UPN format for Kerberos sign-in.
- Troubleshooting and security benefit claims were updated to remove unsupported Azure AD SSO/MFA/passwordless claims and to focus on Kerberos versus NTLM behavior.

## Review Notes
The local environment did not have Azure CLI installed, so CLI validation was performed against current Microsoft Learn Azure CLI reference pages rather than local `az --help` output. The diagnostic logging command and KQL table were consistent with Azure Monitor documentation, though the exact `OperationName` and whether the message includes the word "Kerberos" can vary by emitted Bastion audit event.
