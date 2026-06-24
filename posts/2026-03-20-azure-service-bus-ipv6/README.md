# How to Configure Azure Service Bus with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, IPv6, Service Bus, Messaging, Private Endpoint, Dual-Stack

Description: Configure Azure Service Bus to accept connections over IPv6 through Private Endpoints in dual-stack VNets and configure IP filtering rules for IPv6 client addresses.

## Introduction

Azure Service Bus can be reached over private IPv6 through Private Endpoints in dual-stack VNets. Create the Private Endpoint as `DualStack` and use the recommended private DNS zone for Service Bus so the namespace FQDN resolves to the private endpoint address inside the VNet. Service Bus IP firewall rules on the public endpoint are currently IPv4-only.

## Create Service Bus with Private Endpoint

```bash
RG="rg-servicebus-ipv6"
LOCATION="eastus"

# Create Service Bus namespace

az servicebus namespace create \
    --resource-group "$RG" \
    --name sb-myapp \
    --location "$LOCATION" \
    --sku Premium

# Get namespace resource ID
SB_ID=$(az servicebus namespace show \
    --resource-group "$RG" \
    --name sb-myapp \
    --query id --output tsv)

# Create Private Endpoint in dual-stack subnet
az network private-endpoint create \
    --resource-group "$RG" \
    --name pe-servicebus \
    --vnet-name vnet-dualstack \
    --subnet subnet-private \
    --private-connection-resource-id "$SB_ID" \
    --group-id namespace \
    --connection-name connection-servicebus \
    --ip-version-type DualStack

# Create private DNS zone for Service Bus
az network private-dns zone create \
    --resource-group "$RG" \
    --name "privatelink.servicebus.windows.net"

az network private-dns link vnet create \
    --resource-group "$RG" \
    --zone-name "privatelink.servicebus.windows.net" \
    --name link-vnet \
    --virtual-network vnet-dualstack \
    --registration-enabled false

# Attach the private DNS zone to the private endpoint
az network private-endpoint dns-zone-group create \
    --resource-group "$RG" \
    --endpoint-name pe-servicebus \
    --name zonegroup-servicebus \
    --private-dns-zone "privatelink.servicebus.windows.net" \
    --zone-name "privatelink.servicebus.windows.net"
```

## Terraform Service Bus Private Endpoint

The AzureRM provider can create the Service Bus namespace, private endpoint, and DNS zone group. If you need to force the private endpoint to `DualStack`, configure that setting through Azure CLI or ARM because the documented `azurerm_private_endpoint` arguments don't expose it.

```hcl
# service_bus_private_endpoint.tf

resource "azurerm_servicebus_namespace" "main" {
  name                = "sb-myapp"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "Premium"

  # Disable public network access and use private endpoints only
  public_network_access_enabled = false

  tags = { Name = "service-bus" }
}

# Private endpoint and DNS zone group
resource "azurerm_private_endpoint" "servicebus" {
  name                = "pe-servicebus"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  subnet_id           = azurerm_subnet.private.id

  private_service_connection {
    name                           = "conn-servicebus"
    private_connection_resource_id = azurerm_servicebus_namespace.main.id
    subresource_names              = ["namespace"]
    is_manual_connection           = false
  }

  # DNS zone group for automatic DNS configuration
  private_dns_zone_group {
    name = "dns-zone-group"
    private_dns_zone_ids = [azurerm_private_dns_zone.servicebus.id]
  }
}

resource "azurerm_private_dns_zone" "servicebus" {
  name                = "privatelink.servicebus.windows.net"
  resource_group_name = azurerm_resource_group.main.name
}

resource "azurerm_private_dns_zone_virtual_network_link" "servicebus" {
  name                  = "link-vnet"
  resource_group_name   = azurerm_resource_group.main.name
  private_dns_zone_name = azurerm_private_dns_zone.servicebus.name
  virtual_network_id    = azurerm_virtual_network.main.id
  registration_enabled  = false
}
```

## Add IPv4 Network Rules

```bash
# Service Bus IP firewall rules for the public endpoint are IPv4-only
az servicebus namespace network-rule-set ip-rule add \
    --resource-group "$RG" \
    --namespace-name sb-myapp \
    --ip-mask "203.0.113.0/24" \
    --action Allow

# List current network rules
az servicebus namespace network-rule-set show \
    --resource-group "$RG" \
    --namespace-name sb-myapp \
    --query "ipRules"
```

## Connect to Service Bus over IPv6

```python
from azure.servicebus import ServiceBusClient, ServiceBusMessage

# The namespace FQDN stays the same. With private DNS configured in the VNet,
# it resolves to the private endpoint address.
connection_str = "Endpoint=sb://sb-myapp.servicebus.windows.net/;..."

# Create Service Bus client
client = ServiceBusClient.from_connection_string(connection_str)

with client:
    sender = client.get_queue_sender(queue_name="myqueue")
    with sender:
        message = ServiceBusMessage("Hello over IPv6!")
        sender.send_messages(message)
        print("Message sent through the Service Bus private endpoint")
```

## Conclusion

Azure Service Bus private IPv6 connectivity is achieved through Private Endpoints in dual-stack VNets. Create the private endpoint as `DualStack` and use the `privatelink.servicebus.windows.net` private DNS zone so the namespace FQDN resolves correctly inside the VNet. Service Bus public IP filtering remains IPv4-only. The Premium SKU is required for Private Endpoint support.
