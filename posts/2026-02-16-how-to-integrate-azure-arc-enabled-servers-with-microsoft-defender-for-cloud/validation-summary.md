# Validation Summary: How to Integrate Azure Arc-Enabled Servers with Microsoft Defender for Cloud

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- Azure Arc-enabled servers
- Azure Connected Machine agent and `azcmagent`
- Microsoft Defender for Cloud
- Defender for Servers Plan 1 and Plan 2
- Microsoft Defender for Endpoint
- Azure Monitor Agent
- Azure Policy
- Azure CLI

## Sources Consulted
- Microsoft Learn: `azcmagent connect` CLI reference: https://learn.microsoft.com/en-us/azure/azure-arc/servers/azcmagent-connect
- Microsoft Learn: Azure Arc-enabled servers VM extension management: https://learn.microsoft.com/en-us/azure/azure-arc/servers/manage-vm-extensions
- Microsoft Learn: Defender for Servers overview: https://learn.microsoft.com/en-us/azure/defender-for-cloud/defender-for-servers-overview
- Microsoft Learn: Select a Defender for Servers plan: https://learn.microsoft.com/en-us/azure/defender-for-cloud/plan-defender-for-servers-select-plan
- Microsoft Learn: Defender for Endpoint integration in Defender for Cloud: https://learn.microsoft.com/en-us/azure/defender-for-cloud/integration-defender-for-endpoint
- Microsoft Learn: Enable just-in-time access: https://learn.microsoft.com/en-us/azure/defender-for-cloud/enable-just-in-time-access
- Microsoft Learn: Azure CLI `az security pricing`: https://learn.microsoft.com/en-us/cli/azure/security/pricing
- Microsoft Learn: Azure CLI `az connectedmachine extension`: https://learn.microsoft.com/en-us/cli/azure/connectedmachine/extension
- Microsoft Learn: Azure CLI `az policy assignment`: https://learn.microsoft.com/en-us/cli/azure/policy/assignment
- Microsoft Learn: Azure CLI `az security sub-assessment`: https://learn.microsoft.com/en-us/cli/azure/security/sub-assessment
- Microsoft Learn: Azure CLI `az security contact`: https://learn.microsoft.com/en-us/cli/azure/security/contact
- Microsoft Learn: Azure Arc built-in policy definitions: https://learn.microsoft.com/en-us/azure/azure-arc/servers/policy-reference

## Issues Found
- The Defender for Servers capabilities list mentioned adaptive application controls, which Microsoft documents as deprecated. Replaced it with current capabilities such as endpoint detection and response and file integrity monitoring.
- The post stated that Log Analytics Agent or Azure Monitor Agent is required for security event collection. Current Defender for Servers documentation says Log Analytics Agent and AMA are no longer supported for most plan features; MDE and agentless scanning replace them. Updated the text to make AMA optional for Azure Monitor collection and the Plan 2 free ingestion benefit.
- The Azure Policy example used a hard-coded policy GUID that could not be verified against current built-in policy documentation. Replaced it with commands that look up the current built-in Linux and Windows MDE Arc policy definitions by display name before assignment.
- The vulnerability query used an invalid `az security sub-assessment list --assessed-resource-type` option. Removed the unsupported option and kept the Arc resource filtering in the JMESPath query.
- The JIT section claimed JIT works for Arc-enabled servers through the Azure Arc agent and included a non-existent `az security jit-policy create` command. Replaced it with the current support scope: Azure Resource Manager VMs and supported AWS EC2 instances, not on-premises Arc-enabled servers through the Arc agent.
- The security contact command used outdated flags (`--email`, `--alerts-admins`, string `on`). Updated it to the current `--emails`, `--alert-notifications`, and `--notifications-by-role` JSON-based syntax.

## Review Notes
Azure CLI was not installed in the local environment, so command syntax was validated against current Microsoft Learn CLI reference pages rather than local `az --help` output.
