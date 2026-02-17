# How to Conduct an Azure Well-Architected Framework Security Assessment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Well-Architected Framework, Security, Cloud Security, Azure Advisor, Compliance, Infrastructure

Description: Learn how to conduct a thorough security assessment using the Azure Well-Architected Framework to identify vulnerabilities and strengthen your cloud workloads.

---

Security is not something you bolt on after the fact. It needs to be woven into every layer of your cloud architecture from the start. The Azure Well-Architected Framework (WAF) gives you a structured way to evaluate how secure your workloads really are, and more importantly, where the gaps live.

I have run WAF security assessments on dozens of Azure environments over the years. Some were in great shape. Most were not. The common thread was that teams thought they were secure because they had a firewall and some network security groups in place. The WAF security pillar goes much deeper than that, and running a proper assessment will surface issues you did not know existed.

## What the Security Pillar Covers

The security pillar of the Azure Well-Architected Framework focuses on five key areas: identity management, infrastructure protection, application security, data protection, and security operations. Each area has specific recommendations and best practices that you evaluate your workload against.

Think of it as a checklist, but one that is contextual. Not every recommendation applies to every workload. A batch processing system has different security needs than a public-facing web application. The assessment helps you figure out which recommendations matter for your specific scenario.

## Starting with the Azure Well-Architected Review

The first step is to run the official Well-Architected Review in the Azure portal. Navigate to Azure Advisor, then look for the Well-Architected Assessment option. You can also access it directly through the Azure Well-Architected Review tool.

The review asks you a series of questions about your workload. For the security pillar, these questions cover topics like:

- How do you manage identity and access?
- What encryption mechanisms are in place for data at rest and in transit?
- How do you detect and respond to threats?
- What is your network segmentation strategy?
- How do you handle secrets and certificate management?

Answer these questions honestly. The temptation is to give the answer you think is correct rather than the answer that reflects reality. Resist that urge. The assessment is only useful if it reflects what you actually have in place.

## Evaluating Identity and Access Management

Identity is the new perimeter. If someone compromises a privileged identity, network firewalls and NSGs will not save you. Start your assessment by looking at how you manage identities in your Azure environment.

Check whether you are using Azure Active Directory (now Entra ID) for authentication across all services. Look at whether managed identities are being used instead of service principals with secrets. Review your Conditional Access policies to make sure they enforce MFA for administrative access at minimum.

Here is a quick way to check which resources are still using key-based authentication instead of managed identities using the Azure CLI.

```bash
# List all App Services and check their managed identity status
# This helps identify services that might still rely on connection strings or keys
az webapp list --query "[].{name:name, resourceGroup:resourceGroup, identity:identity.type}" -o table

# Check for Key Vault access policies vs RBAC
# RBAC is the recommended approach over access policies
az keyvault list --query "[].{name:name, enableRbacAuthorization:properties.enableRbacAuthorization}" -o table
```

Pay special attention to overprivileged accounts. Run a review of role assignments and look for any identities with Owner or Contributor at the subscription level that do not need that level of access.

## Assessing Network Security

Network security assessment involves reviewing your virtual network architecture, NSG rules, and any network virtual appliances or firewalls. The WAF security pillar recommends a zero-trust network approach where you assume breach and verify every connection.

Look at your NSG flow logs. Are they enabled? Are they being sent to a Log Analytics workspace for analysis? Many teams enable NSGs but never look at the logs, which defeats the purpose.

Review your use of private endpoints. Any Azure PaaS service that supports private endpoints should be using them if the service handles sensitive data. Public endpoints for storage accounts, SQL databases, and Key Vaults are a common finding in WAF assessments.

```bash
# Find storage accounts with public network access enabled
# These should be restricted to specific VNets or use private endpoints
az storage account list --query "[?networkRuleSet.defaultAction=='Allow'].{name:name, resourceGroup:resourceGroup}" -o table

# List SQL servers without private endpoints
az sql server list --query "[].{name:name, publicNetworkAccess:publicNetworkAccess}" -o table
```

## Data Protection Review

Data protection in the WAF security pillar covers encryption at rest, encryption in transit, and key management. Azure encrypts most services at rest by default, but the assessment goes beyond just checking whether encryption is turned on.

Review whether you are using customer-managed keys (CMK) for sensitive workloads. While Microsoft-managed keys are fine for many scenarios, compliance requirements often mandate CMK. Check that TLS 1.2 is enforced everywhere and that older protocol versions are disabled.

Look at your Azure Key Vault configuration. Are soft delete and purge protection enabled? These settings prevent accidental or malicious deletion of keys and secrets. Once purge protection is enabled, it cannot be disabled, which is by design.

## Threat Detection and Response

The security operations aspect of the assessment focuses on how you detect and respond to threats. Azure Defender (now Microsoft Defender for Cloud) should be enabled for all resource types in your environment.

Check your Defender for Cloud secure score. This gives you a quantified view of your security posture. Each recommendation that you remediate improves the score. Focus on the high-severity recommendations first.

Review whether you have a SIEM solution in place. Microsoft Sentinel is the native option, but the assessment is not prescriptive about which SIEM you use. What matters is that security events from across your Azure environment are being collected, correlated, and monitored.

```bash
# Check Microsoft Defender for Cloud pricing tier for each resource type
# Free tier provides limited protection; Standard tier is recommended
az security pricing list --query "[].{name:name, pricingTier:pricingTier}" -o table

# Review security contacts for alert notifications
az security contact list -o table
```

## Application Security

If your workload includes custom applications, the security assessment needs to cover application-level controls. Review whether you are using Azure Web Application Firewall (WAF) in front of web applications. Check that your App Services have HTTPS-only enabled and that client certificate authentication is configured where appropriate.

Look at how secrets are managed in your applications. Are connection strings and API keys stored in Key Vault, or are they embedded in application settings or even source code? The WAF strongly recommends centralizing secret management in Key Vault with managed identity access.

## Generating the Assessment Report

After completing all sections of the assessment, compile your findings into a report that categorizes issues by severity. I typically use three categories: critical (must fix immediately), high (fix within 30 days), and medium (fix within 90 days).

For each finding, document:

- What the issue is
- Which WAF recommendation it violates
- The potential impact if exploited
- The recommended remediation steps
- The effort required to remediate

This report becomes your security improvement roadmap. Share it with your team and track remediation progress. I recommend running the assessment quarterly to catch drift and evaluate new resources that have been deployed since the last review.

## Common Findings

In my experience, these are the most common security findings in WAF assessments:

1. Overprivileged service principals and user accounts
2. Public network access enabled on PaaS services
3. Missing or incomplete logging and monitoring
4. NSGs that are too permissive (allowing 0.0.0.0/0 inbound)
5. Defender for Cloud not enabled or running on the free tier
6. Secrets stored in application settings instead of Key Vault
7. Missing encryption in transit enforcement

## Automating Ongoing Assessment

Running a manual assessment quarterly is good, but automating continuous assessment is better. Azure Policy can enforce many WAF security recommendations automatically. Create a policy initiative that maps to your WAF security findings and assign it to your subscriptions.

Use Azure Policy in audit mode first to understand the scope of non-compliance. Once you are confident in the policies, switch critical ones to deny mode to prevent new non-compliant resources from being created.

The WAF security assessment is not a one-time activity. Treat it as an ongoing practice. Your cloud environment changes constantly, and your security posture needs to keep up. The framework gives you the structure to do this systematically rather than reactively chasing the latest vulnerability announcement.

Start with the official review tool, be honest about your current state, and prioritize remediation based on risk. That is the core of a good WAF security assessment.
