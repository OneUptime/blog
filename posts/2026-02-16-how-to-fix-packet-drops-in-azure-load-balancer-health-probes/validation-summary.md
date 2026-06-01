# Validation Summary: How to Fix Packet Drops in Azure Load Balancer Health Probes

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure Load Balancer
- Azure Load Balancer health probes
- Azure Monitor metrics
- Azure Network Security Groups
- Azure CLI
- Linux iptables
- Windows Firewall
- Flask

## Sources Consulted
- Azure Load Balancer health probes: https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-custom-probe-overview
- Manage Azure Load Balancer health probes: https://learn.microsoft.com/en-ca/azure/load-balancer/manage-probes-how-to
- Troubleshoot Azure Load Balancer health probe status: https://learn.microsoft.com/en-us/troubleshoot/azure/load-balancer/load-balancer-troubleshoot-health-probe-status
- Azure IP address 168.63.129.16 overview: https://learn.microsoft.com/en-in/azure/virtual-network/what-is-ip-address-168-63-129-16
- Azure Load Balancer monitoring data reference: https://learn.microsoft.com/en-us/azure/load-balancer/monitor-load-balancer-reference
- Azure CLI `az network lb probe`: https://learn.microsoft.com/en-us/cli/azure/network/lb/probe
- Azure CLI `az network nsg rule`: https://learn.microsoft.com/en-us/cli/azure/network/nsg/rule
- Azure CLI `az network nic show-effective-route-table`: https://learn.microsoft.com/en-us/cli/azure/network/nic
- Azure CLI `az network lb rule`: https://learn.microsoft.com/en-us/cli/azure/network/lb/rule

## Issues Found
- The introduction stated that if all backend probes fail, the entire service goes down. Updated this to say no new flows are sent to the backend pool, which matches Azure Load Balancer probe-down behavior and avoids overstating established TCP flow handling.
- The health probe overview described the timeout period as configurable. Azure Load Balancer probe interval and threshold are configurable, but TCP timeout behavior is interval-based and HTTP/HTTPS probes use a built-in timeout of up to 30 seconds. Updated the wording.
- The probe configuration section said a short timeout could be adjusted. Reworded this to interval and built-in HTTP/HTTPS timeout behavior.
- The overload mitigation section advised increasing probe timeout. Replaced this with increasing probe interval or unhealthy threshold, which are supported probe settings.
- The asymmetric routing section suggested UDRs could redirect traffic destined for 168.63.129.16 through an NVA. Microsoft documents 168.63.129.16 as not subject to user-defined routes, so the section was corrected to focus on multi-NIC response paths and appliances that translate or proxy probes incorrectly.

## Review Notes
The Azure CLI examples use current command groups and supported flags based on the official Azure CLI reference. The `DipAvailability` metric is valid for Azure Load Balancer health probe status and can be split by dimensions such as backend IP address and backend port when deeper per-backend analysis is needed.
