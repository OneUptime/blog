# Validation Summary: How to Manage Azure DNS with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Azure DNS
- Azure Private DNS
- Azure Private Endpoint / Private Link
- AzureRM provider
- HCL
- DMARC / DNS TXT records

## Sources Consulted
- Microsoft Learn: Azure DNS Terraform quickstart https://learn.microsoft.com/en-us/azure/dns/dns-get-started-terraform
- Microsoft Learn: Azure Private DNS zone overview https://learn.microsoft.com/en-us/azure/dns/private-dns-privatednszone
- Microsoft Learn: Azure DNS private zone autoregistration https://learn.microsoft.com/en-us/azure/dns/private-dns-autoregistration
- Microsoft Learn: Azure Private Endpoint private DNS zone values https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns
- Microsoft Learn: Azure Private Endpoint DNS integration scenarios https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns-integration
- Microsoft Learn: What is a private endpoint? https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-overview
- AzureRM provider docs: `azurerm_dns_zone` https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/dns_zone.html.markdown
- AzureRM provider docs: `azurerm_dns_a_record` https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/dns_a_record.html.markdown
- AzureRM provider docs: `azurerm_dns_cname_record` https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/dns_cname_record.html.markdown
- AzureRM provider docs: `azurerm_dns_mx_record` https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/dns_mx_record.html.markdown
- AzureRM provider docs: `azurerm_dns_txt_record` https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/dns_txt_record.html.markdown
- AzureRM provider docs: `azurerm_private_dns_zone` https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/private_dns_zone.html.markdown
- AzureRM provider docs: `azurerm_private_dns_a_record` https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/private_dns_a_record.html.markdown
- AzureRM provider docs: `azurerm_private_dns_zone_virtual_network_link` https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/private_dns_zone_virtual_network_link.html.markdown
- AzureRM provider docs: `azurerm_private_endpoint` https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/private_endpoint.html.markdown
- RFC 7489: DMARC https://www.rfc-editor.org/rfc/rfc7489

## Issues Found
- The `_dmarc` TXT example was labeled as "domain verification", but the record value is a DMARC policy record. I changed the comment and resource name to reflect DMARC correctly.
- The Private Endpoint best-practice note overstated the failure mode by saying traffic would bypass the private endpoint and route through the public internet. I rewrote it to match Azure's documentation: the goal is to make clients resolve the private endpoint IP instead of the service's public endpoint.
- The TTL guidance used `ALB`, which is AWS-specific terminology and inaccurate in an Azure-focused post. I replaced it with `load-balanced endpoints`.
- The environment guidance was too prescriptive in recommending one zone strategy over all others. I changed it to a technically accurate statement that zone boundaries and naming should match delegation, access-control, and isolation requirements.
- I also tightened two wording details for precision: auto-registration now explicitly refers to Azure VMs, and the private endpoint example comment now describes automatic private DNS record management rather than implying the endpoint block itself is the DNS record.

## Review Notes
- The HCL snippets are technically valid but excerpted; they assume referenced resources such as `azurerm_virtual_network.main`, `azurerm_subnet.private`, `azurerm_storage_account.main`, and `azurerm_public_ip.app` already exist elsewhere in the configuration.
- Azure Private DNS zone auto-registration applies only to virtual machines, and only one auto-registration-enabled private DNS zone can be linked to a given virtual network.
- If a virtual network uses custom DNS servers, linked private DNS zones are not queried automatically; Azure requires conditional forwarding to `168.63.129.16` or Azure Private Resolver for that scenario.
