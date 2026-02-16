# How to Configure AKS API Server Authorized IP Ranges for Secure Cluster Access

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AKS, Kubernetes, API Server, Security, Network Security, Azure, Access Control

Description: Learn how to configure AKS API server authorized IP ranges to restrict kubectl and API access to trusted networks and prevent unauthorized cluster access.

---

By default, the AKS API server is accessible from any IP address on the internet. Anyone who obtains valid credentials can run kubectl commands against your cluster from anywhere in the world. For a production cluster, this is an unacceptable security posture. API server authorized IP ranges let you restrict which networks can communicate with the Kubernetes API, adding a network-level access control layer on top of the existing authentication and authorization.

This is different from a private cluster (where the API server has no public endpoint at all). Authorized IP ranges keep the public endpoint but restrict it to a whitelist of trusted IP addresses. It is simpler to set up than a private cluster and works well for teams that need to access the cluster from known locations.

## Enabling Authorized IP Ranges

You can enable authorized IP ranges when creating a cluster or on an existing cluster.

```bash
# Enable on a new cluster
# Allow access from your office IP and a CI/CD pipeline
az aks create \
  --resource-group myRG \
  --name myAKS \
  --node-count 3 \
  --api-server-authorized-ip-ranges "203.0.113.50/32,198.51.100.0/24"

# Enable on an existing cluster
az aks update \
  --resource-group myRG \
  --name myAKS \
  --api-server-authorized-ip-ranges "203.0.113.50/32,198.51.100.0/24"
```

Once enabled, only requests from the specified IP ranges can reach the API server. Requests from any other IP get a connection refused error - they cannot even reach the authentication layer.

## Finding Your Current IP Address

Before configuring the ranges, make sure you include your own IP address. Locking yourself out is the most common mistake.

```bash
# Get your current public IP
MY_IP=$(curl -s ifconfig.me)
echo "Your IP: $MY_IP"

# Enable authorized IP ranges including your current IP
az aks update \
  --resource-group myRG \
  --name myAKS \
  --api-server-authorized-ip-ranges "${MY_IP}/32,198.51.100.0/24"
```

## What IP Ranges to Include

You need to include every network that legitimately needs API server access. Here is a typical list.

### Office Networks

Your team's office public IP addresses.

```bash
# Find your office's public IP range (ask your network team, or check from the office)
# Usually a /28 or /29 block
OFFICE_IP_RANGE="203.0.113.0/28"
```

### VPN Exit IPs

If your team uses a VPN, include the VPN's public exit IP addresses.

```bash
# VPN provider typically has a set of exit IPs
VPN_IPS="198.51.100.10/32,198.51.100.11/32"
```

### CI/CD Pipeline IPs

Your CI/CD system (Azure DevOps, GitHub Actions, Jenkins) needs API server access to deploy workloads.

```bash
# Azure DevOps hosted agents use Microsoft's IP ranges
# Check: https://learn.microsoft.com/en-us/azure/devops/organizations/security/allow-list-ip-url
# For self-hosted agents, use the agent's public IP

# GitHub Actions uses published IP ranges
# Check: https://api.github.com/meta for the "actions" key
```

### AKS Node Subnet

The AKS nodes themselves communicate with the API server. If you are using standard load balancer with outbound rules, you need to include the outbound IP of the nodes.

```bash
# Get the outbound IPs used by the AKS cluster
OUTBOUND_IPS=$(az aks show \
  --resource-group myRG \
  --name myAKS \
  --query "networkProfile.loadBalancerProfile.effectiveOutboundIPs[].id" -o tsv)

for IP_ID in $OUTBOUND_IPS; do
  az network public-ip show --ids "$IP_ID" --query ipAddress -o tsv
done
```

AKS automatically includes the node outbound IPs in the authorized ranges, so you typically do not need to add them manually. But if you change the outbound configuration, verify this.

## Building the Complete IP Range List

Here is a script that builds a comprehensive authorized IP range list.

```bash
#!/bin/bash
# build-ip-ranges.sh
# Constructs the authorized IP range list for the AKS API server

# Your current IP (for immediate access)
MY_IP=$(curl -s ifconfig.me)

# Office IPs
OFFICE="203.0.113.0/28"

# VPN exit IPs
VPN="198.51.100.10/32,198.51.100.11/32"

# CI/CD agents (self-hosted)
CICD="10.0.1.50/32"

# Monitoring (if external tools need API access)
MONITORING="192.0.2.100/32"

# Combine all ranges
ALL_RANGES="${MY_IP}/32,${OFFICE},${VPN},${CICD},${MONITORING}"

echo "Applying authorized IP ranges: $ALL_RANGES"

az aks update \
  --resource-group myRG \
  --name myAKS \
  --api-server-authorized-ip-ranges "$ALL_RANGES"
```

## Updating IP Ranges

You can update the authorized IP ranges at any time. The change takes effect within a few minutes.

```bash
# Add a new IP range to the existing list
CURRENT_RANGES=$(az aks show \
  --resource-group myRG \
  --name myAKS \
  --query "apiServerAccessProfile.authorizedIpRanges" -o tsv | tr '\t' ',')

NEW_IP="10.20.30.40/32"

az aks update \
  --resource-group myRG \
  --name myAKS \
  --api-server-authorized-ip-ranges "${CURRENT_RANGES},${NEW_IP}"
```

## Handling Dynamic IP Addresses

If your team works from home or uses ISPs with dynamic IPs, you have a few options.

### Option 1: VPN with Static Exit IP

Route all kubectl traffic through a VPN that has a static public IP. This is the cleanest solution.

### Option 2: Azure Bastion or Jump Box

Set up a VM in Azure with a static IP that has kubectl access. Developers SSH into this VM to interact with the cluster.

```bash
# Create a jump box VM
az vm create \
  --resource-group myRG \
  --name kubectl-jumpbox \
  --image Ubuntu2204 \
  --size Standard_B2s \
  --admin-username azureuser \
  --generate-ssh-keys \
  --public-ip-address jumpbox-ip \
  --public-ip-address-allocation static

# Get the jump box IP
JUMPBOX_IP=$(az network public-ip show \
  --resource-group myRG \
  --name jumpbox-ip \
  --query ipAddress -o tsv)

# Include it in the authorized ranges
az aks update \
  --resource-group myRG \
  --name myAKS \
  --api-server-authorized-ip-ranges "${JUMPBOX_IP}/32,${OFFICE}"
```

### Option 3: Azure Cloud Shell

Azure Cloud Shell runs within Microsoft's network and can access the API server. However, the Cloud Shell IP ranges change, so you would need to include a broader Microsoft IP range.

### Option 4: Temporary Access Script

Create a script that temporarily adds your current IP to the authorized ranges.

```bash
#!/bin/bash
# aks-access.sh
# Temporarily adds your current IP to the AKS authorized IP ranges

RG="myRG"
CLUSTER="myAKS"

MY_IP=$(curl -s ifconfig.me)
echo "Adding your IP ($MY_IP) to authorized ranges..."

CURRENT=$(az aks show -g $RG -n $CLUSTER \
  --query "apiServerAccessProfile.authorizedIpRanges" -o tsv | tr '\t' ',')

az aks update -g $RG -n $CLUSTER \
  --api-server-authorized-ip-ranges "${CURRENT},${MY_IP}/32"

echo "Access granted. Remember to remove your IP when done."
echo "Current authorized ranges: ${CURRENT},${MY_IP}/32"
```

## Verifying the Configuration

After setting up authorized IP ranges, verify they are applied correctly.

```bash
# Check the current authorized IP ranges
az aks show \
  --resource-group myRG \
  --name myAKS \
  --query "apiServerAccessProfile.authorizedIpRanges" -o json

# Test access from an authorized IP
kubectl get nodes

# Test from an unauthorized IP (should timeout/refuse)
# You can test this using a VM or container in a different network
```

If you are locked out, you can still update the ranges using the Azure CLI (which uses the Azure management plane, not the Kubernetes API).

```bash
# If locked out, use Azure CLI to add your IP back
# This works because az aks update goes through Azure Resource Manager,
# not through the Kubernetes API server
az aks update \
  --resource-group myRG \
  --name myAKS \
  --api-server-authorized-ip-ranges "$(curl -s ifconfig.me)/32"
```

## Combining with Other Security Features

Authorized IP ranges are one layer of defense. Combine them with other AKS security features for comprehensive protection.

```bash
# Enable Azure AD authentication for identity-based access
az aks update \
  --resource-group myRG \
  --name myAKS \
  --enable-aad \
  --aad-admin-group-object-ids "<admin-group-id>"

# Enable audit logging to track API server access
az monitor diagnostic-settings create \
  --resource "/subscriptions/<sub-id>/resourceGroups/myRG/providers/Microsoft.ContainerService/managedClusters/myAKS" \
  --name "api-audit-logs" \
  --workspace "<log-analytics-workspace-id>" \
  --logs '[{"category": "kube-audit", "enabled": true}]'
```

## Monitoring Access Attempts

With audit logging enabled, you can monitor who is accessing the API server and from where.

```
// KQL query for Azure Monitor - API server access by source IP
AzureDiagnostics
| where Category == "kube-audit"
| extend sourceIP = extract("sourceIPs\":\\[\"([^\"]+)\"", 1, log_s)
| summarize count() by sourceIP, bin(TimeGenerated, 1h)
| order by count_ desc
```

## Removing Authorized IP Ranges

If you need to disable the feature and allow access from anywhere again (not recommended for production).

```bash
# Remove all authorized IP ranges (opens API to all IPs)
az aks update \
  --resource-group myRG \
  --name myAKS \
  --api-server-authorized-ip-ranges ""
```

## Limitations

There are some limitations to be aware of.

- Maximum of 200 IP ranges can be specified.
- Changes take 2-5 minutes to propagate.
- You cannot use private IP ranges (RFC 1918 addresses) unless you are using a private cluster.
- The feature does not affect traffic between nodes and the API server (which goes through the internal network).
- Azure DevOps hosted agents have a wide range of IPs that change periodically, making them difficult to whitelist precisely.

## Wrapping Up

Authorized IP ranges are a straightforward, effective way to reduce the attack surface of your AKS API server. They add a network-level gate before any authentication happens, meaning attackers cannot even attempt credential-based attacks unless they are on an authorized network. Set them up on every production cluster, include all legitimate access sources, and use a VPN or jump box for developers with dynamic IPs. Combined with Azure AD authentication and audit logging, authorized IP ranges form a solid foundation for AKS cluster security.
