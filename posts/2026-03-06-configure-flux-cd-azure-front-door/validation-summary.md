# Validation Summary: How to Configure Flux CD with Azure Front Door

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Flux CD
- Azure Front Door Standard/Premium
- Azure Web Application Firewall
- Azure Service Operator
- Azure Kubernetes Service
- Kubernetes Deployments, Services, and custom resources
- Azure CLI
- Azure Monitor diagnostic settings
- Microsoft Teams notifications for Flux

## Sources Consulted
- Azure Front Door CLI quickstart: https://learn.microsoft.com/en-us/azure/frontdoor/create-front-door-cli
- Azure CLI `az afd profile` reference: https://learn.microsoft.com/en-us/cli/azure/afd/profile
- Azure resource group CLI reference: https://learn.microsoft.com/en-us/cli/azure/manage-azure-groups-azure-cli
- Azure Front Door Private Link for internal load balancer origins: https://learn.microsoft.com/en-us/azure/frontdoor/standard-premium/how-to-enable-private-link-internal-load-balancer
- Azure Service Operator CDN v1api20230501 reference: https://azure.github.io/azure-service-operator/reference/cdn/v1api20230501/
- Azure Service Operator Front Door WAF v1api20220501 reference: https://azure.github.io/azure-service-operator/reference/network.frontdoor/v1api20220501/
- Azure Service Operator resource group v1api20200601 reference: https://azure.github.io/azure-service-operator/reference/resources/v1api20200601/
- Azure Service Operator CRD management guide: https://azure.github.io/azure-service-operator/guide/crd-management/
- Azure Service Operator ownership guide: https://azure.github.io/azure-service-operator/guide/ownership/
- Azure Front Door WAF Default Rule Set documentation: https://learn.microsoft.com/en-us/azure/web-application-firewall/afds/waf-front-door-drs
- Flux notification Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux notification Alert API reference: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Azure Front Door logs documentation: https://learn.microsoft.com/en-us/azure/frontdoor/standard-premium/how-to-logs
- Azure Front Door monitoring data reference: https://learn.microsoft.com/en-us/azure/frontdoor/monitor-front-door-reference

## Issues Found
- The resource group command used `--location global`. Azure resource groups require a supported Azure region, so this was changed to `eastus`.
- The guide used Azure Front Door Standard while also configuring Private Link and DRS 2.1 managed WAF rules. Private Link to internal load balancer origins and DRS 2.1 require Azure Front Door Premium, so the profile SKU was changed to `Premium_AzureFrontDoor`.
- The AKS internal load balancer was described as directly usable by Front Door. Azure Front Door Premium reaches internal load balancer origins through Private Link, so the prerequisites, service comment, origin configuration, and summary were updated to include Private Link.
- The Azure Service Operator installation did not specify CRD patterns. ASO v2 uses `crdPattern` to install selected CRDs, so the needed resource, CDN, and Front Door WAF patterns were added.
- The ASO child resources referenced a Front Door profile by owner name but did not define a Kubernetes `Profile` or `ResourceGroup` resource. Added those resources so the owner chain resolves under ASO.
- The route used `kind: AfdRoute`, but ASO exposes the resource as `kind: Route` in `cdn.azure.com/v1api20230501`. Updated the route kind and troubleshooting command.
- The private origin omitted `sharedPrivateLinkResource`. Added the ASO field required to connect a Premium Front Door origin through an Azure Private Link service.
- The WAF policy used the wrong API group and omitted required ASO ownership and SKU details. Updated it to `network.frontdoor.azure.com/v1api20220501`, added a resource-group owner, and set the SKU.
- The WAF policy included `requestBodyInspectLimitInKB`, which is not part of ASO's Front Door WAF v1api20220501 `PolicySettings`. Removed that field.
- The WAF policy was created but not associated with the Front Door endpoint. Added a `SecurityPolicy` resource to bind the WAF policy to the Front Door endpoint path.
- The custom domain was created but not referenced by the route. Added a `customDomains` reference on the route.
- Flux notification resources used `notification.toolkit.fluxcd.io/v1`, but current Flux Alert and Provider examples use `v1beta3`. Updated both resources.
- The ASO controller deployment name in the troubleshooting command was incorrect. Updated it to `azureserviceoperator-controller-manager`.
- The diagnostic log category used `FrontDoorWebApplicationFirewallLog`; current Azure Front Door Standard/Premium log references use `FrontdoorWebApplicationFirewallLog`. Updated the command.

## Review Notes
The YAML snippets were parsed successfully after edits. Azure CLI could not be checked locally because `az` is not installed in this environment, so CLI verification was done against Microsoft Learn command references.
