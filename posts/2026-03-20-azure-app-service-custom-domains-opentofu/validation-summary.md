# Validation Summary: How to Configure Azure App Service Custom Domains with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- Azure App Service
- Azure DNS
- OpenTofu / Terraform HCL
- AzureRM provider
- AzAPI provider
- DNS custom-domain verification with `CNAME`, `A`, and `TXT` records

## Sources Consulted
- Azure App Service custom domains: https://learn.microsoft.com/en-us/azure/app-service/app-service-web-tutorial-custom-domain?tabs=root%2Cazurecli
- Azure App Service inbound and outbound IP addresses: https://learn.microsoft.com/en-us/azure/app-service/overview-inbound-outbound-ips
- AzureRM `azurerm_linux_web_app` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/linux_web_app.html.markdown
- AzureRM `azurerm_service_plan` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/service_plan.html.markdown
- AzureRM `azurerm_app_service_custom_hostname_binding` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/app_service_custom_hostname_binding.html.markdown
- AzureRM `azurerm_dns_a_record` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/dns_a_record.html.markdown
- AzureRM `azurerm_dns_txt_record` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/dns_txt_record.html.markdown
- AzAPI provider overview: https://learn.microsoft.com/en-us/azure/developer/terraform/azapi/overview-azapi-provider
- AzAPI `azapi_resource` data source documentation: https://registry.terraform.io/providers/Azure/azapi/latest/docs/data-sources/resource

## Issues Found
- The apex-domain `A` record used `azurerm_linux_web_app.app.outbound_ip_address_list`, but Azure App Service requires the app's inbound IP for apex/root-domain mapping. I replaced it with an `azapi_resource` lookup of `properties.inboundIpAddress` and used that value in `azurerm_dns_a_record.apex`.
- The apex example created DNS records but never created the hostname binding for `example.com`. I added `azurerm_app_service_custom_hostname_binding.apex` so the apex custom domain is actually attached to the app.
- The Step 2 output description only described the `asuid.www` verification record. I updated it to cover `asuid.<subdomain>` and `asuid` for apex domains.
- The Step 4 comment implied that the hostname binding waited for DNS propagation. I removed that wording because `depends_on` only guarantees resource creation order inside OpenTofu.

## Review Notes
- Azure App Service custom domains require a paid App Service plan; Microsoft Learn explicitly excludes the Free (F1) tier.
- Azure App Service documents inbound and outbound IPs separately. The apex `A` record must use the inbound IP, and that inbound IP can change in some scenarios.
- Even with `depends_on`, public DNS propagation can still delay the first successful hostname-binding apply. A follow-up apply may still be needed if Azure cannot resolve the records yet.
