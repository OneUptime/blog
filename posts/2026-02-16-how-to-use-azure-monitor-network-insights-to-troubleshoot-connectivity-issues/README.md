# How to Use Azure Monitor Network Insights to Troubleshoot Connectivity Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Monitor, Network Insights, Connectivity, Troubleshooting, Azure Networking, Network Monitoring, Azure Cloud

Description: Learn how to use Azure Monitor Network Insights to diagnose and troubleshoot connectivity issues across your Azure networking resources.

---

Networking problems in Azure can be maddening. A VM cannot reach a database, a load balancer is dropping connections, a VPN gateway is flapping, and you are clicking through six different Azure blades trying to figure out where the traffic is being blocked. Azure Monitor Network Insights consolidates all of this into one place - giving you a topology view, health status, and diagnostic tools for every networking resource in your subscription.

This guide covers how to use Network Insights effectively, from the overview dashboard down to specific troubleshooting scenarios.

## What Network Insights Covers

Network Insights provides monitoring and diagnostics for virtually every Azure networking resource:

- Virtual Networks and subnets
- Network Security Groups (NSGs)
- Load Balancers (public and internal)
- Application Gateways
- VPN Gateways and ExpressRoute circuits
- Azure Firewall
- Azure Front Door and CDN profiles
- Traffic Manager profiles
- Private Endpoints

Each resource type gets its own health metrics, and you can drill down from the overview into specific resources.

## Accessing Network Insights

Navigate to Azure Monitor in the portal, then click Networks under the Insights section. You will see a dashboard with tabs for different resource types and an overview showing resource health across your subscription.

The Topology tab is particularly useful - it renders your network architecture visually, showing how VNets, subnets, NICs, and VMs are connected.

## Scenario 1: VM Cannot Reach Another VM

This is probably the most common networking issue. VM-A cannot ping or connect to VM-B on a specific port.

Start with the **Connection Monitor** feature, which is part of Network Insights. Connection Monitor continuously tests connectivity between endpoints and reports latency, packet loss, and reachability.

To set up a connection test:

1. In Network Insights, go to the Connection Monitor tab
2. Click Create
3. Define a test group with the source VM and destination VM
4. Configure the test protocol (TCP, ICMP, or HTTP)
5. Set the test frequency

Here is how to create a connection monitor test using the CLI:

```bash
# Create a connection monitor to test TCP connectivity between two VMs
az network watcher connection-monitor create \
  --name "vm-a-to-vm-b-test" \
  --location eastus \
  --test-group-name "CrossSubnet" \
  --endpoint-source-name "VM-A" \
  --endpoint-source-resource-id "/subscriptions/<sub-id>/resourceGroups/myRG/providers/Microsoft.Compute/virtualMachines/vm-a" \
  --endpoint-dest-name "VM-B" \
  --endpoint-dest-resource-id "/subscriptions/<sub-id>/resourceGroups/myRG/providers/Microsoft.Compute/virtualMachines/vm-b" \
  --test-config-name "TCP-3306" \
  --protocol Tcp \
  --tcp-port 3306 \
  --test-frequency-sec 30
```

If the test shows failures, the next step is checking NSG rules.

## Scenario 2: Diagnosing NSG Rule Blocks

NSG flow logs combined with Network Insights let you see exactly which rules are allowing or denying traffic.

In Network Insights, click on the NSG resource to see:

- Effective security rules (the merged result of all NSG rules applied to a NIC or subnet)
- Flow log data showing allowed and denied flows
- Hit counts per rule

To verify which rule is blocking traffic, use the **IP flow verify** feature:

```bash
# Check if traffic from VM-A to VM-B on port 3306 is allowed or denied
az network watcher test-ip-flow \
  --direction Outbound \
  --local 10.0.1.4:* \
  --remote 10.0.2.5:3306 \
  --protocol TCP \
  --vm vm-a \
  --resource-group myRG \
  --location eastus
```

This returns the NSG rule name that is allowing or denying the traffic, which saves you from manually reading through dozens of rules.

## Scenario 3: Load Balancer Health Probe Failures

When a backend pool member keeps going unhealthy, Network Insights shows you the health probe status for each backend instance.

Navigate to the Load Balancer section in Network Insights. Select your load balancer and check:

- **Health probe status**: Shows which backend instances are healthy or unhealthy
- **Data path availability**: Indicates whether the load balancer itself is functional
- **SNAT port utilization**: High utilization here causes outbound connection failures

A common issue is the health probe port not matching the application port, or the application not responding fast enough to the probe. The diagnostic view in Network Insights shows the probe configuration alongside the health status, making misconfigurations easy to spot.

```kql
// Query to analyze load balancer health probe status over time
AzureDiagnostics
| where Category == "LoadBalancerProbeHealthStatus"
| where TimeGenerated > ago(1h)
| extend BackendIP = tostring(split(backendIpAddress_s, ":")[0])
| summarize
    HealthyCount = countif(healthProbeStatus_s == "Up"),
    UnhealthyCount = countif(healthProbeStatus_s == "Down")
    by BackendIP, bin(TimeGenerated, 5m)
| order by TimeGenerated desc
```

## Scenario 4: VPN Gateway Connectivity Issues

VPN gateways can be tricky to troubleshoot because the problem might be on your side, the Azure side, or somewhere in between.

In Network Insights, the VPN Gateway section shows:

- Tunnel status (connected/disconnected)
- Bandwidth utilization per tunnel
- Packet drop counts
- BGP peer status (if using BGP routing)

For site-to-site VPN issues, check these common culprits:

1. **IKE negotiation failures**: Usually a mismatch in encryption algorithms or pre-shared keys between your on-premises device and Azure
2. **Traffic selector mismatch**: The local and remote address spaces do not match on both ends
3. **Gateway SKU limits**: Basic SKU gateways have bandwidth limits that can cause dropped packets under load

Use the VPN diagnostics tool to capture detailed logs:

```bash
# Start VPN gateway diagnostics and save to a storage account
az network vpn-gateway start-packet-capture \
  --resource-group myRG \
  --name myVPNGateway \
  --filter-data '{"TracingFlags":11,"MaxPacketBufferSize":120,"MaxFileSize":200,"Filters":[{"SourceSubnets":["10.0.0.0/24"],"DestinationSubnets":["192.168.1.0/24"]}]}'
```

## Scenario 5: Application Gateway 502 Errors

Application Gateway returning 502 Bad Gateway errors typically means the backend is not responding correctly to health probes.

In Network Insights, check the Application Gateway section for:

- Backend health per pool
- Response time distribution
- Failed requests by HTTP status code

The most common causes of 502 errors:

- Backend VMs are overloaded and timing out
- The health probe path returns a non-200 status code
- NSG rules are blocking Application Gateway subnet traffic to the backend
- The backend is using HTTPS but the Application Gateway is configured for HTTP

```kql
// Analyze Application Gateway access logs for 502 errors
AzureDiagnostics
| where ResourceType == "APPLICATIONGATEWAYS"
| where httpStatus_d == 502
| where TimeGenerated > ago(1h)
| summarize Count = count() by backendPoolName_s, backendSettingName_s, bin(TimeGenerated, 5m)
| render timechart
```

## Using the Topology View

The topology view in Network Insights is underrated. It renders your network architecture as an interactive diagram showing:

- VNets and their peering relationships
- Subnets within each VNet
- VMs and their NICs
- Load balancers and their backend pools
- NSGs attached to subnets and NICs

This is invaluable when you inherit an environment and need to understand the network layout quickly. You can click on any resource in the topology to see its health status and drill into diagnostics.

## Setting Up Alerts for Network Issues

Combine Network Insights data with Azure Monitor alerts to get notified proactively:

```kql
// Alert when VPN tunnel goes down
AzureDiagnostics
| where Category == "TunnelDiagnosticLog"
| where status_s == "Disconnected"
| project TimeGenerated, Resource, remoteIP_s, stateChangeReason_s
```

You can also set metric alerts on network resources:

- **Load Balancer**: Alert on health probe status below 100%
- **VPN Gateway**: Alert on tunnel bandwidth drops to zero
- **Application Gateway**: Alert on unhealthy backend count greater than zero

## Enabling NSG Flow Logs

NSG flow logs feed data into Network Insights and are essential for troubleshooting. If you have not enabled them yet:

```bash
# Enable NSG flow logs with traffic analytics
az network watcher flow-log create \
  --resource-group myRG \
  --nsg myNSG \
  --name myFlowLog \
  --storage-account myStorageAccount \
  --workspace myLogAnalyticsWorkspace \
  --enabled true \
  --traffic-analytics true \
  --interval 10
```

Traffic Analytics processes the flow logs and provides visualizations in Network Insights showing traffic patterns, top talkers, and geographic distribution of connections.

## Practical Tips

- **Start with the overview**: The Network Insights overview page highlights resources with health issues. Use it as your starting point instead of jumping to a specific resource.
- **Use the resource graph**: The topology view helps you understand dependencies before diving into logs.
- **Enable diagnostics logging**: Many network resources need diagnostic settings enabled before they send detailed logs to Log Analytics. Check each resource and enable all log categories.
- **Check effective routes**: When a VM cannot reach something, the effective routes on its NIC tell you where Azure is sending the traffic. This catches issues with route tables and BGP route propagation.

## Summary

Azure Monitor Network Insights brings together health monitoring, diagnostics, and topology visualization for your entire Azure network. Instead of jumping between individual resource blades, you get a single pane of glass that shows you what is healthy, what is degraded, and where to dig deeper. The key is making sure flow logs and diagnostic settings are enabled so that Network Insights has the data it needs to be useful.
