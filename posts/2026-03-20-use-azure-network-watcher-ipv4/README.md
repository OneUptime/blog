# How to Use Azure Network Watcher to Troubleshoot IPv4 Connectivity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Network Watcher, IPv4, Troubleshooting, Connectivity, Diagnostic

Description: Use Azure Network Watcher tools including IP flow verify, next hop, connection troubleshoot, and packet capture to diagnose IPv4 connectivity issues in Azure VNets.

## Introduction

Azure Network Watcher provides a suite of diagnostic tools for Azure networking. For IPv4 connectivity issues, the most useful tools are IP Flow Verify (does NSG allow this traffic?), Next Hop (what is the routing decision?), Connection Troubleshoot (end-to-end path analysis), and Packet Capture.

## Prerequisites

Network Watcher must be enabled for the region:

```bash
RESOURCE_GROUP="NetworkWatcherRG"

az network watcher configure \
  --resource-group $RESOURCE_GROUP \
  --locations eastus \
  --enabled true
```

## IP Flow Verify - Check if NSG Allows Traffic

Answers: "Will an NSG allow or block this specific flow?"

```bash
# Check if inbound TCP port 80 from 203.0.113.10 is allowed to a VM

az network watcher test-ip-flow \
  --resource-group my-network-rg \
  --vm app-vm-01 \
  --direction Inbound \
  --local 10.100.2.10:80 \
  --remote 203.0.113.10:12345 \
  --protocol TCP
```

Output shows `Allow` or `Deny` and which NSG rule caused the decision.

## Next Hop - Determine Routing Decision

Answers: "What does Azure route my traffic to next?"

```bash
# Check next hop from VM to a destination
az network watcher show-next-hop \
  --resource-group my-network-rg \
  --vm app-vm-01 \
  --source-ip 10.100.2.10 \
  --dest-ip 8.8.8.8
```

Output shows `nextHopType` (Internet, VirtualAppliance, VirtualNetworkGateway, None) and `nextHopIpAddress`.

## Connection Troubleshoot - End-to-End Connectivity

Answers: "Can VM A reach VM B or an external host?"

```bash
# Test TCP connectivity from VM to a destination
az network watcher test-connectivity \
  --resource-group my-network-rg \
  --source-resource app-vm-01 \
  --dest-address 10.100.3.10 \
  --dest-port 5432
```

This checks routing, NSG rules, and OS-level firewall simultaneously.

## Packet Capture

```bash
# Start a packet capture on a VM (captures to storage)
STORAGE_ID=$(az storage account show \
  --resource-group my-network-rg \
  --name mystorageaccount \
  --query id --output tsv)

az network watcher packet-capture create \
  --resource-group my-network-rg \
  --vm app-vm-01 \
  --name capture-session \
  --storage-account $STORAGE_ID \
  --time-limit 120 \
  --filters '[{"protocol":"TCP","localIPAddress":"10.100.2.10","remoteIPAddress":"","localPort":"80","remotePort":""}]'

# Stop the capture
az network watcher packet-capture stop \
  --location eastus \
  --name capture-session

# List captures
az network watcher packet-capture list \
  --location eastus
```

## VPN Troubleshoot

```bash
az network watcher troubleshooting start \
  --resource-group my-network-rg \
  --resource vpn-gateway \
  --resource-type vnetGateway \
  --storage-account mystorageaccount \
  --storage-path https://mystorageaccount.blob.core.windows.net/watcher
```

## Flow Logs for Traffic Analysis

```bash
# Enable NSG flow logs (requires Network Watcher)
az network watcher flow-log create \
  --resource-group my-network-rg \
  --location eastus \
  --name nsg-flow-log \
  --nsg web-nsg \
  --storage-account mystorageaccount \
  --enabled true \
  --format JSON \
  --log-version 2
```

## Common Troubleshooting Workflow

```text
1. IP Flow Verify       → Is the NSG allowing/blocking?
2. Next Hop             → Is routing correct?
3. Connection Troubleshoot → End-to-end path (combines routing + NSG)
4. Packet Capture       → Deep inspection if all looks correct
5. Flow Logs            → Historical traffic pattern analysis
```

## Conclusion

Use Azure Network Watcher's IP Flow Verify to check NSG rules, Next Hop to verify routing decisions, and Connection Troubleshoot for end-to-end path analysis. Enable flow logs on NSGs for historical IPv4 traffic monitoring. Packet capture provides low-level inspection when other tools don't reveal the issue.
