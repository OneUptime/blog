# Validation Summary: How to Configure Microsoft Defender for Cloud Regulatory Compliance Assessments

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Microsoft Defender for Cloud
- Defender for Cloud regulatory compliance dashboard
- Microsoft Cloud Security Benchmark
- Azure Policy initiatives, assignments, and exemptions
- Azure CLI
- Azure REST API
- Defender for Cloud continuous export
- Azure Monitor Log Analytics and Kusto Query Language (KQL)

## Sources Consulted
- Microsoft Defender for Cloud: Assign regulatory compliance standards: https://learn.microsoft.com/en-us/azure/defender-for-cloud/assign-regulatory-compliance-standards
- Microsoft Defender for Cloud: Regulatory compliance standards: https://learn.microsoft.com/en-us/azure/defender-for-cloud/concept-regulatory-compliance-standards
- Microsoft Defender for Cloud: Improve regulatory compliance: https://learn.microsoft.com/en-us/azure/defender-for-cloud/regulatory-compliance-dashboard
- Microsoft Defender for Cloud: Create custom security standards and recommendations: https://learn.microsoft.com/en-us/azure/defender-for-cloud/create-custom-recommendations
- Azure CLI: az security regulatory-compliance-standards: https://learn.microsoft.com/en-us/cli/azure/security/regulatory-compliance-standards
- Azure CLI: az policy set-definition: https://learn.microsoft.com/en-us/cli/azure/policy/set-definition
- Azure CLI: az security automation: https://learn.microsoft.com/en-us/cli/azure/security/automation
- Azure CLI: az policy exemption: https://learn.microsoft.com/en-us/cli/azure/policy/exemption
- Azure REST API: Regulatory Compliance Controls - List: https://learn.microsoft.com/en-us/rest/api/defenderforcloud/regulatory-compliance-controls/list
- Azure Monitor Logs reference: SecurityRegulatoryCompliance: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/securityregulatorycompliance
- ARM/Bicep reference: Microsoft.Security/automations: https://learn.microsoft.com/en-us/azure/templates/microsoft.security/automations

## Issues Found
- The post referred to Azure Security Benchmark as the default benchmark. Updated this to Microsoft Cloud Security Benchmark, which is the current default standard in Defender for Cloud.
- The built-in standard list contained outdated examples, including PCI DSS v4.0 and CMMC Level 3. Updated PCI DSS to v4.0.1 and replaced CMMC Level 3 with CIS Controls.
- The Azure CLI example used `az security regulatory-compliance-standard update`, which is not a supported Azure CLI command. Replaced it with the supported `az security regulatory-compliance-standards list` command and a policy initiative assignment example.
- The CLI query for compliance standard state used `state` at the top level. Updated it to `properties.state` to match the API shape.
- The custom initiative JSON contained comments inside a `json` code block and used an unsupported nested `ASC.complianceStandard` metadata structure. Removed the comments and changed the metadata to `"ASC": "true"`, which Microsoft documents for onboarding Azure Policy initiatives to Defender for Cloud.
- The custom initiative creation command omitted the Defender for Cloud onboarding metadata. Added `"ASC": "true"` to the `--metadata` value and clarified what the referenced JSON files should contain.
- The custom initiative assignment used only a local initiative name. Updated it to a full policy set definition resource ID.
- The post said the initial compliance evaluation could take up to 24 hours. Updated this to note that assessments run approximately every 12 hours.
- The report generation instructions included a date range selection that is not part of the documented Defender for Cloud report flow. Removed that item.
- The continuous export command used `az security automation create`, which is not the documented command. Updated it to `az security automation create_or_update`.
- The continuous export action used `actionType: LogAnalytics` and `logAnalyticsResourceId`, which do not match the Microsoft.Security/automations schema. Updated the action to `actionType: Workspace` with `workspaceResourceId`.
- The Azure Policy exemption command used the singular `--policy-definition-reference-id` parameter and a short assignment name. Updated it to `--policy-definition-reference-ids` and a full policy assignment resource ID.

## Review Notes
The Azure CLI was not installed locally, so CLI validation was performed against the current Microsoft Learn command references rather than local `az --help` output.
