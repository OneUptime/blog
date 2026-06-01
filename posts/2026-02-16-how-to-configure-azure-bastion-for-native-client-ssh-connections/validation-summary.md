# Validation Summary: How to Configure Azure Bastion for Native Client SSH Connections

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Bastion
- Azure CLI
- SSH and SCP
- Azure virtual networks and network security groups
- Microsoft Entra ID authentication for Linux VMs

## Sources Consulted
- Azure Bastion native client configuration: https://learn.microsoft.com/en-us/azure/bastion/native-client
- Azure CLI `az network bastion` reference: https://learn.microsoft.com/en-us/cli/azure/network/bastion
- Azure Bastion Linux SSH connection guide: https://learn.microsoft.com/en-us/azure/bastion/bastion-connect-vm-ssh-linux
- Azure Bastion NSG rules: https://learn.microsoft.com/en-us/azure/bastion/bastion-nsg
- Azure Bastion overview and SKU capabilities: https://learn.microsoft.com/en-us/azure/bastion/bastion-overview
- Azure Bastion host scaling guidance: https://learn.microsoft.com/en-us/azure/bastion/configure-host-scaling
- Azure Bastion file transfer via native client: https://learn.microsoft.com/en-us/azure/bastion/vm-upload-download-native
- Azure Bastion pricing page: https://azure.microsoft.com/en-us/pricing/details/azure-bastion/

## Issues Found
- The post described native client support as a Standard-only capability. Current Azure documentation describes native client support as available on Standard or higher, so the wording was updated.
- The existing Bastion update example used `--sku Standard` and omitted `--location`. Current Azure guidance for SKU upgrade examples uses `--sku name=Standard`, and notes that update operations can require the existing resource location to avoid `InvalidResourceLocation`, so the command was corrected.
- The port-forwarding example implied that `az network bastion tunnel` forwards to the VM's `localhost`. The tunnel connects to the target VM's resource port over the private network, so the text now says the service must be reachable on the VM's private IP.
- The port-forwarding section called `az network bastion tunnel` SSH tunneling even though the database example uses Bastion's generic tunnel command rather than an SSH `-L` tunnel. The heading and description were corrected.
- The NSG requirements only mentioned SSH/RDP ports. Bastion tunnel/custom-port scenarios also require the relevant target service ports, so the requirements were updated.
- The scaling section stated 20 concurrent SSH connections by default and about 10 more per scale unit. Official host scaling guidance says each instance supports up to 40 SSH or 20 RDP connections for medium workloads, with practical capacity depending on session activity, so the section was corrected.
- The pricing section gave fixed hourly prices. Azure pricing varies by region and agreement, and Bastion pricing also includes outbound data transfer, so the post now directs readers to current pricing instead of hard-coding rates.
- Older Azure AD terminology was updated to Microsoft Entra ID terminology while preserving the correct `--auth-type AAD` CLI value and `AADSSHLoginForLinux` extension name.

## Review Notes
Azure CLI was not installed in the local environment, so command verification was performed against official Microsoft Learn CLI reference pages rather than local `az --help` output.
