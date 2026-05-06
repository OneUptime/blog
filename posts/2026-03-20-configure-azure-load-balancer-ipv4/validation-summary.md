# Validation Summary: How to Configure Azure Load Balancer for IPv4 Traffic

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Load Balancer
- Azure CLI
- Azure Public IP
- Azure Virtual Network
- Azure Network Interface
- Azure Monitor metrics

## Sources Consulted
- Microsoft Learn: Azure Load Balancer components — https://learn.microsoft.com/en-gb/azure/load-balancer/components
- Microsoft Learn: Quickstart: Create a public load balancer to load balance VMs using the Azure CLI — https://learn.microsoft.com/en-us/azure/load-balancer/quickstart-load-balancer-standard-public-cli
- Microsoft Learn: Quickstart: Create an internal load balancer to load balance VMs using the Azure CLI — https://learn.microsoft.com/en-us/azure/load-balancer/quickstart-load-balancer-standard-internal-cli
- Microsoft Learn: Azure Load Balancer health probes — https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-custom-probe-overview
- Microsoft Learn: Get Load Balancer metrics with Azure Monitor CLI — https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-monitor-metrics-cli
- Microsoft Learn: `az network public-ip` — https://learn.microsoft.com/en-us/cli/azure/network/public-ip?view=azure-cli-lts
- Microsoft Learn: `az network lb` — https://learn.microsoft.com/en-us/cli/azure/network/lb?view=azure-cli-lts
- Microsoft Learn: `az network lb probe` — https://learn.microsoft.com/en-us/cli/azure/network/lb/probe?view=azure-cli-lts
- Microsoft Learn: `az network lb inbound-nat-rule` — https://learn.microsoft.com/en-us/cli/azure/network/lb/inbound-nat-rule?view=azure-cli-lts
- Microsoft Learn: `az network nic ip-config address-pool` — https://learn.microsoft.com/en-us/cli/azure/network/nic/ip-config/address-pool?view=azure-cli-lts
- Microsoft Learn: `az network nic ip-config inbound-nat-rule` — https://learn.microsoft.com/en-us/cli/azure/network/nic/ip-config/inbound-nat-rule?view=azure-cli-latest

## Issues Found
- The introduction said Standard Load Balancer supports "high-port rules" and "backend pools with any resource." I changed this to HA port rules and backend pools that contain NIC IP configurations or IP addresses, which matches Microsoft Learn terminology and capability descriptions.
- The post did not explicitly specify IPv4 when creating the public frontend IP or the internal private frontend IP. I added `--version IPv4` and `--private-ip-address-version IPv4` to make the configuration match the post's IPv4 scope.
- The backend pool membership examples used `az network nic ip-config update`. I changed them to `az network nic ip-config address-pool add`, which is the current documented command path used in Microsoft Learn quickstarts for attaching NIC IP configurations to a load balancer backend pool.
- The inbound NAT rule example created the rule but did not associate it with VM 1's NIC IP configuration. I added `az network nic ip-config inbound-nat-rule add` so the NAT rule actually forwards traffic to the intended VM.
- The "Viewing Load Balancer Health" section queried backend IP configuration IDs, which shows configuration membership rather than health. I replaced it with `az monitor metrics list --metric DipAvailability`, which is the documented Azure Monitor CLI metric for Standard Load Balancer health probe status.
- The post omitted an important Standard Load Balancer prerequisite around NSGs. I added a short sentence noting that backend NICs must be associated with an NSG and that probe/application ports must be allowed for traffic to flow.

## Review Notes
- The HTTP probe example is valid, but it assumes the backend application serves a successful response on `/health` over port 80. If that endpoint does not exist or returns a non-200 response, the backend will be marked unhealthy.
- The inbound NAT example uses the single-VM style of NAT rule association, which remains valid, but Microsoft recommends inbound NAT rule v2 for Standard Load Balancer deployments and notes that inbound NAT rule v1 is scheduled for retirement on September 30, 2027.
