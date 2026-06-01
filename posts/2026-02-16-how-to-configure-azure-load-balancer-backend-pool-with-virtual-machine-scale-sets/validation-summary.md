# Validation Summary: How to Configure Azure Load Balancer Backend Pool

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Load Balancer
- Azure Virtual Machine Scale Sets
- Azure CLI
- Azure Monitor autoscale and metric alerts
- Azure Load Balancer health probes
- Python graceful shutdown signal handling

## Sources Consulted
- Microsoft Learn: az network lb CLI reference: https://learn.microsoft.com/en-us/cli/azure/network/lb
- Microsoft Learn: az network lb probe CLI reference: https://learn.microsoft.com/en-us/cli/azure/network/lb/probe
- Microsoft Learn: az network lb rule CLI reference: https://learn.microsoft.com/en-us/cli/azure/network/lb/rule
- Microsoft Learn: az vmss CLI reference: https://learn.microsoft.com/en-us/cli/azure/vmss
- Microsoft Learn: Set the upgrade policy mode on Virtual Machine Scale Sets: https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/virtual-machine-scale-sets-set-upgrade-policy
- Microsoft Learn: Configure rolling upgrades on Virtual Machine Scale Sets: https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/virtual-machine-scale-sets-configure-rolling-upgrades
- Microsoft Learn: Azure Load Balancer health probes: https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-custom-probe-overview
- Microsoft Learn: Azure Load Balancer TCP reset and idle timeout: https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-tcp-reset
- Microsoft Learn: Configure inbound NAT rules for Virtual Machine Scale Sets: https://learn.microsoft.com/en-us/azure/load-balancer/configure-inbound-nat-rules-vm-scale-set
- Microsoft Learn: Inbound NAT rules: https://learn.microsoft.com/en-us/azure/load-balancer/inbound-nat-rules
- Microsoft Learn: Supported metrics for Microsoft.Network/loadBalancers: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-network-loadbalancers-metrics
- Microsoft Learn: az monitor autoscale and autoscale rule CLI references: https://learn.microsoft.com/en-us/cli/azure/monitor/autoscale and https://learn.microsoft.com/en-us/cli/azure/monitor/autoscale/rule
- Microsoft Learn: az monitor metrics alert CLI reference: https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert
- Microsoft Learn: Terminate notification for Azure Virtual Machine Scale Set instances: https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/virtual-machine-scale-sets-terminate-notification

## Issues Found
- The Load Balancer metric alert used `HealthProbeStatus`, but the current Azure Monitor REST/API metric name for Load Balancer health probe status is `DipAvailability`. Updated the alert condition and metric list to use `DipAvailability`.
- The management-access section used `az network lb inbound-nat-pool create`. Inbound NAT pools are the older v1 model, and Microsoft recommends inbound NAT rule v2 for Standard Load Balancer deployments with VMSS. Updated the command to `az network lb inbound-nat-rule create` with `--backend-pool-name`.
- The graceful scale-in section implied VMSS sends `SIGTERM` directly to the application. VMSS termination notification is delivered through Azure Metadata Service Scheduled Events and must be enabled. Added `--terminate-notification-time 10` to the VMSS creation command and adjusted the shutdown-handler wording.
- The connection-draining wording said Load Balancer does not have built-in connection draining. Current Standard Load Balancer supports admin-state based draining behavior for backends, but application shutdown still needs to handle in-flight work during VM deletion. Updated the wording to reflect that nuance.

## Review Notes
Azure CLI was not installed in the local workspace, so command validation was performed against the current Microsoft Learn CLI references rather than local `az --help` output.
