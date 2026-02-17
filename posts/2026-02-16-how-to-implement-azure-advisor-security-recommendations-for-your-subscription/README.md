# How to Implement Azure Advisor Security Recommendations for Your Subscription

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Advisor, Security Recommendations, Azure Security, Cloud Security, Microsoft Defender, Subscription Security

Description: A hands-on guide to understanding and implementing Azure Advisor security recommendations to improve the security posture of your Azure subscription.

---

Azure Advisor security recommendations are your checklist for hardening your Azure environment. They flag misconfigurations, missing protections, and compliance gaps that attackers could exploit. The security recommendations in Advisor are sourced from Microsoft Defender for Cloud, which continuously assesses your resources against security benchmarks and best practices.

This post walks through how to access and understand security recommendations, how to prioritize them, and how to implement the most common ones step by step.

## Where Security Recommendations Come From

Azure Advisor security recommendations are powered by Microsoft Defender for Cloud (formerly Azure Security Center). Defender for Cloud evaluates your resources against the Microsoft Cloud Security Benchmark (MCSB), which covers:

- Identity and access management.
- Network security.
- Data protection.
- Asset management.
- Logging and threat detection.
- Incident response.
- Posture and vulnerability management.

The free tier (Defender for Cloud CSPM) provides basic security posture assessment. The paid tier (Defender for Cloud plans like Defender for Servers, Defender for SQL, etc.) adds advanced threat protection and more detailed recommendations.

## Accessing Security Recommendations

There are two ways to access security recommendations:

### Via Azure Advisor

1. Go to **Azure Advisor** in the portal.
2. Click the **Security** tab.
3. You will see a list of recommendations sorted by impact.

### Via Microsoft Defender for Cloud

1. Go to **Microsoft Defender for Cloud** in the portal.
2. Click **Recommendations** in the left menu.
3. You get a more detailed view with secure score impact, affected resources, and remediation steps.

The Defender for Cloud view is more comprehensive, but the Advisor view gives you security alongside your cost, reliability, and performance recommendations in one place.

## Understanding Secure Score

Microsoft Defender for Cloud assigns a **Secure Score** to your subscription, expressed as a percentage. A higher score means a more secure posture. Each recommendation has a score impact - implementing it raises your secure score by a certain amount.

Focus on recommendations with the highest score impact first. These are typically the ones that address the most common attack vectors.

## High-Priority Security Recommendations

Let me walk through the most common security recommendations and how to implement them.

### 1. Enable MFA for Accounts with Owner Permissions

This is almost always the top recommendation. Multi-factor authentication prevents account compromise from stolen passwords.

**Implementation:**

```bash
# Create a Conditional Access policy requiring MFA for privileged roles
# This requires Azure AD Premium P1 license
# Navigate to Azure AD > Security > Conditional Access > New Policy
# Or use Microsoft Graph API:

# List users with Owner role on the subscription
az role assignment list \
  --role "Owner" \
  --scope "/subscriptions/<sub-id>" \
  --query "[].principalName" \
  -o tsv
```

In the Azure portal:
1. Go to **Azure Active Directory** > **Security** > **Conditional Access**.
2. Create a new policy.
3. Under **Users**, select **Directory roles** and choose **Global Administrator** and other privileged roles.
4. Under **Grant**, select **Require multi-factor authentication**.
5. Enable the policy.

### 2. Enable Diagnostic Logging on Resources

Many Azure resources do not have diagnostic logging enabled by default. Without logs, you cannot detect or investigate security incidents.

```bash
# Enable diagnostic settings on a Key Vault to send audit logs to Log Analytics
az monitor diagnostic-settings create \
  --name "security-logging" \
  --resource $(az keyvault show --name my-keyvault --query id -o tsv) \
  --workspace $(az monitor log-analytics workspace show --resource-group rg-monitoring --workspace-name law-central --query id -o tsv) \
  --logs '[{"categoryGroup":"allLogs","enabled":true}]'
```

Repeat this for all critical resources: Key Vaults, SQL servers, storage accounts, network security groups, and App Services.

### 3. Restrict Network Access to Storage Accounts

Storage accounts with public network access are a common attack surface. Advisor recommends restricting access to specific virtual networks and IP addresses.

```bash
# Disable public network access and configure a virtual network rule
az storage account update \
  --name mystorageaccount \
  --resource-group rg-data \
  --default-action Deny

# Allow access from a specific virtual network subnet
az storage account network-rule add \
  --account-name mystorageaccount \
  --resource-group rg-data \
  --vnet-name vnet-prod \
  --subnet subnet-app
```

### 4. Enable Azure Defender for SQL

If you have SQL databases, enabling Defender for SQL provides vulnerability assessment, threat detection, and advanced threat protection.

```bash
# Enable Defender for SQL on a SQL server
az sql server advanced-threat-protection-setting update \
  --resource-group rg-data \
  --server-name sql-prod \
  --state Enabled
```

### 5. Configure Network Security Group Rules

Advisor flags NSGs with overly permissive rules - like allowing inbound traffic from `0.0.0.0/0` on management ports (RDP 3389, SSH 22).

```bash
# Remove an overly permissive RDP rule
az network nsg rule delete \
  --resource-group rg-network \
  --nsg-name nsg-prod \
  --name AllowRDP

# Add a restricted rule allowing RDP only from your corporate IP range
az network nsg rule create \
  --resource-group rg-network \
  --nsg-name nsg-prod \
  --name AllowRDPFromCorp \
  --priority 100 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --destination-port-ranges 3389 \
  --source-address-prefixes "203.0.113.0/24"
```

### 6. Enable Encryption at Rest

Ensure all data storage services use encryption at rest. Most Azure services encrypt by default now, but some older resources may need explicit configuration.

```bash
# Verify encryption is enabled on a storage account
az storage account show \
  --name mystorageaccount \
  --query "encryption.services" \
  -o json
```

### 7. Enable Just-in-Time VM Access

Instead of leaving management ports open permanently, JIT access lets you open ports only when needed, for a limited time, from specific IP addresses.

1. Go to **Microsoft Defender for Cloud** > **Workload protections**.
2. Click **Just-in-time VM access**.
3. Select the VMs you want to protect.
4. Configure the ports (RDP, SSH) and maximum allowed time.
5. When you need access, request it through the portal or CLI.

```bash
# Request JIT access to a VM (requires Defender for Servers plan)
az security jit-policy initiate \
  --resource-group rg-prod \
  --location eastus \
  --name "default" \
  --virtual-machines '[{"id":"/subscriptions/<sub>/resourceGroups/rg-prod/providers/Microsoft.Compute/virtualMachines/vm-01","ports":[{"number":22,"duration":"PT1H","allowedSourceAddressPrefix":"203.0.113.50"}]}]'
```

## Implementing Recommendations at Scale

For large environments, implementing recommendations one by one is impractical. Use these strategies:

### Azure Policy

Assign built-in policies that enforce security configurations automatically.

```bash
# Assign a policy to require storage account encryption
az policy assignment create \
  --name "require-storage-encryption" \
  --policy "7c5a74bf-ae94-4a74-8fcf-644d1e0e6e6f" \
  --scope "/subscriptions/<sub-id>"
```

### Remediation Tasks

Some Azure Policy definitions support automated remediation. When a resource violates the policy, Azure can automatically fix it.

```bash
# Create a remediation task for a non-compliant policy
az policy remediation create \
  --name "remediate-storage-encryption" \
  --policy-assignment "require-storage-encryption" \
  --resource-group rg-data
```

### Workflow Automation

In Defender for Cloud, you can configure workflow automation to trigger a Logic App when a specific recommendation appears. This enables custom remediation workflows.

## Prioritization Strategy

With potentially dozens or hundreds of security recommendations, prioritization is essential.

1. **Severity Critical and High first**: Focus on recommendations that Defender for Cloud marks as critical or high severity.
2. **Internet-facing resources**: Prioritize resources exposed to the internet (public IPs, web apps, storage with public access).
3. **Data-bearing resources**: Prioritize resources that store sensitive data (databases, storage accounts, key vaults).
4. **Identity and access**: MFA, conditional access, and privileged role management affect everything.
5. **Logging**: Without logging, you cannot detect other issues. Enable diagnostic logging early.

## Tracking Progress

Monitor your Secure Score over time to track improvement.

```bash
# Get the current secure score
az security secure-score list \
  --query "[].{Score:score.current, Max:score.max, Percentage:score.percentage}" \
  -o table
```

Set a target - for example, reaching 80% secure score within 3 months - and review progress weekly.

## Wrapping Up

Azure Advisor security recommendations provide a clear, actionable roadmap for hardening your Azure environment. Start with the highest-impact items: MFA for privileged accounts, network restriction on storage accounts, diagnostic logging, and NSG rule tightening. Use Azure Policy for enforcement at scale and track your progress with the Secure Score. Security is not a one-time project - new recommendations appear as you add resources and as the security benchmark evolves - so build a regular review cadence and keep chipping away at the list.
