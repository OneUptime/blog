# Validation Summary: How to Conduct an Azure Well-Architected Framework Security Assessment

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure Well-Architected Framework
- Azure Advisor Well-Architected assessments
- Azure CLI
- Microsoft Entra ID
- Managed identities
- Azure Key Vault
- Azure Storage
- Azure SQL
- Azure Network Watcher virtual network flow logs
- Microsoft Defender for Cloud
- Microsoft Sentinel
- Azure Policy

## Sources Consulted
- Azure Advisor WAF assessments: https://learn.microsoft.com/en-us/azure/advisor/advisor-assessments
- Azure Well-Architected Review assessment guidance: https://learn.microsoft.com/en-us/azure/well-architected/design-guides/implementing-recommendations
- Azure Well-Architected Framework security checklist: https://learn.microsoft.com/en-us/azure/well-architected/security/checklist
- Azure Well-Architected Framework security design principles: https://learn.microsoft.com/en-us/azure/well-architected/security/principles
- Azure CLI `az webapp` and managed identity commands: https://learn.microsoft.com/en-us/cli/azure/webapp and https://learn.microsoft.com/en-us/cli/azure/webapp/identity
- Azure Key Vault RBAC authorization checks: https://learn.microsoft.com/en-us/azure/key-vault/general/access-control-default
- Azure Storage account network access and CLI reference: https://learn.microsoft.com/en-us/azure/storage/common/storage-network-security-set-default-access and https://learn.microsoft.com/en-us/cli/azure/storage/account
- Azure SQL server CLI reference: https://learn.microsoft.com/en-us/cli/azure/sql/server
- Azure Network Watcher NSG flow log retirement and migration guidance: https://learn.microsoft.com/en-us/azure/network-watcher/network-watcher-nsg-flow-logging-overview and https://learn.microsoft.com/en-us/azure/network-watcher/nsg-flow-logs-migrate
- Azure Network Watcher virtual network flow logs and traffic analytics: https://learn.microsoft.com/en-us/azure/network-watcher/vnet-flow-logs-manage and https://learn.microsoft.com/en-us/azure/network-watcher/traffic-analytics
- Microsoft Defender for Cloud secure score and pricing APIs: https://learn.microsoft.com/en-us/azure/defender-for-cloud/secure-score-security-controls and https://learn.microsoft.com/en-us/rest/api/defenderforcloud/pricings/list
- Azure Policy overview and effects: https://learn.microsoft.com/en-us/azure/governance/policy/overview and https://learn.microsoft.com/en-us/azure/governance/policy/concepts/evaluate-impact

## Issues Found
- The post described the security pillar as five fixed areas. Updated the wording to reflect the current WAF security checklist, which covers a broader set of recommendations including segmentation, IAM, data protection, hardening, secrets management, monitoring, testing, and incident response.
- The post used "Azure Active Directory (now Entra ID)". Updated this to "Microsoft Entra ID, formerly Azure Active Directory" to match current Microsoft naming.
- The network security section told readers to review NSG flow logs as the normal current logging option. Updated it to recommend virtual network flow logs and note that new NSG flow logs can no longer be created and the feature is scheduled for retirement.
- The post said "Azure Defender (now Microsoft Defender for Cloud) should be enabled for all resource types." Updated this to distinguish Microsoft Defender for Cloud from the Defender plans enabled for specific resource types.

## Review Notes
The Azure CLI snippets use valid command groups and JMESPath-style queries according to current Microsoft CLI documentation. The local environment did not have the Azure CLI installed, so command syntax was verified against official Microsoft Learn references rather than local `az --help` output.
