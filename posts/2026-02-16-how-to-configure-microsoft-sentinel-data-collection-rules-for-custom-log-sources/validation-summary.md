# Validation Summary: How to Configure Microsoft Sentinel Data Collection Rules for Custom Log Sources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Microsoft Sentinel
- Azure Monitor Agent
- Azure Monitor Data Collection Rules
- Data Collection Rule Associations
- Log Analytics custom tables
- Azure CLI
- Bicep
- Kusto Query Language
- Syslog
- Windows Event Logs

## Sources Consulted
- Microsoft Learn: Azure Monitor Agent overview - https://learn.microsoft.com/en-us/azure/azure-monitor/agents/azure-monitor-agent-overview
- Microsoft Learn: Install and manage the Azure Monitor Agent - https://learn.microsoft.com/en-us/azure/azure-monitor/agents/azure-monitor-agent-manage
- Microsoft Learn: Collect text file from virtual machine with Azure Monitor - https://learn.microsoft.com/en-us/azure/azure-monitor/vm/data-collection-log-text
- Microsoft Learn: Data collection rule samples in Azure Monitor - https://learn.microsoft.com/en-us/azure/azure-monitor/data-collection/data-collection-rule-samples
- Microsoft Learn: Collect Syslog events with Azure Monitor Agent - https://learn.microsoft.com/en-us/azure/azure-monitor/vm/data-collection-syslog
- Microsoft Learn: Collect Windows events from virtual machines with Azure Monitor Agent - https://learn.microsoft.com/en-us/azure/azure-monitor/vm/data-collection-windows-events
- Microsoft Learn: Azure CLI `az monitor data-collection rule` reference - https://learn.microsoft.com/en-us/cli/azure/monitor/data-collection/rule
- Microsoft Learn: Azure CLI `az monitor data-collection rule association` reference - https://learn.microsoft.com/en-us/cli/azure/monitor/data-collection/rule/association
- Microsoft Learn: Azure CLI `az monitor log-analytics workspace table` reference - https://learn.microsoft.com/en-us/cli/azure/monitor/log-analytics/workspace/table
- Microsoft Learn: Transformations in Azure Monitor - https://learn.microsoft.com/en-us/azure/azure-monitor/data-collection/data-collection-transformations
- Microsoft Learn: Kusto `parse` operator - https://learn.microsoft.com/en-us/kusto/query/parse-operator

## Issues Found
- The custom text log DCR used the destination table stream directly as the incoming stream and omitted `streamDeclarations`. Updated the JSON and Bicep examples to define a raw incoming custom stream and send it to `Custom-ApplicationLogs_CL` through `outputStream`.
- The custom text log examples used `recordStartTimestampFormat: "ISO 8601"` even though the sample logs use `YYYY-MM-DD HH:MM:SS`. Updated the timestamp format to match the documented supported value and the sample data.
- The JSON snippets included comments, which would fail when used with `az monitor data-collection rule create --rule-file`. Removed the comments from JSON blocks.
- The KQL transformations parsed the timestamp as a single datetime before the first space, which did not match the sample timestamp format. Updated the transforms to parse date and time separately, convert them with `todatetime(strcat(...))`, and project the destination table columns.
- The Windows Event Logs DCR mixed `Microsoft-SecurityEvent` with an Application event XPath. Updated it to use the generic `Microsoft-Event` stream and clarified that the Sentinel Windows Security Events via AMA connector should be used when targeting the `SecurityEvent` table.
- The post said filtered transformation records are “not billed.” Updated this to reflect current Azure Monitor pricing guidance, where filtering reduces stored ingestion volume but transformation processing can have separate billing implications in some cases.
- The AMA description said it replaces the Telegraf agent. Updated it to align with Microsoft documentation: AMA is the supported agent for guest OS monitoring data and replaces the legacy Log Analytics agent for supported scenarios.

## Review Notes
- The JSON DCR snippets were parsed locally with Node.js after edits.
- Azure CLI and Bicep were not installed in the workspace, so command and Bicep validation was performed against official Microsoft documentation rather than local execution.
