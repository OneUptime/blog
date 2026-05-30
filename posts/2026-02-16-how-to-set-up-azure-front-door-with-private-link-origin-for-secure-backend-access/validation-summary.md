# Validation Summary: How to Set Up Azure Front Door with Private Link Origin

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Front Door Premium
- Azure Private Link
- Azure App Service
- Azure Storage
- Azure Standard Load Balancer
- Azure Private Link Service
- Azure CLI

## Sources Consulted
- Azure Front Door Private Link overview: https://learn.microsoft.com/en-us/azure/frontdoor/private-link
- Connect Azure Front Door Premium to an App Service origin with Private Link: https://learn.microsoft.com/en-us/azure/frontdoor/standard-premium/how-to-enable-private-link-web-app
- Connect Azure Front Door Premium to a storage account origin with Private Link: https://learn.microsoft.com/en-us/azure/frontdoor/standard-premium/how-to-enable-private-link-storage-account
- Connect Azure Front Door Premium to an internal load balancer origin with Private Link: https://learn.microsoft.com/en-us/azure/frontdoor/standard-premium/how-to-enable-private-link-internal-load-balancer
- Azure CLI `az afd origin` reference: https://learn.microsoft.com/en-us/cli/azure/afd/origin
- Azure CLI `az afd route` reference: https://learn.microsoft.com/en-us/cli/azure/afd/route
- Azure CLI `az network private-link-service` reference: https://learn.microsoft.com/en-us/cli/azure/network/private-link-service
- Azure App Service private endpoint documentation: https://learn.microsoft.com/en-us/azure/app-service/overview-private-endpoint

## Issues Found
- The post described the Front Door private endpoint as being on the backend resource or in the customer VNet. Microsoft documents that Azure Front Door creates the private endpoint in an Azure Front Door managed regional private network. Updated the explanation and diagram accordingly.
- The App Service `az afd origin create` example omitted `--private-link-sub-resource-type sites`, which Microsoft documents as the App Service target subresource for Front Door Private Link origins. Added the flag.
- The App Service approval example used `az webapp update` to mutate `privateEndpointConnections[0]`. Microsoft documents using `az network private-endpoint-connection list` and `az network private-endpoint-connection approve`. Replaced the commands.
- The route example did not link the route to the endpoint default domain. Because the tutorial creates only a default Front Door endpoint and no custom domain, added `--link-to-default-domain Enabled`.
- The Private Link Service create example passed `--auto-approval ""`. The CLI expects a space-separated list of subscription IDs when this option is used, so the empty value was removed.
- The introduction made an absolute claim that the backend has no public IP. That is not precise for PaaS origins such as App Service and Storage, where the goal is to disable public access. Reworded the claim to focus on not accepting public traffic.

## Review Notes
Azure CLI was not installed in the local environment, so command verification was performed against Microsoft Learn CLI reference pages rather than local `az --help` output.
