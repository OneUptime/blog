# Validation Summary: How to Configure Azure Load Balancer Outbound Rules for SNAT Port Allocation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Load Balancer
- Azure CLI
- SNAT and outbound rules
- Azure Monitor metrics and metric alerts
- Azure NAT Gateway
- Azure Private Link

## Sources Consulted
- Azure Load Balancer outbound rules: https://learn.microsoft.com/en-us/azure/load-balancer/outbound-rules
- Source Network Address Translation (SNAT) for outbound connections: https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-outbound-connections
- Azure Load Balancer TCP Reset and idle timeout: https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-tcp-reset
- Azure CLI `az network lb outbound-rule`: https://learn.microsoft.com/en-us/cli/azure/network/lb/outbound-rule
- Azure CLI `az monitor metrics`: https://learn.microsoft.com/en-us/cli/azure/monitor/metrics
- Azure CLI `az monitor metrics alert`: https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert
- Azure Monitor supported metrics for Microsoft.Network/loadBalancers: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-network-loadbalancers-metrics
- Azure NAT Gateway SNAT documentation: https://learn.microsoft.com/en-us/azure/nat-gateway/nat-gateway-snat

## Issues Found
- The post stated that each Azure Load Balancer public IP provides 64,512 SNAT ports. Microsoft documentation states that each Load Balancer frontend IP provides up to 64,000 usable SNAT ports. Updated the Load Balancer examples, calculations, and formula to use 64,000. Left the NAT Gateway best-practice note unchanged because Azure NAT Gateway documentation does use 64,512 SNAT ports per public IP.
- The post described default SNAT allocation as roughly `64,512 / backend pool members`, giving about 645 ports per VM for 100 VMs. Microsoft documents default allocation by backend pool size; for 100 VMs and one frontend IP, each VM receives 512 ports. Updated the explanation and example.
- The Step 3 command said it was updating the outbound rule but used `az network lb outbound-rule create` with an existing rule name. Changed it to `az network lb outbound-rule update` and kept only the parameters needed to update frontend IP configurations and outbound port allocation.
- The idle timeout section said outbound rules can be set up to 30 minutes. Current Microsoft outbound-rule documentation lists the configurable outbound idle timeout range as 4 to 120 minutes. Updated the text.

## Review Notes
Azure documentation currently has some variation between Load Balancer idle-timeout pages, with one page describing a 4-to-100-minute range and the outbound-rules page describing 4 to 120 minutes for outbound rules. For this post, the outbound-rules-specific documentation was used because the article is specifically about outbound rules.
