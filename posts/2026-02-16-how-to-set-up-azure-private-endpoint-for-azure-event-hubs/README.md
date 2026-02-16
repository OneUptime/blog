# How to Set Up Azure Private Endpoint for Azure Event Hubs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Private Endpoint, Event Hubs, Private Link, Networking, Security

Description: Configure Azure Private Endpoint for Event Hubs to enable private network access for event streaming without exposing traffic to the public internet.

---

Azure Event Hubs is a managed event streaming platform that handles millions of events per second. By default, Event Hubs namespaces are accessible over the public internet, which is a problem for organizations with strict network security requirements. Private endpoints let you access Event Hubs over a private IP address in your VNet, keeping all traffic on the Microsoft backbone network and never touching the public internet.

This guide walks through creating a private endpoint for Event Hubs, configuring DNS resolution, restricting public access, and verifying that everything works from your applications.

## Why Use Private Endpoints for Event Hubs

There are several reasons to put Event Hubs behind a private endpoint:

- **Data sovereignty and compliance**: Regulations like PCI DSS, HIPAA, and internal security policies often require that data never traverse the public internet
- **Reduced attack surface**: Without a public endpoint, there is no public surface for attackers to probe
- **Network isolation**: Private endpoints integrate with NSGs and Azure Firewall, giving you fine-grained control over which workloads can reach Event Hubs
- **Consistent network path**: Traffic always stays on the Azure backbone, which means predictable latency and throughput

## Prerequisites

- An Azure subscription
- An Event Hubs namespace (Standard or Premium tier)
- A virtual network with at least one subnet for the private endpoint
- Azure CLI installed
- Applications that publish to or consume from Event Hubs running in the VNet (or connected via VPN/ExpressRoute)

## Step 1: Create an Event Hubs Namespace

If you do not already have one, create an Event Hubs namespace:

```bash
# Create an Event Hubs namespace
az eventhubs namespace create \
  --name myEventHubNamespace \
  --resource-group myResourceGroup \
  --location eastus \
  --sku Standard \
  --capacity 2
```

Create an event hub within the namespace:

```bash
# Create an event hub with 4 partitions
az eventhubs eventhub create \
  --name myEventHub \
  --namespace-name myEventHubNamespace \
  --resource-group myResourceGroup \
  --partition-count 4 \
  --message-retention 7
```

## Step 2: Create the Private Endpoint Subnet

Private endpoints need their own subnet (or a shared one with other private endpoints). The subnet must not have any delegation:

```bash
# Create a subnet for private endpoints
az network vnet subnet create \
  --name privateEndpointSubnet \
  --resource-group myResourceGroup \
  --vnet-name myVNet \
  --address-prefixes "10.0.5.0/24" \
  --disable-private-endpoint-network-policies true
```

The `--disable-private-endpoint-network-policies` flag is important. By default, NSG rules do not apply to private endpoints. This flag allows the subnet to host private endpoints.

## Step 3: Create the Private Endpoint

Create a private endpoint that connects your VNet to the Event Hubs namespace:

```bash
# Get the Event Hubs namespace resource ID
EH_ID=$(az eventhubs namespace show \
  --name myEventHubNamespace \
  --resource-group myResourceGroup \
  --query id -o tsv)

# Create the private endpoint
az network private-endpoint create \
  --name myEventHubs-pe \
  --resource-group myResourceGroup \
  --vnet-name myVNet \
  --subnet privateEndpointSubnet \
  --private-connection-resource-id $EH_ID \
  --group-id namespace \
  --connection-name myEventHubs-connection \
  --location eastus
```

The `--group-id namespace` specifies that this private endpoint covers the entire Event Hubs namespace, including all event hubs within it.

## Step 4: Create the Private DNS Zone

For applications to resolve the Event Hubs FQDN to the private IP, you need a Private DNS Zone:

```bash
# Create the private DNS zone for Event Hubs
# Event Hubs shares the servicebus.windows.net domain
az network private-dns zone create \
  --name "privatelink.servicebus.windows.net" \
  --resource-group myResourceGroup

# Link the DNS zone to the VNet
az network private-dns link vnet create \
  --name "eventhubs-dns-link" \
  --resource-group myResourceGroup \
  --zone-name "privatelink.servicebus.windows.net" \
  --virtual-network myVNet \
  --registration-enabled false
```

Note that Event Hubs uses the `servicebus.windows.net` domain, not a separate event hubs domain. This is because Event Hubs, Service Bus, and Relay share the same underlying infrastructure.

## Step 5: Register the Private Endpoint in DNS

Create a DNS zone group to automatically manage the DNS records:

```bash
# Create a DNS zone group for automatic DNS record management
az network private-endpoint dns-zone-group create \
  --name default \
  --endpoint-name myEventHubs-pe \
  --resource-group myResourceGroup \
  --private-dns-zone "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.Network/privateDnsZones/privatelink.servicebus.windows.net" \
  --zone-name "privatelink.servicebus.windows.net"
```

This automatically creates an A record in the private DNS zone:

```
myEventHubNamespace.privatelink.servicebus.windows.net -> 10.0.5.4
```

## Step 6: Verify DNS Resolution

From a VM in the linked VNet, verify that the Event Hubs FQDN resolves to the private IP:

```bash
# Test DNS resolution
nslookup myEventHubNamespace.servicebus.windows.net

# Expected output:
# Name:    myEventHubNamespace.privatelink.servicebus.windows.net
# Address:  10.0.5.4
# Aliases:  myEventHubNamespace.servicebus.windows.net
```

If you see a public IP address, check that the private DNS zone is linked to the correct VNet and that the A record exists.

## Step 7: Restrict Public Network Access

Now that private endpoint access is working, disable public access to the Event Hubs namespace:

```bash
# Disable public network access
az eventhubs namespace update \
  --name myEventHubNamespace \
  --resource-group myResourceGroup \
  --public-network-access Disabled
```

Alternatively, you can keep public access enabled but restrict it to specific IP ranges:

```bash
# Allow public access only from specific IPs (for development machines)
az eventhubs namespace network-rule-set update \
  --namespace-name myEventHubNamespace \
  --resource-group myResourceGroup \
  --default-action Deny \
  --ip-rules "[{\"ipMask\":\"203.0.113.0/24\",\"action\":\"Allow\"}]"
```

## Step 8: Test Application Connectivity

Test that your applications can connect to Event Hubs through the private endpoint.

Here is a Python producer example:

```python
# Test Event Hubs connectivity through private endpoint
# Uses the Azure Event Hubs SDK for Python

from azure.eventhub import EventHubProducerClient, EventData
import os

# Connection string includes the namespace FQDN
# DNS resolves this to the private endpoint IP
connection_str = os.environ['EVENT_HUB_CONNECTION_STRING']
eventhub_name = 'myEventHub'

# Create a producer client
producer = EventHubProducerClient.from_connection_string(
    conn_str=connection_str,
    eventhub_name=eventhub_name
)

# Send a test event
with producer:
    event_data_batch = producer.create_batch()
    event_data_batch.add(EventData('Test event via private endpoint'))
    producer.send_batch(event_data_batch)
    print('Event sent successfully via private endpoint')
```

And a consumer example:

```python
# Test Event Hubs consumption through private endpoint
from azure.eventhub import EventHubConsumerClient
import os

connection_str = os.environ['EVENT_HUB_CONNECTION_STRING']
eventhub_name = 'myEventHub'
consumer_group = '$Default'

# Create consumer client
consumer = EventHubConsumerClient.from_connection_string(
    conn_str=connection_str,
    consumer_group=consumer_group,
    eventhub_name=eventhub_name
)

def on_event(partition_context, event):
    # Process event received via private endpoint
    print(f"Received event: {event.body_as_str()}")
    partition_context.update_checkpoint(event)

# Start receiving events
with consumer:
    consumer.receive(
        on_event=on_event,
        starting_position="-1",
        max_wait_time=30
    )
```

The key thing to note is that the application code does not change at all. The SDK uses the same connection string, and DNS resolution transparently routes traffic through the private endpoint.

## Step 9: Monitor Private Endpoint Traffic

Set up monitoring to track private endpoint usage:

```bash
# Enable diagnostic logging for the Event Hubs namespace
az monitor diagnostic-settings create \
  --name "eventhubs-diagnostics" \
  --resource "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.EventHub/namespaces/myEventHubNamespace" \
  --workspace "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.OperationalInsights/workspaces/myWorkspace" \
  --logs '[
    {"category": "ArchiveLogs", "enabled": true},
    {"category": "OperationalLogs", "enabled": true},
    {"category": "AutoScaleLogs", "enabled": true}
  ]' \
  --metrics '[{"category": "AllMetrics", "enabled": true}]'
```

## Handling Multiple VNets

If you have applications in multiple VNets that need to access the same Event Hubs namespace, you have two options:

1. **VNet peering**: Peer the VNets and link the private DNS zone to all of them. The private endpoint stays in one VNet, but peered VNets can route to it.

2. **Multiple private endpoints**: Create a private endpoint in each VNet. This gives you dedicated private IPs in each VNet and avoids dependency on VNet peering.

```bash
# Create a second private endpoint in a different VNet
az network private-endpoint create \
  --name myEventHubs-pe-vnet2 \
  --resource-group myResourceGroup \
  --vnet-name myVNet2 \
  --subnet privateEndpointSubnet \
  --private-connection-resource-id $EH_ID \
  --group-id namespace \
  --connection-name myEventHubs-connection-vnet2 \
  --location eastus
```

## Troubleshooting

**Connection timeouts**: If applications cannot connect, verify DNS resolution first. If the FQDN resolves to the public IP instead of the private IP, the traffic is going the wrong way. Check DNS zone linkage and A records.

**Unauthorized errors**: Private endpoints handle network-level access. You still need proper RBAC or SAS tokens for authentication. Network and auth are separate concerns.

**Event Hubs Premium vs Standard**: Both Standard and Premium Event Hubs support private endpoints. Premium also supports dedicated clusters, which have their own networking considerations.

## Wrapping Up

Setting up a private endpoint for Azure Event Hubs is straightforward once you understand the DNS component. Create the private endpoint, set up the DNS zone, link it to your VNet, and disable public access. The application code stays exactly the same because the SDK uses the namespace FQDN for connection, and DNS handles the routing transparently. This gives you network-level isolation for your event streaming traffic with zero code changes.
