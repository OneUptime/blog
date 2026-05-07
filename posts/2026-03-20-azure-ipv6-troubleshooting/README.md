# How to Troubleshoot IPv6 Issues in Azure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, IPv6, Troubleshooting, Network Diagnostics, NSG, Routing

Description: Systematic approach to diagnosing Azure IPv6 connectivity failures, including NSG rule debugging, routing verification, DNS resolution issues, and load balancer configuration problems.

## Introduction

Azure IPv6 troubleshooting requires checking multiple layers: VNet/subnet IPv6 configuration, NIC IP configurations, NSG rules for IPv6, route tables, and DNS resolution. Unlike on-premises networks, Azure's control plane provides diagnostic tools (Network Watcher, effective routes) that make diagnosis faster than traditional packet captures.

## Step 1: Verify IPv6 Address Assignment

```bash
# Check if VM has IPv6 address assigned

az vm show \
    --resource-group "$RG" \
    --name vm-web-01 \
    --query "networkProfile.networkInterfaces[0].id" \
    --output tsv | \
xargs az network nic show --ids \
    --query "ipConfigurations[*].{name:name, version:privateIPAddressVersion, ip:privateIPAddress}"

# If no IPv6 IP config exists:
# → NIC doesn't have IPv6 configuration
# → Add IPv6 IP config to NIC

# Check subnet has IPv6 CIDR
az network vnet subnet show \
    --resource-group "$RG" \
    --vnet-name vnet-main \
    --name subnet-web \
    --query "addressPrefixes"
# Should show both IPv4 and IPv6 CIDRs
```

## Step 2: Check NSG Rules for IPv6

```bash
# Get effective NSG rules for a VM NIC
NIC_ID=$(az vm show -g "$RG" -n vm-web-01 --query "networkProfile.networkInterfaces[0].id" -o tsv)

az network nic list-effective-nsg \
    --ids "$NIC_ID" \
    --query "effectiveSecurityRules[].{name:name, direction:direction, access:access, protocol:protocol, src:sourceAddressPrefix, dst:destinationAddressPrefix, port:destinationPortRange}"

# Common issue: The effective rule set doesn't allow the IPv6 flow you expect
# Fix: Add or adjust the rule that should allow that flow

az network nsg rule create \
    --resource-group "$RG" \
    --nsg-name nsg-web \
    --name AllowHTTPv6 \
    --priority 110 \
    --protocol Tcp \
    --direction Inbound \
    --source-address-prefixes "::/0" \
    --destination-port-ranges 80 \
    --access Allow
```

## Step 3: Check Effective Routes for IPv6

```bash
# Check effective routes on NIC
az network nic show-effective-route-table \
    --ids "$NIC_ID" \
    --query "value[?contains(addressPrefix[0], ':')].{prefix:addressPrefix, nextHopType:nextHopType, source:source, state:state}"

# Review whether the expected IPv6 route is present and active
# Effective routes combine Azure default routes, user-defined routes, and BGP-propagated routes

# Check subnet-associated route table for IPv6 UDRs
ROUTE_TABLE_ID=$(az network vnet subnet show \
    --resource-group "$RG" \
    --vnet-name vnet-main \
    --name subnet-web \
    --query "routeTable.id" --output tsv)

if [ -n "$ROUTE_TABLE_ID" ]; then
    az network route-table show \
        --ids "$ROUTE_TABLE_ID" \
        --query "routes[?contains(addressPrefix, ':')].{name:name, prefix:addressPrefix, nextHopType:nextHopType, nextHopIp:nextHopIpAddress}"
fi
```

## Step 4: Use IP Flow Verify

```bash
# Azure CLI IP flow verify currently documents IPv4-only tuple syntax for
# --local and --remote. For IPv6 troubleshooting, use effective NSG rules
# (Step 2) and test-connectivity against the target IPv6 address (Step 6).
```

## Step 5: Check DNS Resolution for IPv6

```bash
# Test AAAA record resolution from within Azure
# SSH into a VM and:
dig AAAA myservice.example.com

# Check if private DNS zone has AAAA records
az network private-dns record-set aaaa list \
    --resource-group "$RG" \
    --zone-name internal.example.com

# Check if Azure-provided DNS returns AAAA
nslookup -type=AAAA myservice.example.com 168.63.129.16

# Verify VNet-linked private DNS zones
az network private-dns link vnet list \
    --resource-group "$RG" \
    --zone-name internal.example.com
```

## Step 6: Test Connectivity Between VMs

```bash
# Connection troubleshoot tool
SOURCE_VM_ID=$(az vm show -g "$RG" -n vm-source --query id -o tsv)
DEST_NIC_ID=$(az vm show -g "$RG" -n vm-dest --query "networkProfile.networkInterfaces[0].id" -o tsv)
DEST_IPV6=$(az network nic show --ids "$DEST_NIC_ID" \
    --query "ipConfigurations[?privateIPAddressVersion=='IPv6'].privateIPAddress | [0]" -o tsv)

az network watcher test-connectivity \
    --source-resource "$SOURCE_VM_ID" \
    --dest-address "$DEST_IPV6" \
    --dest-port 80 \
    --protocol Tcp

# If unreachable: inspect hops and reported issues in output
# Connection troubleshoot shows route and security-rule failures on the path
```

## Diagnostic Checklist

```bash
#!/bin/bash
# azure-ipv6-diagnosis.sh

VM_NAME="$1"
RG="$2"

echo "=== Azure IPv6 Diagnostics for $VM_NAME ==="

# 1. IPv6 address
echo ""
echo "1. IPv6 addresses:"
NIC_ID=$(az vm show -g "$RG" -n "$VM_NAME" --query "networkProfile.networkInterfaces[0].id" -o tsv)
az network nic show --ids "$NIC_ID" \
    --query "ipConfigurations[?privateIPAddressVersion=='IPv6'].privateIPAddress" 2>/dev/null

# 2. Subnet IPv6 CIDR
echo ""
echo "2. Subnet IPv6 CIDR:"
SUBNET_ID=$(az network nic show --ids "$NIC_ID" --query "ipConfigurations[0].subnet.id" -o tsv)
az network vnet subnet show --ids "$SUBNET_ID" --query "addressPrefixes[?contains(@, ':')]" 2>/dev/null

# 3. NSG IPv6 rules
echo ""
echo "3. Effective NSG rules:"
az network nic list-effective-nsg --ids "$NIC_ID" \
    --query "effectiveSecurityRules[].{name:name, dir:direction, access:access, proto:protocol, src:sourceAddressPrefix, dst:destinationAddressPrefix, port:destinationPortRange}" 2>/dev/null

# 4. IPv6 effective routes
echo ""
echo "4. IPv6 effective routes:"
az network nic show-effective-route-table --ids "$NIC_ID" \
    --query "value[?contains(addressPrefix[0], ':')].{prefix:addressPrefix, nextHopType:nextHopType, source:source, state:state}" 2>/dev/null
```

## Conclusion

Azure IPv6 troubleshooting follows a layered approach: verify the NIC has an IPv6 IP configuration, check the subnet has an IPv6 CIDR, confirm the effective NSG rules allow the IPv6 flow you expect, and verify the effective route table contains the IPv6 routes required for the path you're testing. Use `az network nic show-effective-route-table` and `az network nic list-effective-nsg` to see the actual applied configuration rather than just the configured resources, and use connection troubleshoot to identify route or security-rule failures along an IPv6 path.
