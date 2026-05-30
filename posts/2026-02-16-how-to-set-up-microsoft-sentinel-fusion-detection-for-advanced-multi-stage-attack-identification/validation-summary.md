# Validation Summary: How to Set Up Microsoft Sentinel Fusion Detection for Advanced Multi-Stage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Microsoft Sentinel
- Microsoft Sentinel Fusion / Advanced Multistage Attack Detection
- Azure CLI sentinel extension
- Microsoft Defender XDR and Defender product alerts
- Microsoft Entra ID Protection
- Kusto Query Language (KQL)
- Azure Monitor SecurityEvent and SecurityIncident tables
- MITRE ATT&CK mappings

## Sources Consulted
- Microsoft Learn: Configure multistage attack detection (Fusion) rules in Microsoft Sentinel - https://learn.microsoft.com/en-us/azure/sentinel/configure-fusion-rules
- Microsoft Learn: Advanced multistage attack detection in Microsoft Sentinel - https://learn.microsoft.com/en-us/azure/sentinel/fusion
- Microsoft Learn: az sentinel data-connector CLI reference - https://learn.microsoft.com/en-us/cli/azure/sentinel/data-connector
- Microsoft Learn: az sentinel alert-rule CLI reference - https://learn.microsoft.com/en-us/cli/azure/sentinel/alert-rule
- Microsoft Learn: az sentinel automation-rule CLI reference - https://learn.microsoft.com/en-us/cli/azure/sentinel/automation-rule
- Microsoft Learn: Microsoft.SecurityInsights automationRules ARM/Bicep reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.securityinsights/automationrules
- Microsoft Learn: Azure Monitor SecurityEvent table reference - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/securityevent
- Microsoft Learn: Azure Monitor SecurityIncident table reference - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/securityincident
- Microsoft Learn: Windows Security Event 4688 - https://learn.microsoft.com/en-us/windows/security/threat-protection/auditing/event-4688

## Issues Found
- The post described configuring Fusion from the Rule templates tab and creating the rule when not configured. Current Microsoft documentation directs users to the Active rules tab to locate and edit the Advanced Multistage Attack Detection Fusion rule. Updated the portal instructions accordingly.
- The post did not mention the current Microsoft Defender portal caveat. Microsoft documents that Fusion is disabled for Sentinel workspaces onboarded to the Defender portal and replaced by Microsoft Defender XDR correlation. Added a short caveat to scope the guide to Sentinel in the Azure portal.
- The Azure CLI section said the CLI command could check and enable Fusion, but the shown command only lists alert rules. Changed the wording to say it checks the rule.
- The automation rule example said it assigns incidents and sets status, but the action payload only assigned an owner. Added `ownerType` for a group owner and `status: "Active"` to match the description and the supported automation rule schema.
- The PowerShell KQL example filtered on the generic `Process` column instead of the 4688-specific `NewProcessName` column. Updated it to filter `NewProcessName` for `powershell.exe` and `pwsh.exe`.
- The Fusion trend KQL used `avg(AdditionalData.alertsCount)` directly on a dynamic property. Updated it to cast the value with `todouble()` before averaging.

## Review Notes
- The Azure CLI `az sentinel` commands are part of the Azure CLI sentinel extension and are marked experimental in the Microsoft CLI reference.
- Microsoft currently marks the new Fusion analytics rule experience and Fusion-based detection using scheduled analytics rule alerts as preview.
