# Validation Summary: How to Use Azure Network Watcher IP Flow Verify to Diagnose NSG Issues

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Azure Network Watcher
- IP Flow Verify
- Azure CLI
- Azure Network Security Groups
- Azure Virtual Network Manager security admin rules
- Azure Virtual Network Flow Logs

## Sources Consulted
- Microsoft Learn: IP flow verify overview - https://learn.microsoft.com/en-us/azure/network-watcher/ip-flow-verify-overview
- Microsoft Learn: az network watcher test-ip-flow CLI reference - https://learn.microsoft.com/en-us/cli/azure/network/watcher?view=azure-cli-latest#az-network-watcher-test-ip-flow
- Microsoft Learn: Quickstart: Diagnose a virtual machine network traffic filter problem using the Azure CLI - https://learn.microsoft.com/en-us/azure/network-watcher/diagnose-vm-network-traffic-filtering-problem-cli
- Microsoft Learn: Azure network security groups overview - https://learn.microsoft.com/en-us/azure/virtual-network/network-security-groups-overview
- Microsoft Learn: How network security groups filter network traffic - https://learn.microsoft.com/en-us/azure/virtual-network/network-security-group-how-it-works
- Microsoft Learn: Network Watchers - Verify IP Flow REST API - https://learn.microsoft.com/en-us/rest/api/network-watcher/network-watchers/verify-ip-flow
- Microsoft Learn: NSG flow logs retirement notice - https://learn.microsoft.com/en-us/azure/network-watcher/nsg-flow-logs-migrate

## Issues Found
- IP Flow Verify scope was described as NSG-only. Updated the post to mention that IP Flow Verify also evaluates Azure Virtual Network Manager security admin rules.
- The return values listed "Direction" as an output. The documented result schema returns `access` and `ruleName`, so the extra return item was removed.
- Example default rule names used inaccurate casing and omitted the `defaultSecurityRules/` prefix. Updated the examples to match current Microsoft documentation, including `defaultSecurityRules/AllowVnetOutBound`, `defaultSecurityRules/DenyAllOutBound`, and `defaultSecurityRules/DenyAllInBound`.
- The rule evaluation description flattened NIC-level and subnet-level NSGs into one ordered list. Updated it to describe security admin rules first and priority evaluation within each applicable NSG.
- The multi-NIC limitation overstated when `--nic` is required. Updated it to match the CLI documentation: it is required when a VM has multiple NICs and IP forwarding is enabled on any of them.
- The limitations section said service endpoints and Private Endpoints both only affect routing. Replaced that with a narrower statement that IP Flow Verify tests rules applied to a VM's network interface and does not test Private Endpoint resources directly.
- The tooling section recommended NSG Flow Logs without noting current retirement. Updated it to recommend Virtual Network Flow Logs and mention that existing NSG Flow Logs are on a retirement path.

## Review Notes
The Azure CLI was not installed in the local environment, so command validation was performed against current Microsoft Learn CLI and REST API documentation rather than local `az --help` output.
