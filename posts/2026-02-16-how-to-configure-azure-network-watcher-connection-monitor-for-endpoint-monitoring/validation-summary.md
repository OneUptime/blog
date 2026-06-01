# Validation Summary: How to Configure Azure Network Watcher Connection Monitor

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Azure Network Watcher
- Azure Network Watcher Connection Monitor
- Azure CLI
- Azure Monitor metrics and alerts
- Log Analytics and KQL
- Azure Monitor Agent and Azure Arc

## Sources Consulted
- Azure Network Watcher Connection Monitor overview: https://learn.microsoft.com/en-us/azure/network-watcher/connection-monitor-overview
- Azure CLI reference for `az network watcher connection-monitor`: https://learn.microsoft.com/en-us/cli/azure/network/watcher/connection-monitor?view=azure-cli-latest
- Azure CLI reference for `az network watcher connection-monitor test-configuration`: https://learn.microsoft.com/en-us/cli/azure/network/watcher/connection-monitor/test-configuration?view=azure-cli-latest
- Azure CLI reference for `az network watcher connection-monitor test-group`: https://learn.microsoft.com/en-us/cli/azure/network/watcher/connection-monitor/test-group?view=azure-cli-latest
- Azure Monitor Agent with Connection Monitor: https://learn.microsoft.com/en-us/azure/network-watcher/azure-monitor-agent-with-connection-monitor
- Network Watcher Agent VM extension for Windows: https://learn.microsoft.com/en-us/azure/network-watcher/network-watcher-agent-windows
- Azure Monitor Logs reference for Connection Monitor tables: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/microsoft-network_networkwatchers_connectionmonitors

## Issues Found
- Replaced outdated Log Analytics agent wording for on-premises sources with current Azure Arc and Azure Monitor Agent requirements, because Connection Monitor no longer supports the legacy Log Analytics agent for on-premises source monitoring.
- Corrected the Log Analytics workspace prerequisite from metric storage to log storage and analysis. Connection Monitor metrics are available in Azure Monitor metrics; logs are stored in Log Analytics.
- Corrected Azure CLI parameter names: `--test-config-frequency` and `--test-frequency-sec` were changed to the documented `--frequency` option.
- Added the required `--test-groups` parameter to `az network watcher connection-monitor test-configuration add` examples.
- Corrected HTTP method casing from `GET` to `Get`, matching the Azure CLI accepted values, and used the documented comma-delimited format for HTTP status codes in `test-configuration add`.
- Replaced the incomplete Step 3 `connection-monitor create` command, which omitted required endpoint and test configuration parameters, with a valid `test-group add` example.
- Corrected the Azure SQL Database example from TCP port 443 to TCP port 1433 and adjusted the sample endpoint name.
- Corrected the path query projection from the nonexistent `PathHops` column to the documented `Hops` column.
- Replaced an unsupported or unverified VMSS ICMP limitation with the documented limitation that classic VMs are not supported.

## Review Notes
Azure CLI subcommands for adding endpoints, test groups, and test configurations are currently marked preview in the Azure CLI reference. The post is still valid, but future CLI releases may change preview command behavior.
