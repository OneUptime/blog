# Validation Summary: How to Enable Network Watcher Flow Logs for Network Security Groups

## Status
not-technically-relevant

## Post Type
Tutorial

## Technologies Covered
- Azure Network Watcher
- Network security group flow logs
- Azure CLI
- Azure Storage
- Azure Traffic Analytics
- Azure Log Analytics workspace

## Sources Consulted
- Microsoft Learn: NSG flow logs overview — https://learn.microsoft.com/en-us/azure/network-watcher/nsg-flow-logs-overview
- Microsoft Learn: Create, change, enable, disable, or delete NSG flow logs — https://learn.microsoft.com/en-ca/azure/network-watcher/nsg-flow-logs-manage
- Microsoft Learn: Azure CLI reference for `az network watcher flow-log` — https://learn.microsoft.com/en-us/cli/azure/network/watcher/flow-log?view=azure-cli-latest
- Microsoft Learn: Enable or disable Azure Network Watcher — https://learn.microsoft.com/en-us/azure/network-watcher/network-watcher-create

## Issues Found
- The post's core workflow is no longer valid for its publication date. Microsoft documents that new network security group (NSG) flow logs cannot be created after June 30, 2025, and that NSG flow logs will be retired on September 30, 2027. This post is dated February 16, 2026 and instructs readers to create a new NSG flow log with `az network watcher flow-log create`, so the tutorial would fail for the intended use case.
- Microsoft recommends migrating to virtual network flow logs instead of creating new NSG flow logs. Fixing the article would require rewriting the title, premise, command sequence, verification steps, and Traffic Analytics workflow around virtual network flow logs. That is beyond a targeted technical correction, so the post is marked `not-technically-relevant`.
- The post also omits current support caveats from the official NSG flow logs documentation, including the retirement notice and limitations for some resources and VM families. These omissions reinforce that the article is outdated as a new setup guide.

## Review Notes
- No edits were made to `README.md` because the article cannot be made accurate through small corrections while preserving its current scope. It should be removed or replaced with a new guide for Azure virtual network flow logs.
- The local environment did not have the Azure CLI installed, so CLI command validation was performed against Microsoft Learn Azure CLI reference documentation rather than local `az --help` output.
