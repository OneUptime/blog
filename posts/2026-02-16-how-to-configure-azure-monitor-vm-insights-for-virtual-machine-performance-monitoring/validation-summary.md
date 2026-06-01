# Validation Summary: How to Configure Azure Monitor VM Insights

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Monitor VM Insights
- Azure Monitor Agent
- Azure Dependency Agent
- Azure Data Collection Rules
- Azure Policy
- Azure CLI
- Log Analytics
- Kusto Query Language

## Sources Consulted
- Microsoft Learn: Enable VM monitoring in Azure Monitor - https://learn.microsoft.com/en-us/azure/azure-monitor/vm/vm-enable-monitoring
- Microsoft Learn: Dependency Agent in Azure Monitor VM insights - https://learn.microsoft.com/en-us/azure/azure-monitor/vm/vminsights-dependency-agent
- Microsoft Learn: Azure Monitor Dependency virtual machine extension for Linux - https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/agent-dependency-linux
- Microsoft Learn: Enable VM insights using Azure Policy - https://learn.microsoft.com/en-us/azure/azure-monitor/vm/vminsights-enable-policy
- Microsoft Learn: View app dependencies with VM insights - https://learn.microsoft.com/en-us/azure/azure-monitor/vm/vminsights-maps
- Microsoft Learn: Azure Monitor Agent supported operating systems and environments - https://learn.microsoft.com/en-us/azure/azure-monitor/agents/azure-monitor-agent-supported-operating-systems
- Microsoft Learn: az monitor data-collection rule - https://learn.microsoft.com/en-us/cli/azure/monitor/data-collection/rule
- Microsoft Learn: az monitor data-collection rule association - https://learn.microsoft.com/en-us/cli/azure/monitor/data-collection/rule/association
- Microsoft Learn: az monitor log-analytics workspace - https://learn.microsoft.com/en-us/cli/azure/monitor/log-analytics/workspace
- Microsoft Learn: Example log table queries for InsightsMetrics - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/queries/insightsmetrics

## Issues Found
- The post implied VM Insights required both AMA and Dependency Agent for all functionality. Updated the wording to state that AMA is required, while Dependency Agent/process and dependency collection is needed for the Map feature.
- The post omitted the current deprecation and June 30, 2028 retirement timeline for the Dependency Agent and Map experience. Added a caveat near the first Map discussion.
- The operating system prerequisite said "Windows Server 2012 R2+" without the current ESU qualification. Updated it to mention Windows Server 2012 R2 with an ESU agreement and supported Linux distributions.
- The Dependency Agent Linux extension command did not include the AMA setting required by Microsoft's current extension guidance. Added `--settings '{"enableAMA": "true"}'`.
- The DCR example used individual Windows performance counters and a `Microsoft-ServiceMap` stream, which does not match the Microsoft VM Insights logs-based DCR example. Replaced it with the documented `\VmInsights\DetailedMetrics` DCR JSON and `--rule-file` creation command.
- The Azure Policy initiative names were legacy names. Updated them to the current AMA-based initiatives for VMs, VMSS, and Hybrid VMs.
- The Azure Policy section said new VMs automatically get agents but did not mention existing VMs require remediation. Added a remediation note.
- The KQL section described "less than 10% free memory" but the query checked an absolute 512 MB threshold. Updated the prose to match the query and added the documented `Origin == "vm.azm.ms"` filter.

## Review Notes
Azure CLI was not installed in the local environment, so CLI validation was performed against Microsoft Learn command references rather than local `az --help` output.
