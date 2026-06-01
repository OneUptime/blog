# Validation Summary: How to Configure Azure Load Balancer with Multiple Frontend IP Addresses

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Load Balancer
- Azure Public IP addresses
- Azure CLI
- Load balancing rules
- Backend address pools
- Health probes
- Outbound rules and SNAT
- Network Security Groups

## Sources Consulted
- Microsoft Learn: Multiple frontends - Azure Load Balancer: https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-multivip-overview
- Microsoft Learn: Manage a public IP address with a load balancer: https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/configure-public-ip-load-balancer
- Microsoft Learn: Azure subscription and service limits, quotas, and constraints: https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/azure-subscription-service-limits
- Microsoft Learn: Source Network Address Translation (SNAT) for outbound connections - Azure Load Balancer: https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-outbound-connections
- Microsoft Learn: Outbound rules Azure Load Balancer: https://learn.microsoft.com/en-us/azure/load-balancer/outbound-rules
- Microsoft Learn: Azure Load Balancer health probes: https://learn.microsoft.com/en-in/azure/load-balancer/load-balancer-custom-probe-overview
- Microsoft Learn: az network public-ip: https://learn.microsoft.com/en-us/cli/azure/network/public-ip
- Microsoft Learn: az network lb frontend-ip: https://learn.microsoft.com/en-us/cli/azure/network/lb/frontend-ip
- Microsoft Learn: az network lb rule: https://learn.microsoft.com/en-us/cli/azure/network/lb/rule
- Microsoft Learn: az network lb probe: https://learn.microsoft.com/en-us/cli/azure/network/lb/probe
- Microsoft Learn: az network lb outbound-rule: https://learn.microsoft.com/en-us/cli/azure/network/lb/outbound-rule
- Microsoft Learn: az network nic ip-config address-pool: https://learn.microsoft.com/en-us/cli/azure/network/nic/ip-config/address-pool

## Issues Found
- The post described websites as needing public IPs for "SSL termination at the DNS level." DNS does not terminate TLS, and Azure Load Balancer is a Layer 4 load balancer. Updated the wording to say TLS terminates on the backend VMs.
- The post described "IP-based routing" in a way that implied Azure Load Balancer makes geography or service-tier routing decisions. Updated this to client- or DNS-directed traffic separation.
- The shared backend pool example used two frontend rules targeting the same backend pool and same backend port without Floating IP. Microsoft documentation says Floating IP must be enabled for that pattern. Added `--enable-floating-ip true` to both rules and clarified the backend loopback requirement and destination IP behavior.
- The post said VMs could differentiate traffic by destination IP in the packet header without caveat. Updated the explanation to distinguish Floating IP behavior from the default destination NAT behavior.
- The outbound rule section implied a frontend IP can always be deterministically selected for SNAT. Clarified that a single configured frontend can make outbound traffic appear from that IP, while multiple frontend IPs in the same outbound rule can be used by Azure as needed.
- The monitoring section labeled a command as checking backend pool health, but the command only lists backend NIC associations. Updated the label to match what the command actually returns.
- The SNAT guidance said multiple frontend IPs provide 1024 ports per IP per backend instance. Updated this to reflect that each frontend IP contributes up to 64,000 ephemeral ports, with per-instance allocation depending on backend pool size and outbound rule configuration.
- The NSG guidance implied the `AzureLoadBalancer` service tag allows all inbound load-balanced traffic. Updated it to clarify that client traffic must be allowed separately and the service tag is for load balancer health probes.

## Review Notes
The Azure CLI was not installed in the local workspace, so CLI command validation was performed against Microsoft Learn CLI reference pages rather than local `az --help` output.
