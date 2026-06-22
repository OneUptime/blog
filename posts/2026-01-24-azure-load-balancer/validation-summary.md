# Validation Summary: How to Configure Azure Load Balancer

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Azure Load Balancer
- Azure CLI
- Azure Monitor
- Azure Virtual Network and network interfaces
- Azure Virtual Machines
- Flask
- psycopg2

## Sources Consulted
- Microsoft Learn: Azure CLI `az network lb probe` reference: https://learn.microsoft.com/en-us/cli/azure/network/lb/probe?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az network lb rule` reference: https://learn.microsoft.com/en-us/cli/azure/network/lb/rule?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az network lb outbound-rule` reference: https://learn.microsoft.com/en-us/cli/azure/network/lb/outbound-rule?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az network lb frontend-ip` reference: https://learn.microsoft.com/en-us/cli/azure/network/lb/frontend-ip?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az network nic` and `az network nic ip-config inbound-nat-rule` references: https://learn.microsoft.com/en-us/cli/azure/network/nic?view=azure-cli-latest and https://learn.microsoft.com/en-us/cli/azure/network/nic/ip-config/inbound-nat-rule?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az network public-ip` reference: https://learn.microsoft.com/en-us/cli/azure/network/public-ip?view=azure-cli-latest
- Microsoft Learn: Azure Load Balancer monitoring data reference: https://learn.microsoft.com/en-us/azure/load-balancer/monitor-load-balancer-reference
- Microsoft Learn: Supported Azure Monitor metrics for Microsoft.Network/loadBalancers: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-network-loadbalancers-metrics
- Microsoft Learn: Azure Load Balancer outbound rules: https://learn.microsoft.com/en-us/azure/load-balancer/outbound-rules
- Microsoft Learn: Azure Load Balancer distribution modes: https://learn.microsoft.com/en-us/azure/load-balancer/distribution-mode-concepts

## Issues Found
- The inbound NAT example created SSH NAT rules for VM1 and VM2 but only associated the VM1 rule with a NIC. Added the matching association for `myNatRuleSSH2` and `myNic2`.
- The outbound rules section stated that Standard Load Balancer requires outbound rules for internet access. Updated the wording to say explicit outbound connectivity, such as outbound rules, should be configured for predictable outbound connectivity. Microsoft documents outbound rules as an explicit SNAT option, while public Standard Load Balancer load-balancing rules can also provide outbound NAT behavior.
- The diagnostic settings command used obsolete log categories (`LoadBalancerAlertEvent` and `LoadBalancerProbeHealthStatus`). Replaced them with the current supported resource log category, `LoadBalancerHealthEvent`.
- The health probe metric query and metrics table used `HealthProbeStatus`, which is not the documented REST/API metric name. Replaced it with `DipAvailability` used by Azure Monitor.
- The Flask health endpoint referenced `DATABASE_URL` without defining it. Added an environment-variable lookup so the snippet is runnable when `DATABASE_URL` is configured.

## Review Notes
- The Azure CLI examples could not be run end-to-end because this environment does not have Azure CLI installed and no Azure subscription context was available. Commands and flags were validated against current Microsoft Learn CLI references instead.
- The probe `--threshold` option remains valid as an alias for `--number-of-probes`; this is distinct from the newer `--probe-threshold` preview setting that Microsoft does not recommend for most production scenarios.
