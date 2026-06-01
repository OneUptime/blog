# Validation Summary: How to Enable and Configure Microsoft Defender

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Microsoft Defender for Cloud
- Defender Cloud Security Posture Management (CSPM)
- Defender for Cloud Secure Score / Cloud Secure Score
- Azure CLI
- Azure PowerShell
- Azure Network Security Groups
- Azure Storage encryption
- Defender for Cloud continuous export
- Azure Monitor Log Analytics and Kusto Query Language (KQL)
- Azure Policy
- Microsoft Entra ID Conditional Access and Security Defaults

## Sources Consulted
- Microsoft Learn: Cloud secure score in Microsoft Defender for Cloud - https://learn.microsoft.com/en-us/azure/defender-for-cloud/secure-score-access-and-track
- Microsoft Learn: What is Cloud Security Posture Management (CSPM) - https://learn.microsoft.com/en-us/azure/defender-for-cloud/concept-cloud-security-posture-management
- Microsoft Learn: Connect your Azure subscriptions to Microsoft Defender for Cloud - https://learn.microsoft.com/en-us/azure/defender-for-cloud/enable-enhanced-security
- Microsoft Learn: Azure CLI `az security pricing` reference - https://learn.microsoft.com/en-us/cli/azure/security/pricing
- Microsoft Learn REST API: Defender for Cloud Pricings - https://learn.microsoft.com/en-us/rest/api/defenderforcloud-composite/pricings/get
- Microsoft Learn: Drive recommendation remediation by using governance rules - https://learn.microsoft.com/en-us/azure/defender-for-cloud/governance-rules
- Microsoft Learn: Exempt resources from recommendations - https://learn.microsoft.com/en-us/azure/defender-for-cloud/exempt-resource
- Microsoft Learn: Set up continuous export in Microsoft Defender for Cloud - https://learn.microsoft.com/en-us/azure/defender-for-cloud/continuous-export
- Microsoft Learn: Set up continuous export with REST API - https://learn.microsoft.com/en-us/azure/defender-for-cloud/continuous-export-rest-api
- Microsoft Learn REST API: Defender for Cloud Automations - Create or Update - https://learn.microsoft.com/en-us/rest/api/defenderforcloud/automations/create-or-update
- Microsoft Learn: View exported Defender for Cloud data in Azure Monitor - https://learn.microsoft.com/en-us/azure/defender-for-cloud/continuous-export-view-data
- Microsoft Learn: Azure Monitor Logs reference for `SecurityRecommendation` - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/securityrecommendation
- Microsoft Learn: Azure Storage encryption for data at rest - https://learn.microsoft.com/en-us/azure/storage/common/storage-service-encryption
- Microsoft Learn: Determine which encryption key model is in use for the storage account - https://learn.microsoft.com/en-us/azure/storage/common/storage-encryption-key-model-get

## Issues Found
- The Secure Score explanation only described the classic Azure portal calculation. Updated it to explicitly say the ratio/control-based calculation applies to the classic Azure portal Secure Score, and added a note that the newer Microsoft Defender portal Cloud Secure Score is risk-based and calculated differently.
- The onboarding step said the free CSPM plan is enabled by default for all subscriptions. Updated this to "onboarded subscriptions" to match Defender for Cloud documentation.
- The NSG PowerShell example only checked singular `DestinationPortRange` and `SourceAddressPrefix` values and only treated `*` as unrestricted. Updated it to include plural NSG rule properties and common unrestricted source prefixes such as `0.0.0.0/0`, `::/0`, and `Internet`.
- The storage encryption section implied Azure Storage encryption at rest might be disabled on older accounts. Azure Storage encryption is enabled for all storage accounts and cannot be disabled, so the section now reviews the storage account encryption key source instead.
- The continuous export PowerShell example created a hashtable but did not create an export configuration. Replaced it with an `Invoke-AzRestMethod` example that calls the Defender for Cloud automations API with valid `Workspace` action and source event types.
- The Log Analytics query used a non-documented `SecureScore` table and `PercentageScore` field. Replaced it with a documented `SecurityRecommendation` query using the `RecommendationState` column.

## Review Notes
- Azure CLI and PowerShell were not installed in the local workspace, so command validation was performed against current Microsoft Learn CLI, REST API, PowerShell, and Azure Monitor schema documentation.
- The Azure portal navigation and feature availability for Defender for Cloud can continue to shift as Microsoft moves experiences into the Microsoft Defender portal. The post now distinguishes the classic Azure portal score from the newer risk-based Cloud Secure Score.
