# Validation Summary: How to Create Alias Records in Azure DNS to Point to Azure Resources

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure DNS
- Azure DNS alias records
- Azure CLI
- Azure Public IP
- Azure Traffic Manager
- Azure CDN
- Azure Front Door
- DNS A, AAAA, CNAME, NS, and TXT records

## Sources Consulted
- Azure DNS alias records overview: https://learn.microsoft.com/en-us/azure/dns/dns-alias
- Azure DNS FAQ: https://learn.microsoft.com/en-us/azure/dns/dns-faq
- Azure CLI `az network dns record-set a` reference: https://learn.microsoft.com/en-us/cli/azure/network/dns/record-set/a
- Azure CLI `az cdn endpoint` reference: https://learn.microsoft.com/en-us/cli/azure/cdn/endpoint
- Azure CLI `az afd endpoint` reference: https://learn.microsoft.com/en-us/cli/azure/afd/endpoint
- Azure Front Door apex domains documentation: https://learn.microsoft.com/en-us/azure/frontdoor/apex-domain
- Manage DNS records in Azure DNS using Azure CLI: https://learn.microsoft.com/en-us/azure/dns/dns-operations-recordsets-cli

## Issues Found
- The prerequisites omitted the requirement to register the `Microsoft.Network` resource provider before creating alias records. Added this prerequisite, including the cross-subscription case.
- The Traffic Manager section did not mention the documented restriction for A/AAAA alias records: the Traffic Manager profile must use external endpoints with IP addresses, not FQDN endpoints. Added a short note before the CLI example.
- The comparison table said alias records only support A and AAAA records. Azure DNS alias record sets support A, AAAA, and CNAME record types. Updated the table.
- The comparison table said alias records point only to Azure resource IDs. Azure DNS alias records can also point to another same-type record set in the same zone. Updated the table.
- The supported target list omitted same-zone record sets. Added this supported target.
- The wrapping-up section said to use alias records for any Azure resource that has a public IP. This was too broad because Azure DNS alias records only support specific target types. Reworded it to refer to supported targets.

## Review Notes
The Azure CLI was not installed in the local environment, so command verification was performed against the official Microsoft Learn CLI reference instead of local `az --help` output. The CLI command shapes in the post match the current documented parameters for DNS A record sets, CDN endpoints, and Azure Front Door endpoints.
