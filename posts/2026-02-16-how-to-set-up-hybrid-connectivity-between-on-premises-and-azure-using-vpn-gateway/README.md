# How to Set Up Hybrid Connectivity Between On-Premises and Azure Using VPN Gateway

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, VPN Gateway, Hybrid Connectivity, Networking, Site-to-Site, IPSec, Cloud Infrastructure

Description: Step-by-step guide to establishing secure hybrid connectivity between your on-premises data center and Azure using a Site-to-Site VPN Gateway.

---

Most organizations moving to Azure do not move everything at once. You typically have workloads split between your on-premises data center and Azure for months or even years. During this time, those workloads need to communicate securely. Azure VPN Gateway provides an encrypted IPSec tunnel between your on-premises network and Azure virtual networks, letting resources on both sides communicate as if they were on the same network.

In this post, I will walk through the full setup of a Site-to-Site (S2S) VPN connection, from planning to configuration to troubleshooting.

## Planning Your VPN Connection

Before you start deploying resources, you need to settle a few things:

**Address spaces must not overlap.** If your on-premises network uses 10.0.0.0/16 and your Azure VNet also uses 10.0.0.0/16, routing will break. Plan your Azure address spaces to avoid conflicts with on-premises ranges.

**Choose the right VPN Gateway SKU.** The SKU determines throughput, number of tunnels, and whether you get active-active support:

| SKU | Throughput | S2S Tunnels | P2S Connections |
|-----|-----------|-------------|-----------------|
| VpnGw1 | 650 Mbps | 30 | 250 |
| VpnGw2 | 1 Gbps | 30 | 500 |
| VpnGw3 | 1.25 Gbps | 30 | 1000 |
| VpnGw4 | 5 Gbps | 100 | 5000 |
| VpnGw5 | 10 Gbps | 100 | 10000 |

For most production workloads, VpnGw2 or VpnGw3 provides sufficient throughput. If you need more, consider ExpressRoute.

**Know your on-premises VPN device.** Azure supports most IPSec/IKE-compatible VPN devices. Check the [validated device list](https://learn.microsoft.com/en-us/azure/vpn-gateway/vpn-gateway-about-vpn-devices) to confirm yours is supported.

## Creating the Azure Resources

Here is the step-by-step process to set up the Azure side of the VPN connection:

```bash
# Step 1: Create a resource group
az group create \
  --name vpn-rg \
  --location eastus

# Step 2: Create the virtual network with a gateway subnet
# The GatewaySubnet must be at least /27 but /24 is recommended
az network vnet create \
  --resource-group vpn-rg \
  --name hub-vnet \
  --address-prefix 10.0.0.0/16 \
  --subnet-name workload-subnet \
  --subnet-prefix 10.0.1.0/24 \
  --location eastus

az network vnet subnet create \
  --resource-group vpn-rg \
  --vnet-name hub-vnet \
  --name GatewaySubnet \
  --address-prefix 10.0.255.0/24

# Step 3: Create a public IP for the VPN gateway
# Must be Standard SKU for VpnGw2+
az network public-ip create \
  --resource-group vpn-rg \
  --name vpn-gateway-pip \
  --allocation-method Static \
  --sku Standard

# Step 4: Create the VPN Gateway
# This takes 30-45 minutes to provision
az network vnet-gateway create \
  --resource-group vpn-rg \
  --name hub-vpn-gateway \
  --vnet hub-vnet \
  --public-ip-addresses vpn-gateway-pip \
  --gateway-type Vpn \
  --vpn-type RouteBased \
  --sku VpnGw2 \
  --generation Generation2 \
  --no-wait

echo "VPN Gateway creation started - this will take 30-45 minutes"
```

## Configuring the Local Network Gateway

The Local Network Gateway represents your on-premises network in Azure. It tells Azure what address ranges exist on-premises and the public IP of your on-premises VPN device:

```bash
# Create the local network gateway
# Replace with your actual on-premises public IP and address ranges
az network local-gateway create \
  --resource-group vpn-rg \
  --name onprem-local-gateway \
  --gateway-ip-address 203.0.113.50 \
  --local-address-prefixes 172.16.0.0/16 192.168.0.0/16

# If your on-premises device supports BGP, use BGP instead of static routes
# BGP dynamically exchanges routes and is preferred for complex networks
az network local-gateway create \
  --resource-group vpn-rg \
  --name onprem-local-gateway-bgp \
  --gateway-ip-address 203.0.113.50 \
  --local-address-prefixes 172.16.0.0/16 \
  --bgp-peering-address 172.16.0.1 \
  --asn 65001
```

## Creating the VPN Connection

Once the VPN Gateway is provisioned and the Local Network Gateway is configured, create the connection:

```bash
# Create the Site-to-Site VPN connection
# The shared key must match what you configure on your on-premises device
az network vpn-connection create \
  --resource-group vpn-rg \
  --name azure-to-onprem \
  --vnet-gateway1 hub-vpn-gateway \
  --local-gateway2 onprem-local-gateway \
  --shared-key "YourSharedKey123!" \
  --connection-protocol IKEv2 \
  --enable-bgp false

# For enhanced security, configure a custom IPSec policy
# This overrides the default policy with stronger algorithms
az network vpn-connection ipsec-policy add \
  --resource-group vpn-rg \
  --connection-name azure-to-onprem \
  --ike-encryption AES256 \
  --ike-integrity SHA384 \
  --dh-group DHGroup14 \
  --ipsec-encryption GCMAES256 \
  --ipsec-integrity GCMAES256 \
  --pfs-group PFS14 \
  --sa-lifetime 28800 \
  --sa-max-size 1024
```

## Configuring the On-Premises VPN Device

The configuration on your on-premises device varies by manufacturer, but here are the key parameters you need:

```text
Azure VPN Gateway Public IP: (from the public IP resource)
Pre-Shared Key: YourSharedKey123!
IKE Version: IKEv2
Remote Network: 10.0.0.0/16 (Azure VNet address space)

Phase 1 (IKE) Settings:
  Encryption: AES-256
  Integrity: SHA-384
  DH Group: 14
  SA Lifetime: 28800 seconds

Phase 2 (IPSec) Settings:
  Encryption: GCM-AES-256
  Integrity: GCM-AES-256
  PFS Group: PFS14
  SA Lifetime: 28800 seconds
```

For common devices like Cisco, Juniper, and Fortinet, Azure can generate a device-specific configuration script:

```bash
# Download the configuration for your specific device
az network vpn-connection show-device-config-script \
  --resource-group vpn-rg \
  --connection-name azure-to-onprem \
  --vendor "Cisco" \
  --device-family "ASA" \
  --firmware-version "9.x"
```

## Setting Up Active-Active for High Availability

A single VPN gateway instance creates a single point of failure. For production workloads, configure active-active mode with two gateway instances:

```bash
# Create a second public IP for the active-active configuration
az network public-ip create \
  --resource-group vpn-rg \
  --name vpn-gateway-pip2 \
  --allocation-method Static \
  --sku Standard

# Create the VPN gateway in active-active mode
az network vnet-gateway create \
  --resource-group vpn-rg \
  --name hub-vpn-gateway-ha \
  --vnet hub-vnet \
  --public-ip-addresses vpn-gateway-pip vpn-gateway-pip2 \
  --gateway-type Vpn \
  --vpn-type RouteBased \
  --sku VpnGw2 \
  --generation Generation2 \
  --vpn-gateway-generation Generation2 \
  --no-wait
```

With active-active mode, Azure provisions two gateway instances. Each has its own public IP. Your on-premises device should establish tunnels to both IPs. If one instance goes down, traffic automatically fails over to the other.

## Verifying the Connection

After configuring both sides, verify the connection is established:

```bash
# Check the connection status
az network vpn-connection show \
  --resource-group vpn-rg \
  --name azure-to-onprem \
  --query "{status: connectionStatus, ingressBytes: ingressBytesTransferred, egressBytes: egressBytesTransferred}"

# Expected output when connected:
# {
#   "status": "Connected",
#   "ingressBytes": 12345,
#   "egressBytes": 67890
# }

# If the status is "Connecting" or "NotConnected", check the gateway diagnostics
az network vnet-gateway show \
  --resource-group vpn-rg \
  --name hub-vpn-gateway \
  --query "bgpSettings"
```

## Troubleshooting Common Issues

When the tunnel does not come up, these are the most common causes:

**Shared key mismatch.** The most frequent issue. The pre-shared key must be identical on both sides, including capitalization.

**IKE version mismatch.** Azure uses IKEv2 by default. If your on-premises device is configured for IKEv1, either reconfigure it for IKEv2 or change the Azure connection protocol.

**NAT traversal issues.** If your on-premises VPN device is behind a NAT, make sure UDP ports 500 and 4500 are forwarded.

**Firewall blocking.** Check that your on-premises firewall allows ESP (protocol 50), UDP 500 (IKE), and UDP 4500 (NAT-T).

To get detailed diagnostics:

```bash
# Enable VPN Gateway diagnostics
az monitor diagnostic-settings create \
  --resource $(az network vnet-gateway show \
    --resource-group vpn-rg \
    --name hub-vpn-gateway \
    --query id --output tsv) \
  --name vpn-diagnostics \
  --workspace $(az monitor log-analytics workspace show \
    --resource-group vpn-rg \
    --workspace-name vpn-logs \
    --query id --output tsv) \
  --logs '[
    {"category": "GatewayDiagnosticLog", "enabled": true},
    {"category": "TunnelDiagnosticLog", "enabled": true},
    {"category": "RouteDiagnosticLog", "enabled": true},
    {"category": "IKEDiagnosticLog", "enabled": true}
  ]'
```

Then query the logs in Log Analytics:

```
// Check IKE negotiation events
AzureDiagnostics
| where Category == "IKEDiagnosticLog"
| where TimeGenerated > ago(1h)
| project TimeGenerated, Message
| order by TimeGenerated desc
```

## Monitoring VPN Health

Set up alerts for VPN connection health:

```bash
# Alert when the VPN tunnel goes down
az monitor metrics alert create \
  --resource-group vpn-rg \
  --name "vpn-tunnel-down" \
  --scopes $(az network vpn-connection show \
    --resource-group vpn-rg \
    --name azure-to-onprem \
    --query id --output tsv) \
  --condition "avg TunnelAverageBandwidth < 1" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action-group ops-team \
  --description "VPN tunnel bandwidth dropped to zero - tunnel may be down"
```

## Summary

Setting up a Site-to-Site VPN between on-premises and Azure is a foundational step for hybrid cloud architectures. The key steps are planning non-overlapping address spaces, deploying the VPN gateway in the hub VNet, configuring the local network gateway to represent on-premises, establishing the connection with matching IPSec parameters, and enabling active-active mode for production reliability. Once connected, your on-premises workloads can communicate with Azure resources as if they were on the same network, with all traffic encrypted through the IPSec tunnel.
