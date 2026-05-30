# Validation Summary: How to Use Network Watcher Packet Capture to Troubleshoot VM Connectivity

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Network Watcher
- Network Watcher packet capture
- Azure CLI
- Azure VM extensions
- Azure Storage blobs
- Wireshark display filters

## Sources Consulted
- Microsoft Learn: Start, stop, download, and delete packet captures with Azure Network Watcher - https://learn.microsoft.com/en-us/azure/network-watcher/packet-capture-manage
- Microsoft Learn: az network watcher packet-capture CLI reference - https://learn.microsoft.com/en-us/cli/azure/network/watcher/packet-capture
- Microsoft Learn: Manage Network Watcher Agent virtual machine extension for Linux - https://learn.microsoft.com/en-us/azure/network-watcher/network-watcher-agent-linux
- Microsoft Learn: Manage Network Watcher Agent virtual machine extension for Windows - https://learn.microsoft.com/en-us/azure/network-watcher/network-watcher-agent-windows
- Wireshark User's Guide / display filter documentation - https://www.wireshark.org/docs/wsug_html_chunked/ChWorkBuildDisplayFilterSection.html

## Issues Found
- The post used `az network watcher packet-capture show` for runtime status. Microsoft documents `az network watcher packet-capture show-status` for packet capture status, so the command and status explanation were corrected.
- The post said capture files are stored in the `networkwatcherpacketcapture` container as `myCapture01.cap`. Microsoft documents the default container as `network-watcher-logs`, with a nested blob path containing subscription, resource group, VM, date, and capture timestamp. The download section was corrected to list blobs first and then download the exact blob path.
- The post referred to `--total-bytes-per-session` as the Azure CLI option for maximum capture size. The current Azure CLI option is `--capture-limit`, so the limitation note was corrected.
- The Network Watcher extension install commands were updated to match current Microsoft Learn examples by adding `--extension-instance-name AzureNetworkWatcherExtension`, `--enable-auto-upgrade true`, and `--version 1.4`.

## Review Notes
The local environment did not have Azure CLI installed, so CLI validation was performed against current Microsoft Learn CLI documentation rather than local `az --help` output. The Wireshark display filter examples are valid display filters.
