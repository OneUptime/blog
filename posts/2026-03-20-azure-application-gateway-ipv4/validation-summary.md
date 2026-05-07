# Validation Summary: How to Set Up Azure Application Gateway for IPv4 Load Balancing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Application Gateway
- Azure Virtual Network
- Azure Public IP
- Azure CLI
- Terraform (`azurerm_application_gateway`)

## Sources Consulted
- Microsoft Learn: Application Gateway infrastructure configuration - https://learn.microsoft.com/en-us/azure/application-gateway/configuration-infrastructure
- Microsoft Learn: `az network application-gateway` CLI reference - https://learn.microsoft.com/en-us/cli/azure/network/application-gateway?view=azure-cli-latest
- Microsoft Learn: `az network application-gateway address-pool` CLI reference - https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/address-pool?view=azure-cli-lts
- Microsoft Learn: `az network application-gateway http-settings` CLI reference - https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/http-settings?view=azure-cli-lts
- Microsoft Learn: `az network application-gateway probe` CLI reference - https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/probe?view=azure-cli-lts
- Microsoft Learn: `az network application-gateway url-path-map` CLI reference - https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/url-path-map?view=azure-cli-lts
- Microsoft Learn: `az network application-gateway rule` CLI reference - https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/rule?view=azure-cli-lts
- Microsoft Learn: `az network application-gateway http-listener` CLI reference - https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/http-listener?view=azure-cli-lts
- Microsoft Learn: `az network application-gateway ssl-cert` CLI reference - https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/ssl-cert?view=azure-cli-lts
- Microsoft Learn: Route web traffic based on the URL using the Azure CLI - https://learn.microsoft.com/en-us/azure/application-gateway/tutorial-url-route-cli
- Microsoft Learn: TLS termination using CLI - Azure Application Gateway - https://learn.microsoft.com/en-us/azure/application-gateway/tutorial-ssl-cli
- Terraform Registry: `azurerm_application_gateway` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/application_gateway

## Issues Found
- The prerequisites and subnet example used `/26` while the post provisions `Standard_v2`. Microsoft currently recommends a `/24` dedicated subnet for `Standard_v2` and `WAF_v2`, so the prerequisite text and subnet example were updated to `/24`.
- The `az network application-gateway create` example omitted request-routing rule priority. Current Application Gateway APIs require priority on routing rules, so `--priority 100` was added.
- The URL-based routing example created only a URL path map and referenced backend pools and HTTP settings that were never created. It was corrected to create the API backend pool and HTTP settings, use the existing default pool and settings for the fallback route, and update `rule1` to `PathBasedRouting` with the URL path map attached.
- The HTTPS section claimed to add a frontend listener but only created a frontend port. It was corrected by adding a listener update step that binds the uploaded certificate to the default listener.
- The Terraform placeholder comment used inaccurate nested block names for `azurerm_application_gateway`. It was updated to reference the current block names.

## Review Notes
- The Terraform example remains illustrative rather than complete; a working configuration still needs the full required nested blocks shown in the placeholder comment, including a `request_routing_rule` with priority.
- The Azure CLI was not installed in the local workspace, so command validation was performed against current Microsoft Learn CLI reference pages rather than local `az ... -h` output.
