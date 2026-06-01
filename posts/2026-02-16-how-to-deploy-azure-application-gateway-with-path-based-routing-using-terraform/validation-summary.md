# Validation Summary: How to Deploy Azure Application Gateway with Path-Based Routing Using Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure Application Gateway v2
- Azure Virtual Network and subnets
- Azure Public IP
- URL path-based routing
- Backend HTTP settings and health probes
- TLS certificates and Key Vault certificate references
- Azure Monitor diagnostic logs and Log Analytics

## Sources Consulted
- HashiCorp Terraform Registry: azurerm_application_gateway resource documentation - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/application_gateway
- Microsoft Learn: Azure Application Gateway URL path based routing overview - https://learn.microsoft.com/en-us/azure/application-gateway/url-route-overview
- Microsoft Learn: Azure Application Gateway infrastructure configuration - https://learn.microsoft.com/en-us/azure/application-gateway/configuration-infrastructure
- Microsoft Learn: Application Gateway request routing rules configuration - https://learn.microsoft.com/en-us/azure/application-gateway/configuration-request-routing-rules
- Microsoft Learn: Azure Application Gateway backend settings configuration - https://learn.microsoft.com/en-us/azure/application-gateway/configuration-http-settings
- Microsoft Learn: What is Azure Application Gateway v2? - https://learn.microsoft.com/en-us/azure/application-gateway/overview-v2
- Microsoft Learn: TLS termination with Key Vault certificates - https://learn.microsoft.com/en-us/azure/application-gateway/key-vault-certs
- Microsoft Learn: Diagnostic logs for Application Gateway - https://learn.microsoft.com/en-us/azure/application-gateway/application-gateway-diagnostics
- Microsoft Learn: Static website hosting in Azure Storage - https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-static-website

## Issues Found
No technical issues found.

## Review Notes
The Terraform configuration uses current AzureRM Application Gateway block names and values, including v2 SKU autoscaling, Standard static public IP, path-based request routing with priorities, URL path maps, backend HTTP settings, probes, listeners, and redirect configuration. Microsoft documentation confirms that Application Gateway requires a dedicated subnet and that /24 is a recommended size for v2 autoscaling headroom.

The App Service host-header guidance is accurate for common App Service backend configurations where the backend FQDN should be used as the host header. For App Services using custom domains, Azure documentation notes that host-header override behavior depends on the backend domain model, so future expansions of the post could mention that caveat.

Terraform was not installed in the review environment, so the HCL snippets were checked against official provider documentation rather than by running `terraform validate`.
