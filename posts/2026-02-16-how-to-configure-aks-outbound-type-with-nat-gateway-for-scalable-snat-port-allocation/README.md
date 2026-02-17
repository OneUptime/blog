# How to Configure AKS Outbound Type with NAT Gateway for Scalable SNAT Port Allocation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AKS, NAT Gateway, SNAT, Kubernetes, Networking, Azure, Outbound Traffic

Description: Learn how to configure AKS clusters with Azure NAT Gateway as the outbound type to solve SNAT port exhaustion and scale outbound connectivity.

---

If you have ever seen intermittent connection timeouts from your AKS pods when they try to reach external services, you have probably hit SNAT port exhaustion. This is one of the most common networking issues in AKS clusters, and it gets worse as your cluster scales up. The default outbound configuration uses Azure Load Balancer with a limited pool of SNAT ports, and it does not scale well.

Azure NAT Gateway solves this problem cleanly. It provides up to 64,512 SNAT ports per public IP address and supports up to 16 public IPs, giving you over a million outbound connections. In this guide, I will show you how to configure AKS with NAT Gateway as the outbound type and explain the architecture behind it.

## Understanding the SNAT Problem

When a pod in AKS makes an outbound connection to the internet, the connection goes through the Azure Load Balancer by default. The load balancer performs Source Network Address Translation (SNAT), mapping the pod's private IP to a public IP address. Each connection consumes a SNAT port, and the total pool is limited.

With the default load balancer outbound type, AKS allocates SNAT ports based on the number of nodes. Once you exceed the available ports, new connections start failing with timeout errors. This is especially painful for applications that make many short-lived connections to external APIs, databases, or third-party services.

## NAT Gateway Architecture

Azure NAT Gateway sits at the subnet level and handles all outbound traffic for resources in that subnet. When configured as the AKS outbound type, all egress traffic from pods flows through the NAT Gateway instead of the load balancer.

Here is how the traffic flow looks:

```mermaid
graph LR
    A[Pod] --> B[Node vNIC]
    B --> C[AKS Subnet]
    C --> D[NAT Gateway]
    D --> E[Public IP / Prefix]
    E --> F[Internet]
```

The key advantage is that NAT Gateway allocates SNAT ports dynamically on demand rather than pre-allocating them per node. This means you get much better port utilization, and the total capacity scales with the number of public IPs you attach.

## Prerequisites

Before setting up NAT Gateway with AKS, you need:

- Azure CLI 2.50 or later
- An Azure subscription with the ability to create public IPs and NAT Gateway resources
- A virtual network and subnet ready for the AKS cluster (or you can create them during setup)

## Step 1: Create the Virtual Network and Subnet

NAT Gateway needs to be associated with a subnet. Let's create the networking infrastructure first.

```bash
# Create a resource group for all the resources
az group create \
  --name myAKSResourceGroup \
  --location eastus

# Create a virtual network with a subnet for AKS nodes
az network vnet create \
  --resource-group myAKSResourceGroup \
  --name myAKSVnet \
  --address-prefixes 10.0.0.0/8 \
  --subnet-name myAKSSubnet \
  --subnet-prefix 10.240.0.0/16
```

## Step 2: Create the NAT Gateway

Now create a public IP and associate it with a NAT Gateway resource.

```bash
# Create a public IP for the NAT Gateway
# Standard SKU is required for NAT Gateway
az network public-ip create \
  --resource-group myAKSResourceGroup \
  --name myNATPublicIP \
  --sku Standard \
  --allocation-method Static

# Create the NAT Gateway resource
# Idle timeout set to 10 minutes (default is 4)
az network nat gateway create \
  --resource-group myAKSResourceGroup \
  --name myNATGateway \
  --public-ip-addresses myNATPublicIP \
  --idle-timeout 10

# Associate the NAT Gateway with the AKS subnet
az network vnet subnet update \
  --resource-group myAKSResourceGroup \
  --vnet-name myAKSVnet \
  --name myAKSSubnet \
  --nat-gateway myNATGateway
```

## Step 3: Create the AKS Cluster with NAT Gateway Outbound Type

When creating the AKS cluster, specify `managedNATGateway` or `userAssignedNATGateway` as the outbound type. Since we created our own NAT Gateway, we will use `userAssignedNATGateway`.

```bash
# Get the subnet resource ID for the AKS cluster
SUBNET_ID=$(az network vnet subnet show \
  --resource-group myAKSResourceGroup \
  --vnet-name myAKSVnet \
  --name myAKSSubnet \
  --query id -o tsv)

# Create the AKS cluster with user-assigned NAT Gateway
az aks create \
  --resource-group myAKSResourceGroup \
  --name myAKSCluster \
  --node-count 3 \
  --network-plugin azure \
  --vnet-subnet-id $SUBNET_ID \
  --outbound-type userAssignedNATGateway \
  --generate-ssh-keys
```

If you prefer to let AKS manage the NAT Gateway for you, use the managed variant instead:

```bash
# Alternative: Create AKS with managed NAT Gateway
# AKS creates and manages the NAT Gateway automatically
az aks create \
  --resource-group myAKSResourceGroup \
  --name myAKSCluster \
  --node-count 3 \
  --network-plugin azure \
  --outbound-type managedNATGateway \
  --nat-gateway-managed-outbound-ip-count 2 \
  --nat-gateway-idle-timeout 10 \
  --generate-ssh-keys
```

## Step 4: Add More Public IPs for Higher SNAT Capacity

If you need more than 64,512 SNAT ports, add additional public IPs to the NAT Gateway. Each public IP adds another 64,512 ports.

```bash
# Create additional public IPs
az network public-ip create \
  --resource-group myAKSResourceGroup \
  --name myNATPublicIP2 \
  --sku Standard \
  --allocation-method Static

# Add the new public IP to the NAT Gateway
az network nat gateway update \
  --resource-group myAKSResourceGroup \
  --name myNATGateway \
  --public-ip-addresses myNATPublicIP myNATPublicIP2
```

Alternatively, you can use a public IP prefix for a contiguous range of IPs:

```bash
# Create a public IP prefix with 16 addresses
az network public-ip prefix create \
  --resource-group myAKSResourceGroup \
  --name myNATPrefix \
  --length 28

# Associate the prefix with the NAT Gateway
az network nat gateway update \
  --resource-group myAKSResourceGroup \
  --name myNATGateway \
  --public-ip-prefixes myNATPrefix
```

## Step 5: Verify the Configuration

After the cluster is up, verify that outbound traffic flows through the NAT Gateway.

```bash
# Get cluster credentials
az aks get-credentials \
  --resource-group myAKSResourceGroup \
  --name myAKSCluster

# Run a test pod to check the outbound IP
kubectl run test-outbound --rm -it --image=curlimages/curl -- curl -s ifconfig.me

# The IP returned should match your NAT Gateway public IP
az network public-ip show \
  --resource-group myAKSResourceGroup \
  --name myNATPublicIP \
  --query ipAddress -o tsv
```

## Monitoring SNAT Port Usage

Even with NAT Gateway, you should monitor SNAT port utilization to catch potential issues before they affect your workloads.

```bash
# Check NAT Gateway metrics via Azure CLI
az monitor metrics list \
  --resource $(az network nat gateway show \
    --resource-group myAKSResourceGroup \
    --name myNATGateway \
    --query id -o tsv) \
  --metric "SNATConnectionCount" \
  --interval PT1M \
  --aggregation Total
```

You can also set up alerts in Azure Monitor to notify you when SNAT port usage exceeds a certain threshold. A good starting point is alerting at 80% utilization.

## Idle Timeout Tuning

The idle timeout determines how long a NAT Gateway holds onto an idle connection before releasing the SNAT port. The default is 4 minutes, but you can set it anywhere from 4 to 120 minutes.

For applications with long-lived connections (like WebSocket connections or persistent database pools), increase the idle timeout:

```bash
# Update the NAT Gateway idle timeout to 30 minutes
az network nat gateway update \
  --resource-group myAKSResourceGroup \
  --name myNATGateway \
  --idle-timeout 30
```

For applications that make many short-lived connections, a lower timeout (like 4-10 minutes) helps reclaim ports faster.

## Comparing Outbound Types

AKS supports three outbound types: Load Balancer, NAT Gateway (managed or user-assigned), and User-Defined Routing (UDR). Here is how they compare:

**Load Balancer**: The default. Limited SNAT ports allocated per node. Works fine for small clusters with moderate outbound traffic. Free with the load balancer.

**NAT Gateway**: Dynamic SNAT port allocation with much higher capacity. Costs around $0.045/hour plus data processing charges. Best for clusters with heavy outbound traffic.

**UDR**: Routes traffic through a firewall or NVA. No direct internet access from pods. Best for locked-down enterprise environments.

## Common Pitfalls

One mistake I see often is trying to switch an existing cluster's outbound type from load balancer to NAT Gateway. This is not supported as an in-place change. You need to create a new cluster with the NAT Gateway outbound type and migrate your workloads.

Another gotcha is forgetting to associate the NAT Gateway with the correct subnet. The NAT Gateway must be on the same subnet that AKS nodes use. If your cluster uses multiple node pools on different subnets, each subnet needs its own NAT Gateway.

Finally, make sure your NAT Gateway and public IPs are in the same region as your AKS cluster. Cross-region NAT Gateway is not supported.

## Conclusion

NAT Gateway is the recommended outbound type for any AKS cluster that handles significant outbound traffic. The dynamic SNAT port allocation eliminates the port exhaustion issues that plague the default load balancer configuration, and the ability to add multiple public IPs gives you room to grow. The small hourly cost of NAT Gateway is well worth it compared to the debugging time you will spend chasing intermittent connection failures from SNAT exhaustion.
