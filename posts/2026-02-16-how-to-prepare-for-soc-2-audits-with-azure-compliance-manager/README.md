# How to Prepare for SOC 2 Audits with Azure Compliance Manager

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, SOC 2, Compliance, Audit, Security, Trust Services, Governance

Description: Prepare for SOC 2 audits using Azure Compliance Manager to assess your compliance posture, gather evidence, and implement required controls across your Azure environment.

---

SOC 2 (System and Organization Controls 2) is one of the most requested compliance certifications for SaaS companies and service providers. Developed by the AICPA, it evaluates your organization against five Trust Services Criteria: Security, Availability, Processing Integrity, Confidentiality, and Privacy. If your customers are asking for a SOC 2 report, you need to demonstrate that your Azure environment has the right controls in place.

Azure Compliance Manager is the tool that helps you assess your current compliance posture, identify gaps, track remediation, and collect evidence for your auditor. In this post, I will walk through how to use Compliance Manager effectively and the specific Azure configurations needed for SOC 2.

## Understanding SOC 2

SOC 2 comes in two types:

- **Type I** - evaluates the design of your controls at a specific point in time. This is the faster, easier starting point.
- **Type II** - evaluates the design and operating effectiveness of your controls over a period of time (usually 6-12 months). This is what most customers want.

The five Trust Services Criteria are:

1. **Security** (required) - protection against unauthorized access
2. **Availability** - system uptime and performance
3. **Processing Integrity** - data processing is complete, valid, and accurate
4. **Confidentiality** - data classified as confidential is protected
5. **Privacy** - personal information is handled properly

Most organizations start with just Security and add additional criteria as needed.

## Setting Up Azure Compliance Manager

Compliance Manager is part of the Microsoft Purview compliance portal. It provides pre-built assessments for SOC 2 and many other frameworks.

To get started, navigate to compliance.microsoft.com and create a SOC 2 assessment:

```
1. Go to Microsoft Purview Compliance Portal
2. Select Compliance Manager
3. Click Assessments > Add Assessment
4. Select "SOC 2" from the regulation templates
5. Choose the Azure services in scope
6. Name the assessment and assign owners
```

Compliance Manager breaks the SOC 2 requirements into two categories:

- **Microsoft-managed controls** - controls that Microsoft handles as part of the Azure platform (physical security, infrastructure patching, etc.)
- **Customer-managed controls** - controls you are responsible for implementing in your Azure environment

Microsoft handles about 60% of the controls. You are responsible for the rest.

## Key Controls and Azure Configurations

Let me walk through the most important customer-managed controls and how to implement them on Azure.

### Control: Access Management (CC6.1)

Implement role-based access control with least privilege:

```bash
# Create custom roles with minimum necessary permissions
az role definition create --role-definition '{
  "Name": "SOC2 Application Operator",
  "Description": "Limited operator role for SOC 2 compliance",
  "Actions": [
    "Microsoft.Web/sites/read",
    "Microsoft.Web/sites/restart/action",
    "Microsoft.Insights/metrics/read",
    "Microsoft.Insights/logs/read"
  ],
  "NotActions": [
    "Microsoft.Authorization/*/write",
    "Microsoft.Authorization/*/delete"
  ],
  "AssignableScopes": ["/subscriptions/{subscription-id}"]
}'

# Enforce MFA for all users accessing Azure
# Configure this in Azure AD / Entra ID Conditional Access
# Policy: Require MFA for all users accessing Azure Management
```

### Control: Change Management (CC8.1)

Track and control all changes to your production environment:

```bash
# Enable resource locks on critical production resources
az lock create \
  --name "prevent-deletion" \
  --resource-group production-rg \
  --lock-type CanNotDelete \
  --notes "SOC 2 CC8.1 - Production resources must not be accidentally deleted"

# Enable Activity Log alerts for configuration changes
az monitor activity-log alert create \
  --resource-group monitoring-rg \
  --name "resource-changes" \
  --condition category=Administrative \
  --action-group soc2-alerts \
  --description "Alert on any administrative changes to production resources"
```

Use Azure DevOps or GitHub Actions with required approvals for all production deployments:

```yaml
# Azure DevOps pipeline with approval gate for production
# This provides evidence of change management controls
stages:
  - stage: Deploy_Staging
    jobs:
      - deployment: DeployStaging
        environment: staging
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureWebApp@1
                  inputs:
                    appName: 'myapp-staging'

  - stage: Deploy_Production
    dependsOn: Deploy_Staging
    jobs:
      - deployment: DeployProduction
        # Requires manual approval from authorized personnel
        environment: production
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureWebApp@1
                  inputs:
                    appName: 'myapp-production'
```

### Control: Logging and Monitoring (CC7.1, CC7.2)

Comprehensive logging is essential for SOC 2:

```bash
# Create a central Log Analytics workspace
az monitor log-analytics workspace create \
  --resource-group soc2-monitoring-rg \
  --workspace-name soc2-central-logs \
  --location eastus \
  --retention-time 365

# Enable diagnostic logging for all key resources
# Azure SQL
az monitor diagnostic-settings create \
  --resource "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Sql/servers/{server}/databases/{db}" \
  --name soc2-sql-diagnostics \
  --workspace soc2-central-logs \
  --logs '[
    {"category": "SQLSecurityAuditEvents", "enabled": true},
    {"category": "SQLInsights", "enabled": true}
  ]' \
  --metrics '[{"category": "AllMetrics", "enabled": true}]'

# Azure App Service
az monitor diagnostic-settings create \
  --resource "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/sites/{app}" \
  --name soc2-app-diagnostics \
  --workspace soc2-central-logs \
  --logs '[
    {"category": "AppServiceHTTPLogs", "enabled": true},
    {"category": "AppServiceConsoleLogs", "enabled": true},
    {"category": "AppServiceAuditLogs", "enabled": true},
    {"category": "AppServiceIPSecAuditLogs", "enabled": true}
  ]'

# Key Vault
az monitor diagnostic-settings create \
  --resource "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.KeyVault/vaults/{vault}" \
  --name soc2-kv-diagnostics \
  --workspace soc2-central-logs \
  --logs '[
    {"category": "AuditEvent", "enabled": true}
  ]'
```

### Control: Vulnerability Management (CC7.1)

Enable vulnerability scanning and patching:

```bash
# Enable Microsoft Defender for Cloud for all resource types
az security pricing create --name VirtualMachines --tier Standard
az security pricing create --name SqlServers --tier Standard
az security pricing create --name AppServices --tier Standard
az security pricing create --name StorageAccounts --tier Standard
az security pricing create --name KeyVaults --tier Standard
az security pricing create --name Containers --tier Standard

# Enable automatic vulnerability assessment for SQL databases
az sql va baseline set \
  --resource-group production-rg \
  --server myserver \
  --database mydb \
  --name default
```

### Control: Incident Response (CC7.3, CC7.4)

Set up automated incident detection and response:

```bash
# Enable Microsoft Sentinel for SIEM capabilities
az sentinel onboarding-state create \
  --resource-group soc2-monitoring-rg \
  --workspace-name soc2-central-logs

# Create analytics rules for security incidents
# Example: Alert on brute force attempts
az sentinel alert-rule create \
  --resource-group soc2-monitoring-rg \
  --workspace-name soc2-central-logs \
  --rule-name "brute-force-detection" \
  --template-id "a1b2c3d4-..." \
  --enabled true
```

### Control: Data Protection (CC6.7)

Encrypt data at rest and in transit:

```bash
# Enforce HTTPS on all storage accounts using Azure Policy
az policy assignment create \
  --name "require-https-storage" \
  --scope "/subscriptions/{subscription-id}" \
  --policy "/providers/Microsoft.Authorization/policyDefinitions/404c3081-a854-4457-ae30-26a93ef643f9"

# Enforce TLS 1.2 minimum on all App Services using Azure Policy
az policy assignment create \
  --name "require-tls12" \
  --scope "/subscriptions/{subscription-id}" \
  --policy "/providers/Microsoft.Authorization/policyDefinitions/f0e6e85b-9b9f-4a4b-b67b-f730d42f1b0b"
```

## Collecting Evidence with Compliance Manager

Compliance Manager provides improvement actions for each control. For each action, you need to provide evidence. Here is how to organize evidence collection:

### Automated Evidence

Many controls can be assessed automatically through Azure configurations:

```bash
# Export security center recommendations as evidence
az security assessment list \
  --query "[?status.code=='Healthy'].{control: displayName, status: status.code, resource: resourceDetails.id}" \
  --output table

# Export policy compliance state
az policy state summarize \
  --subscription "{subscription-id}" \
  --query "results"
```

### Manual Evidence

Some controls require manual evidence:

- **Security awareness training records** - export from your training platform
- **Access review logs** - quarterly access reviews documented in Azure AD
- **Incident response plans** - documented procedures
- **Business continuity plans** - DR runbooks and test results

Upload these documents to Compliance Manager as evidence for the corresponding controls.

## Continuous Compliance Monitoring

SOC 2 Type II requires ongoing compliance, not just point-in-time. Set up continuous monitoring:

```bash
# Create a dashboard in Azure Monitor for SOC 2 KPIs
# Track metrics like:
# - Number of open security alerts
# - Policy compliance percentage
# - Days since last access review
# - Vulnerability scan findings over time

# Schedule monthly compliance reports
az monitor scheduled-query create \
  --resource-group soc2-monitoring-rg \
  --name "monthly-compliance-check" \
  --scopes $LOG_ANALYTICS_ID \
  --condition "count > 0" \
  --condition-query "
    AzureActivity
    | where CategoryValue == 'Policy'
    | where ActivityStatusValue == 'Failed'
    | summarize FailedPolicies = count() by bin(TimeGenerated, 1d)
  " \
  --evaluation-frequency 1d \
  --window-size 1d \
  --action-groups $COMPLIANCE_TEAM_ACTION_GROUP
```

## Compliance Score

Compliance Manager gives you a compliance score (0-100%) based on how many controls you have implemented. For SOC 2:

- **Below 60%** - significant gaps, not ready for audit
- **60-80%** - progress made but remediation needed
- **80-90%** - good shape, address remaining items
- **90-100%** - ready for auditor engagement

Focus on high-impact controls first. Compliance Manager prioritizes actions by their impact on your overall score.

## Working with Your Auditor

When the auditor arrives, Compliance Manager helps you provide evidence efficiently:

1. **Share the assessment** - export the Compliance Manager report showing your control implementation status
2. **Provide evidence links** - each improvement action in Compliance Manager can have attached evidence
3. **Show continuous monitoring** - demonstrate your dashboards and alerting that prove controls operate continuously
4. **Log access** - provide auditors with read-only access to Log Analytics for independent verification

## Summary

Preparing for a SOC 2 audit on Azure is a structured process. Use Compliance Manager to identify which controls you need to implement, configure Azure services with proper security settings (RBAC, encryption, logging, vulnerability scanning), automate evidence collection where possible, and maintain continuous compliance monitoring. Start your preparation at least 6 months before your planned audit window for Type II, as you need to demonstrate that controls have been operating effectively over time. The combination of Azure's built-in security features, Compliance Manager's assessment framework, and your operational procedures will give you a strong foundation for passing your SOC 2 audit.
