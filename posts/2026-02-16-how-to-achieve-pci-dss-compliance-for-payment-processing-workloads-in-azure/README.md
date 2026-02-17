# How to Achieve PCI DSS Compliance for Payment Processing Workloads in Azure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, PCI DSS, Compliance, Payment Processing, Security, Cloud Security

Description: A practical guide to achieving PCI DSS compliance for payment processing workloads running in Microsoft Azure, covering network segmentation, encryption, and audit controls.

---

If your organization processes credit card payments and runs workloads on Azure, PCI DSS compliance is not optional. The Payment Card Industry Data Security Standard lays out a set of requirements that any entity handling cardholder data must follow. Azure provides a solid foundation for building compliant environments, but the shared responsibility model means you still have real work to do on your side.

This guide walks through the practical steps to get your Azure payment processing workloads to a state where they meet PCI DSS requirements.

## Understanding the Shared Responsibility Model

Microsoft Azure is PCI DSS Level 1 certified, which is the highest level of certification. This means the underlying infrastructure - physical data centers, hypervisors, network fabric - already meets the standard. But that does not mean your application is compliant by default.

You are responsible for everything you deploy on top of Azure: your virtual machines, application code, databases, network configurations, access controls, and monitoring. Think of it this way: Azure gives you compliant building blocks, but you have to assemble them correctly.

## Define Your Cardholder Data Environment

The first step is to clearly identify your Cardholder Data Environment (CDE). This includes every system that stores, processes, or transmits cardholder data, plus any system that is directly connected to those systems.

In Azure, your CDE might include:

- Virtual machines running payment processing applications
- Azure SQL databases storing transaction records
- Azure App Services hosting payment APIs
- Azure Key Vault instances storing encryption keys
- Network components like VNets and subnets connecting these resources

Document every component. A common mistake is underestimating the scope of the CDE, which leads to gaps during audits.

## Network Segmentation

Network segmentation is one of the most effective ways to reduce PCI DSS scope. The idea is simple: isolate your CDE from everything else so that a compromise in a non-CDE system does not give an attacker a path to cardholder data.

Here is how to set up network segmentation in Azure using a VNet with dedicated subnets for the CDE.

```bash
# Create a resource group dedicated to the PCI environment
az group create --name pci-rg --location eastus

# Create a virtual network with a dedicated address space
az network vnet create \
  --resource-group pci-rg \
  --name pci-vnet \
  --address-prefix 10.1.0.0/16

# Create a subnet specifically for CDE workloads
az network vnet subnet create \
  --resource-group pci-rg \
  --vnet-name pci-vnet \
  --name cde-subnet \
  --address-prefix 10.1.1.0/24

# Create a separate subnet for non-CDE management resources
az network vnet subnet create \
  --resource-group pci-rg \
  --vnet-name pci-vnet \
  --name mgmt-subnet \
  --address-prefix 10.1.2.0/24
```

After creating the subnets, apply Network Security Groups (NSGs) that restrict traffic flow. The CDE subnet should only accept traffic on specific ports from known sources.

```bash
# Create an NSG for the CDE subnet
az network nsg create \
  --resource-group pci-rg \
  --name cde-nsg

# Allow HTTPS traffic only from the application gateway subnet
az network nsg rule create \
  --resource-group pci-rg \
  --nsg-name cde-nsg \
  --name AllowHTTPS \
  --priority 100 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --destination-port-ranges 443 \
  --source-address-prefixes 10.1.3.0/24

# Deny all other inbound traffic by default
az network nsg rule create \
  --resource-group pci-rg \
  --nsg-name cde-nsg \
  --name DenyAllInbound \
  --priority 4096 \
  --direction Inbound \
  --access Deny \
  --protocol '*' \
  --destination-port-ranges '*' \
  --source-address-prefixes '*'

# Associate the NSG with the CDE subnet
az network vnet subnet update \
  --resource-group pci-rg \
  --vnet-name pci-vnet \
  --name cde-subnet \
  --network-security-group cde-nsg
```

## Encrypt Cardholder Data at Rest and in Transit

PCI DSS Requirement 3 mandates encryption of stored cardholder data, and Requirement 4 requires encryption in transit. Azure gives you several tools for both.

For data at rest, use Azure Storage Service Encryption (SSE) with customer-managed keys stored in Azure Key Vault. This gives you control over the encryption keys and meets the requirement for key management.

For databases, enable Transparent Data Encryption (TDE) on Azure SQL Database. It is on by default for new databases, but you should configure it with a customer-managed key for full control.

For data in transit, enforce TLS 1.2 or later on all connections. Disable older TLS versions on your App Services and SQL databases.

```bash
# Set minimum TLS version on an Azure SQL Server
az sql server update \
  --resource-group pci-rg \
  --name pci-sql-server \
  --minimal-tls-version 1.2

# Set minimum TLS version on an App Service
az webapp config set \
  --resource-group pci-rg \
  --name pci-payment-app \
  --min-tls-version 1.2
```

## Implement Strong Access Controls

PCI DSS Requirements 7 and 8 focus on access control. Only people who need access to cardholder data should have it, and every user must have a unique ID.

Use Azure Active Directory for identity management. Assign roles using the principle of least privilege with Azure RBAC. Create custom roles if the built-in ones are too broad.

Enable multi-factor authentication for all users who access the CDE. Azure AD Conditional Access policies make this straightforward.

```bash
# Create a custom role that only allows reading from the CDE resource group
az role definition create --role-definition '{
  "Name": "CDE Reader",
  "Description": "Read-only access to CDE resources",
  "Actions": [
    "Microsoft.Compute/virtualMachines/read",
    "Microsoft.Network/virtualNetworks/read",
    "Microsoft.Sql/servers/databases/read"
  ],
  "NotActions": [],
  "AssignableScopes": ["/subscriptions/<sub-id>/resourceGroups/pci-rg"]
}'
```

## Logging and Monitoring

PCI DSS Requirement 10 requires that all access to network resources and cardholder data is tracked and monitored. Azure provides several services for this.

Enable Azure Monitor and configure diagnostic settings on every resource in the CDE. Send all logs to a Log Analytics workspace that has a retention period of at least one year, with at least three months immediately available for analysis.

Enable Microsoft Defender for Cloud and turn on the enhanced security features for your CDE subscriptions. This gives you continuous security assessment and threat detection.

Set up Azure Activity Log alerts for critical operations like role assignments, NSG changes, and key vault access.

```bash
# Enable diagnostic settings on the SQL server to send logs to Log Analytics
az monitor diagnostic-settings create \
  --resource "/subscriptions/<sub-id>/resourceGroups/pci-rg/providers/Microsoft.Sql/servers/pci-sql-server" \
  --name pci-sql-diagnostics \
  --workspace "/subscriptions/<sub-id>/resourceGroups/pci-rg/providers/Microsoft.OperationalInsights/workspaces/pci-logs" \
  --logs '[{"category": "SQLSecurityAuditEvents", "enabled": true, "retentionPolicy": {"enabled": true, "days": 365}}]'
```

## Vulnerability Management

PCI DSS Requirements 5 and 6 cover vulnerability management. You need to run antimalware on all systems, keep them patched, and perform regular vulnerability scans.

Use Microsoft Defender for Servers to get endpoint protection and vulnerability assessment on your VMs. Use Azure Update Management to schedule and track OS patches.

For application-level scanning, integrate a web application firewall (WAF) through Azure Application Gateway in front of your payment APIs. Also run regular penetration tests - Azure allows this with prior notification.

## Use Azure Policy for Continuous Compliance

Azure Policy lets you enforce organizational standards and assess compliance at scale. Microsoft provides a built-in PCI DSS initiative that maps policies to specific PCI requirements.

Assign the PCI DSS initiative to your CDE subscription or resource group. This gives you a compliance dashboard that shows where you stand and what needs attention.

```bash
# Assign the built-in PCI DSS v3.2.1 policy initiative to the CDE resource group
az policy assignment create \
  --name pci-dss-assignment \
  --display-name "PCI DSS Compliance" \
  --policy-set-definition "496eeda9-8f2f-4d5e-8dfd-204f0a92ed41" \
  --scope "/subscriptions/<sub-id>/resourceGroups/pci-rg"
```

## Tokenization to Reduce Scope

One of the best strategies for simplifying PCI compliance is tokenization. Instead of storing actual card numbers, replace them with tokens that have no exploitable value. Azure does not provide a native tokenization service, but you can use third-party payment processors like Stripe, Braintree, or Adyen that handle card data on their side and return tokens to your application.

This approach can dramatically reduce the number of systems in your CDE, because your own application never touches raw card numbers.

## Preparing for the QSA Audit

When your Qualified Security Assessor comes knocking, you need documentation. Maintain a data flow diagram that shows how cardholder data moves through your Azure environment. Keep records of all access control changes, vulnerability scan results, and incident response procedures.

Azure Compliance Manager is useful here. It provides pre-built assessments for PCI DSS and helps you track your evidence collection.

## Final Thoughts

Achieving PCI DSS compliance in Azure is not a one-time project. It requires ongoing vigilance: regular scans, continuous monitoring, periodic access reviews, and staying current with both Azure changes and PCI DSS updates. The version 4.0 standard introduces new requirements around targeted risk analysis and customized approaches, so make sure your compliance program can adapt over time.

Start with clear scope definition, use Azure's native security tools aggressively, and document everything. That combination will put you in a strong position when audit time comes.
