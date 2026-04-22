# Validation Summary: How to Set Up Azure Application Gateway for IPv4 Load Balancing - Setup App

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Application Gateway
- Azure Application Gateway Standard_v2 and WAF_v2 SKUs
- Azure public IPv4 addresses
- Azure virtual networks and dedicated Application Gateway subnets
- Azure Application Gateway backend pools
- Azure Application Gateway HTTP settings, listeners, URL path maps, and request routing rules
- Azure Application Gateway SSL/TLS termination
- Azure Web Application Firewall policies
- Azure CLI

## Sources Consulted
- Application Gateway components: https://learn.microsoft.com/en-us/azure/application-gateway/application-gateway-components
- Application Gateway infrastructure configuration: https://learn.microsoft.com/en-us/azure/application-gateway/configuration-infrastructure
- Application Gateway v2 overview: https://learn.microsoft.com/en-us/azure/application-gateway/overview-v2
- Application Gateway request routing rules: https://learn.microsoft.com/en-us/azure/application-gateway/configuration-request-routing-rules
- Route web traffic based on the URL using Azure CLI: https://learn.microsoft.com/en-us/azure/application-gateway/tutorial-url-route-cli
- Enable Web Application Firewall using Azure CLI: https://learn.microsoft.com/en-us/azure/web-application-firewall/ag/tutorial-restrict-web-traffic-cli
- Create Web Application Firewall policies for Application Gateway: https://learn.microsoft.com/en-us/azure/web-application-firewall/ag/create-waf-policy-ag
- Azure CLI reference for `az network application-gateway`: https://learn.microsoft.com/en-us/cli/azure/network/application-gateway
- Azure CLI reference for `az network application-gateway address-pool`: https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/address-pool
- Azure CLI reference for `az network application-gateway url-path-map`: https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/url-path-map
- Azure CLI reference for `az network application-gateway rule`: https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/rule
- Azure CLI reference for `az network application-gateway http-listener`: https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/http-listener
- Azure CLI reference for `az network application-gateway ssl-cert`: https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/ssl-cert
- Azure CLI reference for `az network application-gateway frontend-port`: https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/frontend-port
- Azure CLI reference for `az network application-gateway waf-policy`: https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/waf-policy
- Azure CLI reference for `az network public-ip`: https://learn.microsoft.com/en-us/cli/azure/network/public-ip
- Azure CLI reference for `az network vnet subnet`: https://learn.microsoft.com/en-us/cli/azure/network/vnet/subnet

## Issues Found
- The URL path map was created but not associated with a request routing rule, so `/api/*` traffic would not actually use the path map. Added a `rule update` command that changes the default `rule1` to `PathBasedRouting` and attaches `url-path-map`.
- The HTTPS listener was created without a routing rule, so port 443 traffic would not be forwarded to the backend pool. Added an HTTPS request routing rule using `https-listener`, `appGatewayBackendPool`, and `appGatewayBackendHttpSettings`.
- The WAF enablement block used `az network application-gateway update --waf-policy`, but `--waf-policy` is not a supported parameter for the current `application-gateway update` command. Replaced it with a documented-compatible flow that reads the WAF policy resource ID, updates the gateway to WAF_v2, sets `sku.tier=WAF_v2`, and associates the policy through `firewallPolicy.id`.

## Review Notes
Azure CLI was not installed in the local environment, so command validation was performed against current Microsoft Learn CLI reference pages. The sample uses fixed `--capacity 2`; Standard_v2 and WAF_v2 support autoscaling and availability zones, but using those features requires explicit autoscale or zone configuration. Production deployments should also add custom health probes when the default probe does not match the application health endpoint.
