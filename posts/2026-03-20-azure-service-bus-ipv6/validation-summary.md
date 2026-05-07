# Validation Summary: How to Configure Azure Service Bus with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Azure Service Bus
- Azure Private Endpoint / Azure Private Link
- Azure Private DNS
- Azure CLI
- Terraform (`azurerm`)
- Python (`azure-servicebus`)

## Sources Consulted
- Azure Service Bus private endpoints: https://learn.microsoft.com/en-us/azure/service-bus-messaging/private-link-service
- Azure Service Bus network security and IP firewall rules: https://learn.microsoft.com/en-us/azure/service-bus-messaging/network-security
- Azure Service Bus IP firewall rules: https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-ip-filtering
- Azure Private Endpoint DNS zone values: https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns
- Azure Private Endpoint overview: https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-overview
- Manage Azure private endpoints: https://learn.microsoft.com/en-us/azure/private-link/manage-private-endpoint
- Azure CLI `az network private-endpoint`: https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint?view=azure-cli-latest
- Azure CLI `az network private-endpoint dns-zone-group`: https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint/dns-zone-group?view=azure-cli-latest
- Azure CLI `az servicebus namespace`: https://learn.microsoft.com/en-us/cli/azure/servicebus/namespace?view=azure-cli-latest
- Azure CLI `az servicebus namespace network-rule-set`: https://learn.microsoft.com/en-us/cli/azure/servicebus/namespace/network-rule-set?view=azure-cli-latest
- Azure Virtual Network IPv6 overview: https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/ipv6-overview
- Azure Private Endpoint REST/API docs for `ipVersionType`: https://learn.microsoft.com/en-us/rest/api/virtualnetwork/private-endpoints/get?view=rest-virtualnetwork-2025-05-01&viewFallbackFrom=rest-virtualnetwork-2025-03-01
- ARM/Bicep reference for `Microsoft.Network/privateEndpoints`: https://learn.microsoft.com/en-us/azure/templates/microsoft.network/privateendpoints
- Azure Service Bus Python quickstart: https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-python-how-to-use-queues
- HashiCorp AzureRM provider docs for `azurerm_private_endpoint`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/private_endpoint.html.markdown
- HashiCorp AzureRM provider docs for `azurerm_servicebus_namespace`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/servicebus_namespace.html.markdown

## Issues Found
- The post used the wrong private DNS zone name for Service Bus private endpoints. I changed `servicebus.windows.net` to the documented `privatelink.servicebus.windows.net` and replaced the manual record creation with a private endpoint DNS zone group, which is the documented integration path for private endpoints.
- The Azure CLI private endpoint example did not request a dual-stack private endpoint. I added `--ip-version-type DualStack`, which is required in current Azure networking docs to explicitly request IPv4+IPv6 private endpoint addressing.
- The post claimed that Service Bus IP firewall rules support IPv6 CIDRs. Official Service Bus network security and IP filtering docs describe public IP firewall rules as IPv4-only, so I changed that section to IPv4 and updated the surrounding explanations.
- The Python example monkey-patched DNS resolution to prefer IPv6. That behavior is not required by the documented Azure Service Bus client usage, so I removed it and kept the example aligned with the supported `ServiceBusClient.from_connection_string(...)` pattern.
- The Terraform section was labeled as an IPv6 example even though the documented `azurerm_private_endpoint` arguments do not expose the private endpoint `DualStack` setting. I narrowed the section to a private endpoint example and added a brief note directing dual-stack configuration to Azure CLI or ARM.

## Review Notes
- The IPv6 guidance in the post is valid for private connectivity because Azure Service Bus supports private endpoints and Azure Private Endpoint now supports `DualStack`. That connection is an inference across official Service Bus and Azure networking docs rather than a dedicated Service Bus article focused on IPv6.
- Azure Service Bus private endpoints require the Premium tier. Public endpoint IP filtering is a separate capability and remains IPv4-only.
