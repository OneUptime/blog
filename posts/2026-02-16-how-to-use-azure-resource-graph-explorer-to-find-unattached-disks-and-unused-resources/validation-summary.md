# Validation Summary: How to Use Azure Resource Graph Explorer to Find Unattached Disks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Resource Graph
- Kusto Query Language (KQL)
- Azure Managed Disks
- Azure Virtual Machines
- Azure Networking resources: network interfaces, public IP addresses, load balancers, network security groups
- Azure CLI
- Azure PowerShell / Az.ResourceGraph
- Azure Automation

## Sources Consulted
- Azure Resource Graph table and resource type reference: https://learn.microsoft.com/azure/governance/resource-graph/reference/supported-tables-resources
- Azure Resource Graph query language documentation: https://learn.microsoft.com/azure/governance/resource-graph/concepts/query-language
- Azure Resource Graph virtual machine sample queries, including VM power state: https://learn.microsoft.com/azure/virtual-machines/resource-graph-samples
- Azure Resource Graph advanced samples: https://learn.microsoft.com/azure/governance/resource-graph/samples/advanced
- Azure CLI `az graph query` reference: https://learn.microsoft.com/cli/azure/graph
- Azure CLI `az disk delete` reference: https://learn.microsoft.com/cli/azure/disk
- Azure CLI guidance for finding and deleting unattached disks: https://learn.microsoft.com/azure/virtual-machines/linux/find-unattached-disks
- Azure portal guidance for unattached disks and disk cost behavior: https://learn.microsoft.com/azure/virtual-machines/disks-find-unattached-portal
- Azure public IP address documentation: https://learn.microsoft.com/azure/virtual-network/ip-services/public-ip-addresses
- Azure public IP pricing: https://azure.microsoft.com/pricing/details/ip-addresses/
- Azure Managed Disks pricing: https://azure.microsoft.com/pricing/details/managed-disks/
- Azure Load Balancer backend address pool resource reference: https://learn.microsoft.com/azure/templates/microsoft.network/loadbalancers/backendaddresspools
- Kusto `array_length()` documentation: https://learn.microsoft.com/kusto/query/array-length-function
- Kusto `isnull()` documentation: https://learn.microsoft.com/kusto/query/isnull-function
- Kusto `case()` documentation: https://learn.microsoft.com/kusto/query/case-function
- PowerShell `Search-AzGraph` documentation: https://learn.microsoft.com/powershell/module/az.resourcegraph/search-azgraph

## Issues Found
- The first unattached disk query converted `properties.diskSizeGB` to a string and then sorted by it. Changed it to `toint(properties.diskSizeGB)` so sorting by size is numeric instead of lexicographic.
- The load balancer query checked only the first backend pool and compared `loadBalancerBackendAddresses` to the string `"[]"`. Replaced it with a query that expands all backend pools and counts both NIC-backed `backendIPConfigurations` and IP-based `loadBalancerBackendAddresses`.
- The deallocated VM section said Resource Graph does not track runtime power state directly and only projected provisioning state. Updated the query and explanation to use `properties.extended.instanceView.powerState.code`, which Microsoft documents for Resource Graph VM power-state queries.
- The PowerShell report query for unassociated public IPs did not exclude public IPs associated with NAT gateways, while the main public IP query did. Updated the PowerShell query to match the main query.

## Review Notes
- The local Azure CLI was not installed in the review environment, so CLI flags were verified against Microsoft Learn rather than local `az --help`.
- The hardcoded disk cost estimates are directional and region-dependent. The post already warns readers not to treat them as billing estimates.
