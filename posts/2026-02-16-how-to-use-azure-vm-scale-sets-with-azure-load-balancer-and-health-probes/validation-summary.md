# Validation Summary: How to Use Azure VM Scale Sets with Azure Load Balancer and Health Probes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Virtual Machine Scale Sets
- Azure Load Balancer
- Azure CLI
- Azure Monitor metrics
- Azure Network Security Groups
- Python Flask health endpoint

## Sources Consulted
- Microsoft Learn: Azure Load Balancer SKUs - https://learn.microsoft.com/en-us/azure/load-balancer/skus
- Microsoft Learn: Azure subscription and service limits, quotas, and constraints - https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/azure-subscription-service-limits
- Microsoft Learn: Azure Load Balancer health probes - https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-custom-probe-overview
- Microsoft Learn: Azure Load Balancer distribution modes - https://learn.microsoft.com/en-us/azure/load-balancer/distribution-mode-concepts
- Microsoft Learn: Configure Azure Load Balancer distribution mode - https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-distribution-mode
- Microsoft Learn: Azure CLI az network lb - https://learn.microsoft.com/en-us/cli/azure/network/lb
- Microsoft Learn: Azure CLI az network lb probe - https://learn.microsoft.com/en-us/cli/azure/network/lb/probe
- Microsoft Learn: Azure CLI az vmss - https://learn.microsoft.com/en-us/cli/azure/vmss
- Microsoft Learn: Configure inbound NAT Rules for Virtual Machine Scale Sets - https://learn.microsoft.com/en-us/azure/load-balancer/configure-inbound-nat-rules-vm-scale-set
- Microsoft Learn: Inbound NAT rules - https://learn.microsoft.com/en-us/azure/load-balancer/inbound-nat-rules
- Microsoft Learn: Supported metrics for Microsoft.Network/loadBalancers - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-network-loadbalancers-metrics
- Microsoft Learn: Standard load balancer diagnostics with metrics, alerts, and resource health - https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-standard-diagnostics
- Microsoft Learn: Guidance for Virtual Machine Scale Sets with Azure Load Balancer - https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-standard-virtual-machine-scale-sets

## Issues Found
- The post said Azure offers two Load Balancer SKUs and that Basic Load Balancer is being deprecated. Updated this to note that Azure Load Balancer has Basic (retired), Standard, and Gateway SKUs, and that Basic Load Balancer was retired on September 30, 2025.
- The post said Standard Load Balancer supports up to 1,000 instances. Updated this to the current documented backend pool limit of 5,000.
- The HTTPS probe description said probes do not validate certificates. Updated the wording to reflect the current documented behavior: HTTPS probes run over TLS, require certificate chains using a minimum SHA-256 signature hash, require HTTP 200, and do not support mutual client certificate authentication.
- The VMSS SSH access example used `az network lb inbound-nat-pool create`. Updated it to `az network lb inbound-nat-rule create` with `--backend-pool-name`, matching current VMSS guidance and avoiding the inbound NAT pool retirement path.
- The Azure Monitor health probe metric command used `HealthProbeStatus`, which is the display name, not the REST/API metric name. Updated it to `DipAvailability` and clarified the display name in the metric list.
- The data path availability comment described `VipAvailability` as traffic throughput. Updated the comment to describe it as data path availability.
- The troubleshooting section labeled `az network lb probe show` as a per-instance health status command. Updated the label to say it checks probe configuration.

## Review Notes
- The Azure CLI binary was not installed in the local environment, so CLI command validation was performed against official Azure CLI documentation rather than local `az --help` output.
- The post remains a valid technical guide after the corrections. In future revisions, consider adding explicit notes for VMSS orchestration mode and outbound connectivity, because Azure behavior differs between Uniform and Flexible orchestration modes and Standard Load Balancer does not provide default outbound access without an explicit outbound path.
