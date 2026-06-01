# Validation Summary: How to Build a Multi-Tenant SaaS Application with Azure App Service

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure App Service
- Azure App Service custom domains
- App Service managed certificates and TLS bindings
- Azure Front Door Standard/Premium
- Azure CLI
- Azure Resource Manager SDK for .NET
- ASP.NET Core middleware and background services
- DNS CNAME, A/ALIAS, and TXT records
- Azure SQL Database / T-SQL
- DnsClient.NET

## Sources Consulted
- Azure App Service custom domain documentation: https://learn.microsoft.com/azure/app-service/app-service-web-tutorial-custom-domain
- Azure App Service TLS/SSL certificate documentation: https://learn.microsoft.com/en-us/azure/app-service/configure-ssl-certificate
- Azure App Service TLS overview: https://learn.microsoft.com/en-us/azure/app-service/overview-tls
- Azure App Service limits: https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/azure-subscription-service-limits
- Azure App Service plan documentation: https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans
- Azure CLI `az appservice plan create`: https://learn.microsoft.com/en-us/cli/azure/appservice/plan
- Azure CLI `az webapp config hostname add`: https://learn.microsoft.com/en-us/cli/azure/webapp/config/hostname
- Azure CLI `az webapp config ssl create`: https://learn.microsoft.com/en-us/cli/azure/webapp/config/ssl
- Azure CLI `az afd custom-domain create`: https://learn.microsoft.com/en-us/cli/azure/afd/custom-domain
- Azure Front Door custom domain HTTPS documentation: https://learn.microsoft.com/en-us/azure/frontdoor/standard-premium/how-to-configure-https-custom-domain
- Azure App Service Certificates REST API: https://learn.microsoft.com/en-us/rest/api/appservice/certificates/create-or-update
- Azure SDK for .NET `SubscriptionData`: https://learn.microsoft.com/en-us/dotnet/api/azure.resourcemanager.resources.subscriptiondata
- DnsClient.NET `TxtRecord`: https://dnsclient.michaco.net/docs/DnsClient.Protocol.TxtRecord.html

## Issues Found
- The architecture diagram implied TLS certificates were stored in Azure Key Vault while the article primarily discusses free App Service managed certificates. Updated the diagram to show App Service managed certificates.
- The App Service plan requirement said Standard tier was required for custom domains with TLS. Microsoft documentation shows Basic and higher support SNI SSL; Standard is still a reasonable example tier. Updated the wording.
- The Azure CLI runtime value used `DOTNET|8.0`, which is the App Service Linux FX version format, not the `az webapp create --runtime` value. Updated it to `DOTNETCORE:8.0`.
- The tenant DNS verification code used a custom `_verify` TXT record containing the tenant ID, but App Service custom domain mapping uses the app's `asuid` custom domain verification ID. Updated the code and tenant instructions to use `asuid`.
- The DNS TXT comparison assumed `TxtRecord.Text` could be checked directly with `Contains(string)`. DnsClient.NET exposes TXT values as a collection, so the code now checks each value explicitly.
- The certificate manager built the App Service plan resource ID using `subscription.Id`, which is already a resource identifier. Updated the code to use `subscription.Data.SubscriptionId`.
- The DNS instructions said a CNAME should point the tenant domain to App Service in all cases. Updated the wording to distinguish subdomains from apex domains, where A/ALIAS records are appropriate.
- The Azure Front Door section overstated scale as thousands of custom domains. Updated it to the documented Premium limit of 500 custom domains per profile.
- The Azure Front Door CLI example omitted a TLS minimum version. Added `--minimum-tls-version TLS12`, matching the official CLI example for managed certificates.
- The wildcard subdomain section implied free App Service managed certificates could cover wildcard names. Updated it to state that wildcard certificates must be uploaded/imported/purchased because free App Service managed certificates do not support wildcard certificates.

## Review Notes
The local environment did not have the Azure CLI installed, so CLI syntax was checked against Microsoft Learn rather than local `az --help` output. The C# snippets remain illustrative and assume surrounding interfaces, dependency registration, and Azure SDK package references exist in the real application.
