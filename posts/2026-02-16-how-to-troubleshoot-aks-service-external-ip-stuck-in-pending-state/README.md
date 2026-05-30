# How to Troubleshoot AKS Service External IP Stuck in Pending State

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AKS, Kubernetes, LoadBalancer, Troubleshooting, Azure, Networking, External IP

Description: A practical guide to diagnosing and fixing the common problem of AKS LoadBalancer services stuck with a pending external IP address.

---

You deploy a Kubernetes service of type LoadBalancer on AKS, run `kubectl get svc`, and the EXTERNAL-IP column shows `<pending>`. You wait a minute. Still pending. Five minutes. Still pending. This is one of the most common issues on AKS, and it can be caused by at least a dozen different things.

I have debugged this problem more times than I can count across different clusters and configurations. This guide covers every cause I have encountered, from the obvious to the obscure, along with the exact commands to diagnose each one.

## Start with the Service Events

The first place to look is always the events on the service object itself. Kubernetes writes events when it fails to create a load balancer, and these events usually point you directly at the problem.

```bash
# Check events on the service - this is always step one

kubectl describe service my-service

# Look at the Events section at the bottom of the output
# Common error messages include:
# - "Error creating load balancer"
# - "Ensure the cluster identity has the correct permissions"
# - "Could not create route"
# - "Subnet is full"
```

If the events section is empty, the service may not have been reconciled yet, the relevant events may have expired, or there may be a more fundamental control plane problem.

## Cause 1: Azure Resource Quota Exceeded

Azure subscriptions have limits on how many public IP addresses and load balancers you can create. If you hit these limits, the load balancer creation fails silently in some cases.

```bash
# Count public IP resources in the AKS node resource group
az network public-ip list --resource-group MC_myRG_myAKS_eastus --query "length(@)"

# Check subscription-level quota for public IPs
az network list-usages --location eastus -o table | grep "Public IP"

# Check load balancer limits
az network list-usages --location eastus -o table | grep "Load Balancer"
```

If you are near the limit, either delete unused public IPs or request a quota increase through the Azure portal.

## Cause 2: Subnet Address Exhaustion

When you use an internal load balancer, the load balancer needs a free private IP in the subnet. If the subnet is full, the IP allocation fails.

```bash
# Check how many IPs are available in the AKS subnet
VNET_RG="myNetworkRG"
VNET_NAME="myVNet"
SUBNET_NAME="aks-subnet"

# Get the subnet address prefix
az network vnet subnet show \
  --resource-group $VNET_RG \
  --vnet-name $VNET_NAME \
  --name $SUBNET_NAME \
  --query "addressPrefix" -o tsv

# Count the number of IPs currently in use
az network vnet subnet show \
  --resource-group $VNET_RG \
  --vnet-name $VNET_NAME \
  --name $SUBNET_NAME \
  --query "ipConfigurations | length(@)" -o tsv
```

For a /24 subnet, you have 251 usable addresses. If your node pool uses 200 of them and you have many services, you can run out. The fix is either to expand the subnet or move to a larger address space.

## Cause 3: Missing RBAC Permissions on the Cluster Identity

The AKS cluster identity needs permissions to create or update network resources. If you use a managed identity, check the cluster identity. If you use an older service principal based cluster, check the service principal instead. If someone has modified the role assignments, load balancer creation fails.

```bash
# Find the cluster identity for a managed identity based cluster
IDENTITY=$(az aks show \
  --resource-group myRG \
  --name myAKS \
  --query "identity.principalId" -o tsv)

# Check what roles it has on the node resource group
NODE_RG=$(az aks show --resource-group myRG --name myAKS --query "nodeResourceGroup" -o tsv)

az role assignment list \
  --assignee "$IDENTITY" \
  --scope "/subscriptions/<sub-id>/resourceGroups/$NODE_RG" \
  -o table
```

For public IPs in the node resource group, the cluster identity needs at least the "Network Contributor" role on that resource group. For a custom VNet, subnet, route table, or public IP in another resource group, assign the role on that resource group or on the specific network resource.

```bash
# Reassign the Network Contributor role
az role assignment create \
  --assignee "$IDENTITY" \
  --role "Network Contributor" \
  --scope "/subscriptions/<sub-id>/resourceGroups/$NODE_RG"
```

## Cause 4: Azure Load Balancer SKU Mismatch

AKS clusters use the Standard SKU load balancer by default, and Basic Load Balancer is no longer supported by AKS as of September 30, 2025. If you are troubleshooting an older unsupported Basic load balancer configuration, or a public IP with the wrong SKU for the cluster load balancer, allocation fails.

```bash
# Check the load balancer SKU on your cluster
az aks show \
  --resource-group myRG \
  --name myAKS \
  --query "networkProfile.loadBalancerSku" -o tsv
```

If you are specifying a static IP for your service, make sure the IP's SKU matches the cluster's load balancer SKU.

```bash
# Check the SKU of a public IP
az network public-ip show \
  --resource-group myRG \
  --name my-static-ip \
  --query "sku.name" -o tsv
```

## Cause 5: Static IP in Wrong Resource Group

If your service uses a static public IP that lives in a different resource group, you need to tell AKS about it.

```yaml
# service-with-static-ip.yaml
# When using a static IP from a different resource group
apiVersion: v1
kind: Service
metadata:
  name: my-service
  annotations:
    # Specify the resource group where the public IP exists
    service.beta.kubernetes.io/azure-load-balancer-resource-group: my-ip-resource-group
    # The static public IP must exist in the specified resource group
    # Prefer azure-pip-name over spec.loadBalancerIP, which is deprecated upstream.
    service.beta.kubernetes.io/azure-pip-name: my-static-ip
spec:
  type: LoadBalancer
  ports:
    - port: 80
      targetPort: 8080
  selector:
    app: my-app
```

Without the `azure-load-balancer-resource-group` annotation, AKS only looks in the node resource group (the `MC_` group). Make sure the cluster identity also has permission to read and update the public IP in the specified resource group.

## Cause 6: Network Security Group Blocking Health Probes

If you have a custom NSG on your AKS subnet, it might be blocking the Azure load balancer health probes or the service traffic itself. This usually causes traffic failures after the external IP is assigned rather than keeping the IP in `<pending>`, but it is still worth checking when the service looks broken.

```bash
# List NSG rules on the AKS subnet
az network nsg rule list \
  --resource-group $VNET_RG \
  --nsg-name myNSG \
  -o table

# Azure load balancer health probes come from 168.63.129.16
# Make sure this IP is allowed inbound on the NSG
```

You need to allow inbound traffic from `168.63.129.16` (Azure's health probe source) and the service port.

## Cause 7: Cloud Controller Manager or Control Plane Reconciliation Problems

The cloud controller manager is responsible for creating Azure resources when you create a LoadBalancer service. If it is not running or is crashing, nothing happens.

```bash
# On AKS, the cloud controller manager runs on the managed control plane,
# so you cannot normally inspect or restart its pods directly.
# Check service events and Azure activity logs instead.
kubectl describe service my-service
```

On AKS, the cloud controller manager runs on the control plane, which you cannot directly access. If services stop reconciling and the Azure activity log does not show the expected load balancer operations, open an Azure support case.

## Cause 8: Too Many Load Balancer Rules

AKS normally provisions one Standard Load Balancer for LoadBalancer services in a cluster, and each node NIC is limited to 300 inbound load-balancing rules. If you have many LoadBalancer services or services with many ports, new services can fail when AKS would exceed that limit.

```bash
# Count current load balancer rules
LB_NAME=$(az network lb list --resource-group MC_myRG_myAKS_eastus --query "[0].name" -o tsv)

az network lb rule list \
  --resource-group MC_myRG_myAKS_eastus \
  --lb-name "$LB_NAME" \
  --query "length(@)" -o tsv
```

If you are close to the limit, you can use the multiple Standard Load Balancers preview feature to create additional load balancer configurations and place services on them.

```yaml
# service-with-separate-lb.yaml
# Place this service on a configured load balancer in a multiple-SLB cluster
apiVersion: v1
kind: Service
metadata:
  name: my-service
  annotations:
    service.beta.kubernetes.io/azure-load-balancer-configurations: "team1-lb"
spec:
  type: LoadBalancer
  ports:
    - port: 443
      targetPort: 8443
  selector:
    app: my-app
```

## Cause 9: Internal Load Balancer Subnet Issues

If you are creating an internal load balancer, the subnet annotation must point to an existing subnet with available IPs.

```yaml
# internal-lb-service.yaml
# Internal load balancer service with explicit subnet
apiVersion: v1
kind: Service
metadata:
  name: internal-service
  annotations:
    service.beta.kubernetes.io/azure-load-balancer-internal: "true"
    # Specify the subnet for the internal LB - must exist in the cluster VNet
    service.beta.kubernetes.io/azure-load-balancer-internal-subnet: "internal-lb-subnet"
spec:
  type: LoadBalancer
  ports:
    - port: 80
      targetPort: 8080
  selector:
    app: internal-app
```

## Systematic Debugging Checklist

When you hit a pending external IP, run through this checklist.

```bash
# 1. Check service events
kubectl describe svc my-service | tail -20

# 2. Check cloud controller manager logs (if accessible)
# On AKS this is managed by the control plane and is not normally accessible.
# Use service events and Azure activity logs instead.

# 3. Check Azure activity log for failures
az monitor activity-log list \
  --resource-group MC_myRG_myAKS_eastus \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%MZ) \
  --query "[?status.value=='Failed'].{Operation:operationName.localizedValue, Message:properties.statusMessage}" \
  -o table

# 4. Verify the service YAML is correct
kubectl get svc my-service -o yaml

# 5. Check if other LoadBalancer services are working
kubectl get svc --all-namespaces | grep LoadBalancer
```

## Wrapping Up

A pending external IP on AKS is almost always caused by one of the issues described above. Start with `kubectl describe service` to get the error message, then work through the likely causes based on that message. In my experience, the top three causes are quota issues, missing RBAC permissions, and subnet exhaustion. Once you have diagnosed the root cause, the fix is usually a single command or a small YAML change. The key is being systematic about the diagnosis rather than guessing.
