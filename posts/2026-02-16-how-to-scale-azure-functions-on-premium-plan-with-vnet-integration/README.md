# How to Scale Azure Functions on Premium Plan with VNET Integration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Functions, Premium Plan, VNET Integration, Scaling, Networking, Azure, Security

Description: Configure Azure Functions Premium plan with VNET integration for secure access to private resources while maintaining automatic scaling capabilities.

---

The Azure Functions Consumption plan is great for simple workloads, but it falls short when you need to access resources inside a virtual network - think private databases, internal APIs, or on-premises systems connected through VPN. The Premium plan bridges this gap by giving you VNET integration alongside automatic scaling, pre-warmed instances, and no cold starts.

In this post, I will show you how to set up a Premium plan function app with VNET integration, configure the networking correctly, and tune the scaling behavior.

## Why Premium Plan with VNET?

Many organizations have a private network topology where databases, caches, and internal services are not exposed to the public internet. They sit behind private endpoints or inside a VNET. On the Consumption plan, your function runs on shared infrastructure and cannot reach those private resources. The Premium plan solves this by letting you inject your function into a subnet of your VNET.

Common scenarios where this matters:

- Accessing an Azure SQL Database with a private endpoint
- Connecting to a Redis Cache inside a VNET
- Calling internal microservices that are not publicly accessible
- Reaching on-premises systems through an ExpressRoute or VPN gateway
- Meeting compliance requirements that prohibit public network access

## Setting Up the Infrastructure

Let me walk through the entire setup using the Azure CLI. You can also use Terraform, Bicep, or the portal, but the CLI makes each step explicit.

```bash
# Create a resource group for all the resources
az group create \
  --name rg-functions-premium \
  --location eastus2

# Create a VNET with two subnets:
# - One for the function app (delegated to Microsoft.Web/serverFarms)
# - One for private endpoints
az network vnet create \
  --name vnet-functions \
  --resource-group rg-functions-premium \
  --address-prefix 10.0.0.0/16

# The function app subnet needs to be delegated to the App Service plan
# Size it appropriately - each function instance uses one IP address
az network vnet subnet create \
  --name subnet-functions \
  --vnet-name vnet-functions \
  --resource-group rg-functions-premium \
  --address-prefixes 10.0.1.0/24 \
  --delegations Microsoft.Web/serverFarms

# Subnet for private endpoints (no delegation needed)
az network vnet subnet create \
  --name subnet-endpoints \
  --vnet-name vnet-functions \
  --resource-group rg-functions-premium \
  --address-prefixes 10.0.2.0/24
```

Now create the Premium plan and function app.

```bash
# Create a Premium (Elastic Premium) plan
# EP1 is the smallest tier - 1 vCPU, 3.5 GB RAM per instance
az functionapp plan create \
  --name plan-functions-premium \
  --resource-group rg-functions-premium \
  --location eastus2 \
  --sku EP1 \
  --min-instances 1 \
  --max-burst 10

# Create a storage account for the function app
az storage account create \
  --name stfuncpremium2026 \
  --resource-group rg-functions-premium \
  --location eastus2 \
  --sku Standard_LRS

# Create the function app on the Premium plan
az functionapp create \
  --name func-app-premium-demo \
  --resource-group rg-functions-premium \
  --plan plan-functions-premium \
  --storage-account stfuncpremium2026 \
  --runtime dotnet-isolated \
  --runtime-version 8 \
  --os-type Linux
```

## Enabling VNET Integration

With the infrastructure in place, connect the function app to the VNET.

```bash
# Integrate the function app with the VNET subnet
az functionapp vnet-integration add \
  --name func-app-premium-demo \
  --resource-group rg-functions-premium \
  --vnet vnet-functions \
  --subnet subnet-functions

# Route all outbound traffic through the VNET
# Without this, only RFC1918 traffic goes through the VNET
az functionapp config appsettings set \
  --name func-app-premium-demo \
  --resource-group rg-functions-premium \
  --settings "WEBSITE_VNET_ROUTE_ALL=1"

# Use the VNET's DNS servers for name resolution
# This is important if you are using private DNS zones
az functionapp config appsettings set \
  --name func-app-premium-demo \
  --resource-group rg-functions-premium \
  --settings "WEBSITE_DNS_SERVER=168.63.129.16"
```

The `WEBSITE_VNET_ROUTE_ALL=1` setting is critical. By default, only traffic destined for RFC1918 addresses (10.x, 172.16.x, 192.168.x) gets routed through the VNET. If you are using private endpoints (which use private DNS resolution), you need all traffic to go through the VNET.

## Connecting to a Private Database

Here is a common scenario: your Azure SQL Database has public access disabled and uses a private endpoint. Let me show you how to set that up.

```bash
# Create an Azure SQL Server with public access disabled
az sql server create \
  --name sql-private-demo \
  --resource-group rg-functions-premium \
  --location eastus2 \
  --admin-user sqladmin \
  --admin-password "YourSecurePassword123!"

# Disable public network access
az sql server update \
  --name sql-private-demo \
  --resource-group rg-functions-premium \
  --enable-public-network false

# Create a private endpoint for the SQL server in the endpoints subnet
az network private-endpoint create \
  --name pe-sql-demo \
  --resource-group rg-functions-premium \
  --vnet-name vnet-functions \
  --subnet subnet-endpoints \
  --private-connection-resource-id $(az sql server show \
    --name sql-private-demo \
    --resource-group rg-functions-premium \
    --query id -o tsv) \
  --group-id sqlServer \
  --connection-name sql-connection

# Create a private DNS zone for SQL Server
az network private-dns zone create \
  --name privatelink.database.windows.net \
  --resource-group rg-functions-premium

# Link the DNS zone to the VNET
az network private-dns link vnet create \
  --name link-sql-dns \
  --resource-group rg-functions-premium \
  --zone-name privatelink.database.windows.net \
  --virtual-network vnet-functions \
  --registration-enabled false

# Create the DNS record for the private endpoint
az network private-endpoint dns-zone-group create \
  --name sql-dns-group \
  --resource-group rg-functions-premium \
  --endpoint-name pe-sql-demo \
  --private-dns-zone privatelink.database.windows.net \
  --zone-name sql
```

Now your function app can connect to the SQL database using its regular hostname (sql-private-demo.database.windows.net), and the DNS resolution will return the private IP address.

## Configuring Scale Settings

The Premium plan gives you control over scaling behavior that the Consumption plan does not.

```bash
# Set the minimum and maximum instance count
az functionapp plan update \
  --name plan-functions-premium \
  --resource-group rg-functions-premium \
  --min-instances 2 \
  --max-burst 20
```

The `min-instances` setting keeps that many instances always warm and running. You pay for these instances even when there is no traffic. The `max-burst` setting caps how many instances the platform will scale to during traffic spikes.

You can also configure per-function scaling limits in the `host.json` file.

```json
{
  "version": "2.0",
  "extensions": {
    "http": {
      "routePrefix": "api",
      "maxOutstandingRequests": 200,
      "maxConcurrentRequests": 100,
      "dynamicThrottlesEnabled": true
    },
    "queues": {
      "maxPollingInterval": "00:00:02",
      "visibilityTimeout": "00:00:30",
      "batchSize": 16,
      "maxDequeueCount": 5,
      "newBatchThreshold": 8
    }
  },
  "functionTimeout": "00:10:00"
}
```

## Subnet Sizing Considerations

A common mistake is making the function subnet too small. Each function instance consumes one IP address from the subnet. If you have a /28 subnet (14 usable IPs), you can only scale to 14 instances. Azure also reserves some addresses in each subnet.

Here is a quick reference for subnet sizing.

| Subnet Size | Usable IPs | Max Function Instances |
|-------------|-----------|----------------------|
| /28         | 11        | 11                   |
| /27         | 27        | 27                   |
| /26         | 59        | 59                   |
| /25         | 123       | 123                  |
| /24         | 251       | 251                  |

I recommend at least a /26 for production workloads. If you are running multiple function apps in the same VNET, each one needs its own dedicated subnet.

## Monitoring Scale Events

Use the Azure Functions scale controller logs to understand scaling decisions.

```bash
# Enable scale controller logging
az functionapp config appsettings set \
  --name func-app-premium-demo \
  --resource-group rg-functions-premium \
  --settings "SCALE_CONTROLLER_LOGGING_ENABLED=AppInsights:Verbose"
```

Once enabled, you can query the scale controller logs in Application Insights.

```kusto
// Query to see scaling decisions made by the platform
traces
| where message contains "ScaleController"
| where timestamp > ago(1h)
| project timestamp, message, customDimensions
| order by timestamp desc
```

## Cost Optimization Tips

The Premium plan is not cheap. Here are some ways to keep costs reasonable while still getting the benefits of VNET integration.

First, right-size your minimum instance count. If your traffic is predictable and drops to near-zero at night, you could use an automation runbook to reduce the minimum instance count during off-hours and increase it before peak hours.

Second, choose the right SKU tier. EP1 (1 vCPU, 3.5 GB) is sufficient for most workloads. Only move to EP2 or EP3 if your functions are CPU-bound or memory-intensive.

Third, consider using the Flex Consumption plan if it is available in your region. It offers VNET integration with a pay-per-use model that is cheaper than Premium for bursty workloads.

## Summary

The Premium plan with VNET integration gives you the best of both worlds: serverless scaling with private network access. The setup involves creating a VNET with properly sized subnets, enabling VNET integration on the function app, configuring DNS resolution for private endpoints, and tuning scale settings. The networking pieces require careful configuration, especially around DNS and routing, but once it is set up correctly your functions can securely access any resource in your private network.
