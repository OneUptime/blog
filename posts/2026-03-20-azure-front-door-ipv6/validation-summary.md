# Validation Summary: How to Enable IPv6 on Azure Front Door

## Status
validated

## Post Type
Guide

## Technologies Covered
- Azure Front Door Classic
- Azure Front Door Standard/Premium
- Azure CLI
- Terraform with the AzureRM provider
- Azure DNS
- IPv6, AAAA records, and CNAME records

## Sources Consulted
- Azure Front Door overview: https://learn.microsoft.com/en-us/azure/frontdoor/front-door-overview
- Azure Front Door routing architecture: https://learn.microsoft.com/en-us/azure/frontdoor/front-door-routing-architecture
- Azure Front Door FAQ: https://learn.microsoft.com/en-us/azure/frontdoor/front-door-faq
- Azure Front Door Classic retirement FAQ: https://learn.microsoft.com/en-us/azure/frontdoor/classic-retirement-faq
- Quickstart: Create an Azure Front Door using Azure CLI: https://learn.microsoft.com/en-us/azure/frontdoor/create-front-door-cli
- Quickstart: Create an Azure Front Door using Terraform: https://learn.microsoft.com/en-us/azure/frontdoor/create-front-door-terraform
- Origins and origin groups in Azure Front Door: https://learn.microsoft.com/en-us/azure/frontdoor/origin
- TLS encryption - Azure Front Door: https://learn.microsoft.com/en-us/azure/frontdoor/end-to-end-tls
- How to add a custom domain - Azure Front Door: https://learn.microsoft.com/en-gb/azure/frontdoor/standard-premium/how-to-add-custom-domain
- Azure CLI `az network front-door`: https://learn.microsoft.com/en-us/cli/azure/network/front-door?view=azure-cli-lts
- Azure CLI `az afd custom-domain`: https://learn.microsoft.com/en-us/cli/azure/afd/custom-domain?view=azure-cli-latest
- Azure CLI `az afd route`: https://learn.microsoft.com/en-us/cli/azure/afd/route?view=azure-cli-lts

## Issues Found
- The post said Front Door IPv6 relies on Microsoft's anycast network and described AAAA answers as anycast IPv6 addresses. Current Microsoft documentation is inconsistent here, with the overview still using anycast terminology while the routing architecture and FAQ describe Traffic Manager returning a PoP unicast IP. I rewrote the IPv6 explanation to use neutral, current wording about Microsoft's global edge network instead of asserting a specific routing mechanism.
- The Front Door Classic section told readers to create a new Classic profile with `az network front-door create`. That is no longer valid in 2026. Microsoft says new Front Door Classic resources can no longer be created, so I replaced that section with verification commands for existing Classic frontends and noted the March 31, 2027 retirement date.
- The Terraform origin example used a VM public IP as `host_name` while leaving `certificate_name_check_enabled = true`. Microsoft documents this as a common HTTPS failure case because the certificate must match the origin hostname. I changed the example to use an FQDN for both `host_name` and `origin_host_header`.
- The Terraform route example omitted `link_to_default_domain = true` even though the post later verifies the generated `azurefd.net` endpoint hostname. I added `link_to_default_domain = true` so the example matches the described verification step and Microsoft’s Terraform quickstart pattern.
- The verification section included a `curl` command that sent `Host: www.example.com` to the default `azurefd.net` hostname. That is a misleading test for this guide and can interact badly with Front Door host/domain matching, so I removed it.
- The custom domain section created the domain and DNS CNAME but did not associate the domain with a route. Microsoft documents that custom domains must be associated with an endpoint/route before traffic flows. I added an `az afd route update --custom-domains ...` step and clarified that it should be run after the domain validates.

## Review Notes
- Azure Front Door Classic remains usable for existing profiles, but Microsoft documents that new Classic resources can no longer be created and that Classic retires on March 31, 2027.
- Microsoft’s current Azure Front Door docs are not fully consistent about Anycast versus unicast request steering, so the post now avoids overcommitting to one implementation detail where the documentation conflicts.
