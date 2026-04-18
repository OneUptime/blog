# Validation Summary: How to Use Azure Network Watcher to Troubleshoot IPv4 Connectivity

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Azure Network Watcher
- Azure CLI (`az network watcher`)
- IP Flow Verify (`test-ip-flow`)
- Next Hop (`show-next-hop`)
- Connection Troubleshoot (`test-connectivity`)
- Packet Capture (`packet-capture`)
- VPN Troubleshoot (`troubleshooting`)
- NSG Flow Logs (`flow-log`)

## Sources Consulted
- Azure CLI reference for `az network watcher`: https://learn.microsoft.com/en-us/cli/azure/network/watcher
- Azure CLI reference for `az network watcher packet-capture`: https://learn.microsoft.com/en-us/cli/azure/network/watcher/packet-capture
- Azure CLI reference for `az network watcher flow-log`: https://learn.microsoft.com/en-us/cli/azure/network/watcher/flow-log
- Azure CLI reference for `az network watcher troubleshooting`: https://learn.microsoft.com/en-us/cli/azure/network/watcher/troubleshooting

## Issues Found
1. **`test-ip-flow` protocol casing.** The post used `--protocol Tcp`, but the CLI's accepted values are `{TCP, UDP}` (uppercase). Changed to `--protocol TCP` to match the documented accepted values and the docs' own example.
2. **`packet-capture stop` had an extraneous `--resource-group` flag.** Per the CLI reference, `az network watcher packet-capture stop` takes only `--location` and `--name`; `--resource-group` is not a parameter on this subcommand. Removed it.
3. **`packet-capture list` had an extraneous `--resource-group` flag.** Per the CLI reference, `az network watcher packet-capture list` takes only `--location`. Removed the stray `--resource-group`.

## Review Notes
- `az network watcher test-connectivity` is flagged as a Preview command in the Azure CLI reference (though still GA at the service/API level). The post treats it as stable, which mirrors common practice but the preview status could be worth a note in a future revision.
- `az network watcher show-next-hop`'s `nextHopType` enumeration is shown as a representative (not exhaustive) list in the post; additional documented values include `VirtualNetwork`, `VnetLocal`, `HyperNetGateway`, and `Internal`. The post's parenthetical list is illustrative and acceptable.
- The `packet-capture create` `--filters` JSON includes empty-string values for `remoteIPAddress` and `remotePort`. Microsoft's own example omits unused filter keys entirely; empty strings typically work but the cleaner convention is to omit. Left as-is since it is not technically incorrect.
- `flow-log create --format JSON` is currently the only accepted `--format` value; `--log-version 2` is valid.
- `troubleshooting start --resource-type vnetGateway` is a valid accepted value (`{vnetGateway, vpnConnection}`).
