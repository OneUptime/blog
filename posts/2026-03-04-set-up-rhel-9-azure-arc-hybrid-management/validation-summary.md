# Validation Summary: How to Set Up RHEL with Azure Arc for Hybrid Management

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Azure Arc-enabled servers
- Azure Connected Machine agent
- Azure CLI connectedmachine extension
- Azure Monitor Agent and data collection rules
- Azure Policy
- Azure Update Manager

## Sources Consulted
- Azure Arc Connected Machine agent prerequisites: https://learn.microsoft.com/en-us/azure/azure-arc/servers/prerequisites
- Azure Arc deployment script guidance: https://learn.microsoft.com/en-us/azure/azure-arc/servers/onboard-portal
- azcmagent CLI reference: https://learn.microsoft.com/en-us/azure/azure-arc/servers/azcmagent
- azcmagent connect reference: https://learn.microsoft.com/en-us/azure/azure-arc/servers/azcmagent-connect
- Azure CLI connectedmachine reference: https://learn.microsoft.com/en-us/cli/azure/connectedmachine?view=azure-cli-latest
- Azure CLI connectedmachine extension reference: https://learn.microsoft.com/en-us/cli/azure/connectedmachine/extension?view=azure-cli-latest
- Azure Monitor data collection rule CLI reference: https://learn.microsoft.com/en-us/cli/azure/monitor/data-collection/rule?view=azure-cli-latest
- Azure Monitor data collection rule association CLI reference: https://learn.microsoft.com/en-us/cli/azure/monitor/data-collection/rule/association?view=azure-cli-latest
- Azure Policy assignment CLI reference: https://learn.microsoft.com/en-us/cli/azure/policy/assignment?view=azure-cli-latest
- Azure Virtual Machines built-in policy reference: https://learn.microsoft.com/en-us/azure/virtual-machines/policy-reference
- Azure Hybrid Compute install patches REST API: https://learn.microsoft.com/en-us/rest/api/hybridcompute/machines/install-patches?view=rest-hybridcompute-2025-01-13

## Issues Found
- The post used `az connectedmachine generate-script`, which is not present in the current Azure CLI `connectedmachine` command reference. Replaced the step with installation of the supported `connectedmachine` Azure CLI extension.
- The RHEL install step described running an onboarding script while the commands manually installed the agent. Updated the wording and used the documented Linux agent installer flow.
- The `azcmagent` examples assumed `azcmagent` was on `PATH`. Updated local RHEL commands to use the documented Linux path `/opt/azcmagent/bin/azcmagent`.
- The `azcmagent connect` example did not specify an authentication method. Added `--use-device-code`, which is the documented Linux-friendly interactive onboarding method.
- The Azure Monitor extension command omitted `--location`, which Microsoft includes in Arc extension deployment guidance. Added the location.
- The data collection rule command created a DCR with only a description, which would not define any metric collection or attach the rule to the Arc server. Added a minimal metrics DCR, captured the DCR resource ID, and associated it with the Arc-enabled server.
- The Azure Policy assignment used a policy display name directly and used wording that implied enforcement. Updated the example to look up a built-in Linux policy definition ID and describe it as an audit policy.

## Review Notes
The Azure Monitor example now covers metrics collection only. Collecting syslog or custom logs would require adding a Log Analytics workspace destination and Linux data sources to the DCR.
