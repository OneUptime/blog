# Validation Summary: How to Use Azure Network Watcher NSG Diagnostics to Verify Security Rules

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Azure Network Watcher
- Network Security Groups
- IP flow verify
- NSG diagnostics
- Effective security rules
- Azure CLI
- Bash
- jq

## Sources Consulted
- Microsoft Learn: IP flow verify overview - https://learn.microsoft.com/en-us/azure/network-watcher/ip-flow-verify-overview
- Microsoft Learn: NSG diagnostics overview - https://learn.microsoft.com/en-us/azure/network-watcher/nsg-diagnostics-overview
- Microsoft Learn: Diagnose network security rules - https://learn.microsoft.com/en-us/azure/network-watcher/diagnose-network-security-rules
- Microsoft Learn: Azure CLI `az network watcher` reference - https://learn.microsoft.com/en-us/cli/azure/network/watcher?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az network nic list-effective-nsg` reference - https://learn.microsoft.com/en-us/cli/azure/network/nic?view=azure-cli-latest
- Microsoft Learn: Effective security rules overview - https://learn.microsoft.com/en-us/azure/network-watcher/effective-security-rules-overview
- Microsoft Learn: Network Interfaces - List Effective Network Security Groups REST API - https://learn.microsoft.com/en-us/rest/api/virtualnetwork/network-interfaces/list-effective-network-security-groups?view=rest-virtualnetwork-2025-05-01

## Issues Found
- The post treated `az network watcher test-ip-flow` as NSG diagnostics. Microsoft documents this command as IP flow verify, while NSG diagnostics is exposed through `run-configuration-diagnostic`. Updated the surrounding wording and headings to distinguish IP flow verify from NSG diagnostics.
- The description of NSG diagnostics said it returns "effective security rules after evaluating all NSG layers." Adjusted this to say it returns the NSGs and rules evaluated across applicable layers, which better matches the documented diagnostic result behavior.
- The `run-configuration-diagnostic` examples supplied `--direction` while also supplying `--queries`, where each query already includes its own direction. Removed the redundant top-level direction flag from multi-query examples.
- The `jq` filter for `list-effective-nsg` could fail when `destinationPortRanges` is absent and did not account for the `443-443` range form shown by Azure effective security rule output. Updated the filter to handle missing arrays and single-port ranges.
- The audit script passed service tags and CIDR prefixes such as `Internet` and `10.0.2.0/24` to `test-ip-flow --remote`. IP flow verify requires concrete local and remote IP address plus port values. Updated the script to use representative source IP addresses and added a note to use `run-configuration-diagnostic` for prefixes and service tags.

## Review Notes
Azure CLI was not installed in the local environment, so command syntax was verified against the current Microsoft Learn Azure CLI reference instead of local `az --help` output.
