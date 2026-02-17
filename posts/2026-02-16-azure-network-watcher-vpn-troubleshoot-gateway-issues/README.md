# How to Use Azure Network Watcher VPN Troubleshoot to Diagnose Gateway Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Network Watcher, VPN Troubleshoot, VPN Gateway, Diagnostics, Networking, Troubleshooting

Description: Use Azure Network Watcher VPN Troubleshoot to diagnose and resolve VPN gateway connection issues with detailed diagnostic logs.

---

VPN connections fail. It is not a matter of if, but when. Maybe the tunnel drops after a network change, maybe a configuration drift breaks the IKE negotiation, or maybe the gateway is experiencing resource constraints. When it happens, you need a way to quickly identify the root cause without spending hours manually checking every parameter.

Azure Network Watcher VPN Troubleshoot is a diagnostic tool that automatically analyzes your VPN gateway and its connections, identifies problems, and provides actionable recommendations. It checks everything from IKE negotiation to certificate validity to resource health, and outputs detailed logs you can dig through.

In this guide, I will show you how to use VPN Troubleshoot, interpret the results, and fix the most common problems it identifies.

## What VPN Troubleshoot Checks

When you run VPN Troubleshoot, it performs a comprehensive analysis of the VPN gateway or a specific connection. The checks include:

- Gateway resource health and provisioning state
- Connection configuration validity
- IKE negotiation logs (Phase 1 and Phase 2)
- IPsec Security Association (SA) status
- Gateway certificate validity
- Route table consistency
- BGP session status (if BGP is enabled)
- Bandwidth and throughput metrics
- Gateway CPU and memory utilization

The tool outputs results in three categories:
- **Healthy**: Everything looks good
- **Unhealthy**: A specific problem was identified with a recommendation
- **Not Run**: The check was not applicable or could not be performed

## Prerequisites

VPN Troubleshoot stores its diagnostic output in an Azure Storage account. You need:

- Network Watcher enabled in the gateway's region
- A Storage Account in the same region as the VPN gateway
- The VPN Gateway resource ID

```bash
# Verify Network Watcher is enabled
az network watcher list --output table

# Create a storage account for diagnostic output (if you don't have one)
az storage account create \
  --resource-group rg-vpn \
  --name stvpndiagnostics \
  --location eastus \
  --sku Standard_LRS \
  --kind StorageV2

# Create a container for the diagnostic logs
az storage container create \
  --account-name stvpndiagnostics \
  --name vpn-diagnostics \
  --auth-mode login
```

## Running VPN Troubleshoot on a Gateway

To diagnose general gateway health, run the troubleshoot command against the gateway resource.

```bash
# Get the VPN gateway resource ID
GATEWAY_ID=$(az network vnet-gateway show \
  --resource-group rg-vpn \
  --name vpngw-main \
  --query id \
  --output tsv)

# Get the storage account ID
STORAGE_ID=$(az storage account show \
  --resource-group rg-vpn \
  --name stvpndiagnostics \
  --query id \
  --output tsv)

# Run VPN Troubleshoot on the gateway
# This can take 5-10 minutes to complete
az network watcher troubleshooting start \
  --resource $GATEWAY_ID \
  --resource-type vpnGateway \
  --storage-account $STORAGE_ID \
  --storage-path "https://stvpndiagnostics.blob.core.windows.net/vpn-diagnostics"
```

The command takes a few minutes because it performs live diagnostics on the gateway. The output includes a summary of findings and a link to detailed logs in the storage account.

## Running VPN Troubleshoot on a Connection

For connection-specific issues, run the troubleshoot against a specific VPN connection.

```bash
# Get the VPN connection resource ID
CONNECTION_ID=$(az network vpn-connection show \
  --resource-group rg-vpn \
  --name conn-to-onprem \
  --query id \
  --output tsv)

# Run VPN Troubleshoot on the specific connection
az network watcher troubleshooting start \
  --resource $CONNECTION_ID \
  --resource-type vpnConnection \
  --storage-account $STORAGE_ID \
  --storage-path "https://stvpndiagnostics.blob.core.windows.net/vpn-diagnostics"
```

## Interpreting the Results

The troubleshoot command returns a JSON response with the overall code and a list of findings. Here is what a typical output looks like.

```json
{
  "code": "Unhealthy",
  "results": [
    {
      "id": "NoConnection",
      "summary": "VPN connection is not connected",
      "detail": "The VPN connection 'conn-to-onprem' is in a Connecting state. The IKE negotiation is failing.",
      "recommendedActions": [
        {
          "actionText": "Verify the shared key matches on both sides",
          "actionUri": "https://docs.microsoft.com/...",
          "actionUriText": "Learn more"
        },
        {
          "actionText": "Check that the on-premises VPN device supports the configured IPsec/IKE parameters",
          "actionUri": "https://docs.microsoft.com/...",
          "actionUriText": "Supported devices"
        }
      ]
    }
  ]
}
```

The key fields are:

- `code`: Overall health status (Healthy, Unhealthy, or NotRun)
- `id`: The specific issue identified (NoConnection, GatewayNotFound, etc.)
- `summary`: A brief description of the problem
- `detail`: More context about the issue
- `recommendedActions`: Steps to fix the problem

## Accessing Detailed Diagnostic Logs

The real treasure is in the detailed logs stored in the storage account. These contain IKE negotiation traces that show exactly where the negotiation fails.

```bash
# List the diagnostic log files
az storage blob list \
  --account-name stvpndiagnostics \
  --container-name vpn-diagnostics \
  --auth-mode login \
  --output table

# Download the IKE log file for analysis
az storage blob download \
  --account-name stvpndiagnostics \
  --container-name vpn-diagnostics \
  --name "IKEErrors.txt" \
  --file /tmp/ike-errors.txt \
  --auth-mode login
```

The IKE log file contains detailed negotiation traces. Here is what to look for.

### Phase 1 (IKE SA) Failures

If Phase 1 fails, you will see messages like:

```
No matching proposal found during IKE_SA_INIT exchange
```

This means the IKE encryption, integrity, or DH group parameters do not match between Azure and the on-premises device. Check that both sides have identical Phase 1 proposals.

```
IKE_AUTH exchange failed: Authentication failed
```

This indicates a shared key mismatch. The pre-shared key on the on-premises device does not match what Azure has configured.

### Phase 2 (IPsec SA) Failures

If Phase 1 succeeds but Phase 2 fails:

```
No matching IPsec transform set found during CREATE_CHILD_SA
```

The IPsec encryption, integrity, or PFS group parameters do not match. This is a separate set of parameters from Phase 1.

## Common Issues and Fixes

### Issue 1: Connection Shows "Connecting" State

The tunnel cannot be established. Run troubleshoot and check the IKE logs.

```bash
# Quick check: verify connection status
az network vpn-connection show \
  --resource-group rg-vpn \
  --name conn-to-onprem \
  --query "{status:connectionStatus, inBytes:ingressBytesTransferred, outBytes:egressBytesTransferred}" \
  --output table
```

Common causes:
- Shared key mismatch
- IPsec parameter mismatch
- On-premises firewall blocking UDP 500/4500
- Incorrect public IP in the local network gateway

Fix the shared key if it is wrong.

```bash
# Update the shared key on the Azure side
az network vpn-connection update \
  --resource-group rg-vpn \
  --name conn-to-onprem \
  --shared-key "CorrectedPreSharedKey456!"
```

### Issue 2: Tunnel Drops Periodically

The tunnel comes up but disconnects regularly. This is often caused by SA lifetime mismatches.

```bash
# Check the current IPsec policy on the connection
az network vpn-connection ipsec-policy list \
  --resource-group rg-vpn \
  --connection-name conn-to-onprem \
  --output table
```

If the SA lifetimes differ between Azure and on-premises, the tunnel renegotiates at different times on each side, which can cause drops. Align the lifetimes.

```bash
# Set a custom IPsec policy with explicit SA lifetime
az network vpn-connection ipsec-policy add \
  --resource-group rg-vpn \
  --connection-name conn-to-onprem \
  --ike-encryption AES256 \
  --ike-integrity SHA256 \
  --dh-group DHGroup14 \
  --ipsec-encryption AES256 \
  --ipsec-integrity SHA256 \
  --pfs-group PFS2048 \
  --sa-lifetime 28800 \
  --sa-max-size 102400000
```

### Issue 3: Gateway CPU or Memory High

If the gateway is overloaded, connections can become unstable.

```bash
# Check gateway metrics for CPU and memory usage
az monitor metrics list \
  --resource $GATEWAY_ID \
  --metric "TunnelAverageBandwidth" \
  --interval PT5M \
  --aggregation Average \
  --output table
```

If the gateway is consistently at high utilization, upgrade to a larger SKU.

```bash
# Resize the VPN gateway (non-disruptive for same-generation upgrades)
az network vnet-gateway update \
  --resource-group rg-vpn \
  --name vpngw-main \
  --sku VpnGw3
```

### Issue 4: BGP Session Not Established

If BGP is enabled but sessions are not coming up.

```bash
# Check BGP peer status
az network vnet-gateway list-bgp-peer-status \
  --resource-group rg-vpn \
  --name vpngw-main \
  --output table
```

The output shows each BGP peer's state (Connected, Connecting, Unknown). If a peer shows "Connecting" for an extended period, the BGP configuration is wrong on one or both sides.

Common BGP issues:
- ASN mismatch
- BGP peer address not reachable through the tunnel
- BGP keepalive timeout too aggressive

## Resetting the VPN Gateway

If diagnostics do not reveal a clear cause and the gateway is behaving erratically, a gateway reset can help. This restarts the gateway's instances without deleting the configuration.

```bash
# Reset the VPN gateway (causes a brief interruption)
az network vnet-gateway reset \
  --resource-group rg-vpn \
  --name vpngw-main
```

A reset takes about 5-10 minutes. Both active-active instances are restarted sequentially (if using active-active), so there is a brief connectivity interruption.

## Automating Diagnostics

For production environments, set up automated diagnostics on a schedule.

```bash
#!/bin/bash
# Automated VPN health check script
# Run via Azure Automation or cron

RESOURCE_GROUP="rg-vpn"
GATEWAY_NAME="vpngw-main"
STORAGE_ACCOUNT="stvpndiagnostics"

GATEWAY_ID=$(az network vnet-gateway show \
  -g $RESOURCE_GROUP -n $GATEWAY_NAME --query id -o tsv)

STORAGE_ID=$(az storage account show \
  -g $RESOURCE_GROUP -n $STORAGE_ACCOUNT --query id -o tsv)

# Run troubleshoot and capture result
RESULT=$(az network watcher troubleshooting start \
  --resource $GATEWAY_ID \
  --resource-type vpnGateway \
  --storage-account $STORAGE_ID \
  --storage-path "https://${STORAGE_ACCOUNT}.blob.core.windows.net/vpn-diagnostics" \
  --query code -o tsv)

if [ "$RESULT" != "Healthy" ]; then
  echo "VPN Gateway health check failed: $RESULT"
  # Send alert via your preferred method
fi
```

## Proactive Monitoring

Do not wait for problems to happen. Set up proactive alerts on VPN gateway metrics.

```bash
# Alert when tunnel bandwidth drops to zero (tunnel down)
az monitor metrics alert create \
  --resource-group rg-vpn \
  --name alert-vpn-tunnel-down \
  --scopes $GATEWAY_ID \
  --condition "avg TunnelAverageBandwidth < 1" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --severity 1 \
  --description "VPN tunnel appears to be down"

# Alert when gateway P2S connection count exceeds threshold
az monitor metrics alert create \
  --resource-group rg-vpn \
  --name alert-vpn-bgp-down \
  --scopes $GATEWAY_ID \
  --condition "avg BgpPeerStatus < 1" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --severity 2 \
  --description "BGP peer status degraded"
```

VPN Troubleshoot is one of the most useful tools in the Azure networking toolkit. It saves hours of manual investigation by performing comprehensive checks and pointing you directly to the problem. Use it at the first sign of trouble rather than trying to manually debug IKE negotiation logs - your future self will thank you.
