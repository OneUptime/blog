# Validation Summary: How to Troubleshoot High CPU Usage on an Azure Virtual Machine

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Azure Virtual Machines
- Azure Monitor metrics and metric alerts
- Azure B-series burstable VM CPU credits
- Azure Network Security Groups
- Azure Performance Diagnostics / PerfInsights
- Linux process, memory, network, cron, and disk I/O troubleshooting commands

## Sources Consulted
- Microsoft Learn: Azure CLI `az monitor metrics list` documentation: https://learn.microsoft.com/en-us/cli/azure/monitor/metrics
- Microsoft Learn: Azure CLI `az monitor metrics alert create` documentation: https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert
- Microsoft Learn: Azure CLI `az network nsg rule create` documentation: https://learn.microsoft.com/en-us/cli/azure/network/nsg/rule
- Microsoft Learn: Supported metrics for `Microsoft.Compute/virtualMachines`: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-compute-virtualmachines-metrics
- Microsoft Learn: Azure B-family VM sizes and CPU credit behavior: https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/b-family
- Microsoft Learn: Performance diagnostics in Azure Monitor for Azure VMs: https://learn.microsoft.com/en-us/azure/azure-monitor/vm/performance-diagnostics
- Microsoft Learn: Azure Performance Diagnostics VM extension reference: https://learn.microsoft.com/en-us/azure/azure-monitor/vm/performance-diagnostics-extension
- Linux `strace` manual page: https://man7.org/linux/man-pages/man1/strace.1.html
- GNU Coreutils `timeout` documentation: https://www.gnu.org/s/coreutils/timeout

## Issues Found
- The Azure Monitor metrics example used `date -u -v-1H`, which is a BSD/macOS `date` option and would fail on a typical Linux environment. Changed the command to use Azure CLI's `--offset 1h`, which is supported by `az monitor metrics list` and avoids shell-specific date arithmetic.
- The `strace` example used `sudo strace -p <PID> -c -t 10`. In `strace`, the trailing `10` is treated as a command argument rather than a duration limit, and `-t` controls timestamp formatting. Changed it to `sudo timeout 10 strace -p <PID> -c`.
- The Performance Diagnostics CLI example installed the `AzurePerformanceDiagnostics` extension with only `{"performanceScenario":"basic"}`. Current Microsoft documentation describes running Performance Diagnostics from the Azure portal for Linux and Windows VMs, while extension deployment requires additional settings such as storage configuration. Removed the under-specified CLI snippet and kept the portal workflow with current analysis type names.
- The portal analysis levels were listed as "basic, performance, or advanced." Updated them to "Quick analysis or Performance analysis; Advanced performance analysis is Windows only" to match current Performance Diagnostics terminology and platform support.

## Review Notes
Most other commands and explanations are technically sound for a Linux VM troubleshooting guide. Some Linux package-dependent tools such as `iostat` and `iotop` may need to be installed first on minimal images, but their usage in the post is correct.
