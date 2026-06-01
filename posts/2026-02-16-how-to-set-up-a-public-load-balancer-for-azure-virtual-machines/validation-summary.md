# Validation Summary: How to Set Up a Public Load Balancer for Azure Virtual Machines

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Load Balancer
- Azure Public IP addresses
- Azure Virtual Machines
- Azure Virtual Network and subnets
- Azure Network Security Groups
- Azure CLI
- cloud-init
- nginx

## Sources Consulted
- Microsoft Learn: Quickstart: Create a public load balancer to load balance VMs using the Azure CLI - https://learn.microsoft.com/en-us/azure/load-balancer/quickstart-load-balancer-standard-public-cli
- Microsoft Learn: Azure Load Balancer health probes - https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-custom-probe-overview
- Microsoft Learn: Azure Load Balancer distribution modes - https://learn.microsoft.com/en-us/azure/load-balancer/distribution-mode-concepts
- Microsoft Learn: Outbound rules Azure Load Balancer - https://learn.microsoft.com/en-us/azure/load-balancer/outbound-rules
- Microsoft Learn: Source Network Address Translation (SNAT) for outbound connections - https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-outbound-connections
- Microsoft Learn: Load Balancer TCP Reset and Idle Timeout - https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-tcp-reset
- Microsoft Learn: Azure Load Balancer best practices - https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-best-practices
- Microsoft Learn: Azure Basic Load Balancer lifecycle - https://learn.microsoft.com/en-us/lifecycle/products/azure-basic-load-balancer
- Microsoft Learn Azure CLI reference: az network public-ip - https://learn.microsoft.com/en-us/cli/azure/network/public-ip
- Microsoft Learn Azure CLI reference: az network lb rule - https://learn.microsoft.com/en-us/cli/azure/network/lb/rule
- Microsoft Learn Azure CLI reference: az network lb outbound-rule - https://learn.microsoft.com/en-us/cli/azure/network/lb/outbound-rule
- Microsoft Learn Azure CLI reference: az network nsg rule - https://learn.microsoft.com/en-us/cli/azure/network/nsg/rule
- Microsoft Learn Azure CLI reference: az vm create - https://learn.microsoft.com/en-us/cli/azure/vm

## Issues Found
- Basic Load Balancer status was outdated. Updated the post to state that Basic Load Balancer was retired on September 30, 2025, rather than saying it is still being deprecated or will be retired.
- Standard Load Balancer pricing was described as a small monthly cost. Changed this to the more accurate statement that Standard Load Balancer incurs charges.
- Health probe threshold wording was too broad. Clarified that the 2-failure explanation applies to the TCP probe example and that HTTP probes verify successful HTTP responses.
- The NSG section said the NSG allows traffic from the load balancer, but the data traffic source is the client while health probes come from Azure Load Balancer. Updated the explanation and rule comment, and used the `Internet` service tag for public client traffic.
- The VM step referenced `cloud-init.yaml` before making clear that the file must exist. Added a note to save the shown cloud-init content as `cloud-init.yaml` before running the VM loop.
- The verification command was labeled as showing backend health status, but it only lists backend IP configuration IDs. Updated the wording to say it lists backend pool members.
- The curl test claimed responses should alternate between VMs. Azure Load Balancer uses hash-based distribution, so strict alternation is not guaranteed. Updated the expected result.
- The outbound rule section omitted the need to disable automatic outbound SNAT on inbound load balancing rules before an outbound rule takes control of the same frontend IP. Added `az network lb rule update --disable-outbound-snat true` commands, including a guarded update for the optional HTTPS rule.

## Review Notes
Azure CLI is not installed in this local environment, so command validation was performed against current Microsoft Learn CLI reference pages and Azure Load Balancer product documentation rather than local `az --help` output. The tutorial remains a valid Standard public load balancer walkthrough after the corrections.
