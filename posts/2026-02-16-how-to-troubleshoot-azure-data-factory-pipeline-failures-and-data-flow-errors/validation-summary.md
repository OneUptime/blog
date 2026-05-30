# Validation Summary: How to Troubleshoot Azure Data Factory Pipeline Failures and Data Flow Errors

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Azure Data Factory
- Azure Data Factory pipelines and activities
- Azure Data Factory Copy activity
- Azure Data Factory Mapping Data Flows
- Azure Integration Runtime and Self-Hosted Integration Runtime
- Azure CLI
- Azure Monitor diagnostic settings
- Log Analytics

## Sources Consulted
- Azure CLI reference: `az datafactory integration-runtime`: https://learn.microsoft.com/en-us/cli/azure/datafactory/integration-runtime?view=azure-cli-latest
- Azure Data Factory REST API: Integration Runtimes - Get Status: https://learn.microsoft.com/en-us/rest/api/datafactory/integration-runtimes/get-status?view=rest-datafactory-2018-06-01
- Azure Data Factory Copy activity fault tolerance: https://learn.microsoft.com/en-us/azure/data-factory/copy-activity-fault-tolerance
- Azure Data Factory ActivityPolicy API reference: https://learn.microsoft.com/en-us/javascript/api/@azure/arm-datafactory/activitypolicy
- Azure Data Factory mapping data flow expression functions: https://learn.microsoft.com/en-us/azure/data-factory/data-flow-expressions-usage
- Azure Data Factory mapping data flow troubleshooting: https://learn.microsoft.com/en-us/azure/data-factory/data-flow-troubleshoot-guide
- Azure Data Factory connector troubleshooting for Azure SQL and related SQL connectors: https://learn.microsoft.com/en-us/azure/data-factory/connector-troubleshoot-synapse-sql
- Azure Data Factory integration runtime configuration guidance: https://learn.microsoft.com/en-us/azure/data-factory/choose-the-right-integration-runtime-configuration
- Azure Data Factory managed virtual network documentation: https://learn.microsoft.com/en-us/azure/data-factory/managed-virtual-network-private-endpoint
- Azure Data Factory managed VNet integration runtime monitoring: https://learn.microsoft.com/en-us/azure/data-factory/monitor-managed-virtual-network-integration-runtime
- Azure Data Factory pipeline failure and error handling: https://learn.microsoft.com/en-us/azure/data-factory/tutorial-pipeline-failure-error-handling
- Azure Data Factory diagnostic settings: https://learn.microsoft.com/en-us/azure/data-factory/monitor-configure-diagnostics
- Azure Monitor diagnostic settings CLI guidance: https://learn.microsoft.com/en-us/azure/azure-monitor/platform/create-diagnostic-settings

## Issues Found
- The post described fixed numeric error-code prefix ranges for source, sink, data flow, integration runtime, and timeout errors. I replaced that with documented patterns, because ADF uses connector-specific codes, data flow `DF-` codes, wrapper codes such as `2200`, failure types, and inner error messages rather than one universal numeric prefix map.
- JSON examples contained `//` comments and, in one case, two adjacent top-level JSON objects in the same code block. I moved the explanations into prose and split the examples so the fenced JSON snippets are syntactically valid.
- The self-hosted integration runtime command used `az datafactory integration-runtime show`, which retrieves the IR resource definition rather than detailed runtime status. I changed it to `az datafactory integration-runtime get-status` and queried node status/version fields from `properties.typeProperties.nodes`.
- The timeout section named a specific `4002` timeout code as if it were the general activity timeout result. I changed it to refer to timeout messages in activity run details and connector-specific timeout settings.
- The data flow cluster startup section tied cluster creation failures to error code `2200`. I changed it to describe data flow failures by the cluster-creation message instead, because `2200` is also used as a Copy activity wrapper code.
- The managed VNet subnet exhaustion note incorrectly said managed VNet integration runtimes consume IPs from a delegated customer subnet. I corrected it to distinguish Azure-SSIS IR VNet injection, which uses a selected subnet, from Azure Integration Runtime with managed virtual network, which is managed by Data Factory and should be monitored via capacity and queue metrics.
- The ForEach recommendation referenced a native "Continue on error" option. I replaced it with the documented pipeline error-handling pattern of handling failures inside each iteration, such as an On Failure branch or child pipeline that records per-item failure.

## Review Notes
Azure CLI was not installed in the local environment, so CLI validation was performed against the official Azure CLI reference instead of local `az --help` output.
