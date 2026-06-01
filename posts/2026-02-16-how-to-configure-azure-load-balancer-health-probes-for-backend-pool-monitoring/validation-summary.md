# Validation Summary: How to Configure Azure Load Balancer Health Probes for Backend Pool Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Load Balancer
- Azure Load Balancer health probes
- Azure CLI
- Azure Monitor metrics
- Network Security Groups
- Node.js / Express
- Python / Flask

## Sources Consulted
- Microsoft Learn: Azure Load Balancer health probes - https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-custom-probe-overview
- Microsoft Learn: Azure CLI `az network lb probe` reference - https://learn.microsoft.com/en-us/cli/azure/network/lb/probe
- Microsoft Learn: Azure CLI `az network lb rule` reference - https://learn.microsoft.com/en-us/cli/azure/network/lb/rule
- Microsoft Learn: Azure CLI `az network nic ip-config address-pool` reference - https://learn.microsoft.com/en-us/cli/azure/network/nic/ip-config/address-pool
- Microsoft Learn: Load Balancer TCP Reset and Idle Timeout - https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-tcp-reset
- Microsoft Learn: Supported metrics for Microsoft.Network/loadBalancers - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-network-loadbalancers-metrics
- Microsoft Learn: Azure IP address 168.63.129.16 overview - https://learn.microsoft.com/en-us/azure/virtual-network/what-is-ip-address-168-63-129-16

## Issues Found
- Corrected probe traffic behavior to say a failed probe stops new connections to an unhealthy backend, rather than implying all existing traffic is stopped.
- Clarified that HTTPS health probes are supported by Standard Load Balancer, while Basic Load Balancer supports only TCP and HTTP probes.
- Corrected HTTP/HTTPS probe threshold behavior: explicit 200 and non-200 responses take effect immediately, while the threshold mainly applies to no-response timeout cases.
- Updated the HTTPS probe certificate guidance. The post previously said self-signed certificates work without qualification; Microsoft documents that the certificate chain must use at least SHA-256 signature hashes and that HTTPS probes do not support mutual client certificate authentication.
- Fixed the backend pool CLI example so it adds both created VM NICs to the backend pool instead of only `vm-web-1VMNic`.
- Corrected the TCP reset explanation. TCP reset applies to matching TCP flows on idle timeout, not specifically when a backend becomes unhealthy.
- Replaced the reference to increasing a health probe timeout. Azure Load Balancer does not expose a configurable HTTP/S probe timeout; HTTP/S probe timeout is built in.
- Updated Azure Monitor metric wording to match current metric names: Health Probe Status (`DipAvailability`) and Data Path Availability (`VipAvailability`).

## Review Notes
The Azure CLI was not installed in the local environment, so CLI validation was performed against current Microsoft Learn command references rather than local `az --help` output. The sample application snippets are illustrative and depend on surrounding Express and Flask application setup, but the endpoint logic is consistent with Azure Load Balancer HTTP probe behavior.
