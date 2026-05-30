# Validation Summary: How to Set Up Azure Front Door with Custom Domain and HTTPS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Front Door Standard/Premium
- Azure CDN edge caching
- Azure CLI
- Custom domains
- DNS TXT and CNAME records
- Managed TLS/HTTPS certificates
- Origin groups, origins, routes, health probes, and routing

## Sources Consulted
- Microsoft Learn: Azure CLI `az afd custom-domain` reference, https://learn.microsoft.com/en-us/cli/azure/afd/custom-domain?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az afd route` reference, https://learn.microsoft.com/en-us/cli/azure/afd/route?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az afd endpoint` reference, https://learn.microsoft.com/en-us/cli/azure/afd/endpoint?view=azure-cli-lts
- Microsoft Learn: Azure CLI `az afd origin-group` reference, https://learn.microsoft.com/en-us/cli/azure/afd/origin-group?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az afd origin` reference, https://learn.microsoft.com/en-us/cli/azure/afd/origin?view=azure-cli-latest
- Microsoft Learn: Configure a custom domain on Azure Front Door, https://learn.microsoft.com/en-gb/azure/frontdoor/standard-premium/how-to-add-custom-domain
- Microsoft Learn: Add a new endpoint with Front Door manager, https://learn.microsoft.com/en-us/azure/frontdoor/how-to-configure-endpoints
- Microsoft Learn: Traffic routing methods to origin, https://learn.microsoft.com/en-us/azure/frontdoor/routing-methods
- Microsoft Learn: Azure Front Door overview, https://learn.microsoft.com/en-us/azure/frontdoor/front-door-overview

## Issues Found
- The post used `myapp-endpoint.z01.azurefd.net` as the generated endpoint hostname. Azure Front Door Standard/Premium generates endpoint hostnames in the form `<endpointname>-<hash>.z01.azurefd.net`. Updated the text to show the hashed format and added an `az afd endpoint show --query "hostName"` command so readers can retrieve the exact hostname.
- The DNS CNAME example pointed to the hard-coded endpoint hostname. Updated it to instruct readers to use the exact endpoint hostname returned from Step 2.
- The routing explanation described traffic as going to the closest or nearest backend. Azure Front Door routing is based on healthy origins, priority, latency sensitivity, and weights rather than simple geographic proximity. Updated the explanation to describe health and measured-latency-based routing.

## Review Notes
The Azure CLI was not installed in the local workspace, so command validation was performed against official Microsoft Learn Azure CLI reference pages instead of local `az --help` output. The reviewed CLI parameters are current and non-deprecated in the official documentation as of 2026-05-30.
