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

If the events section is empty, the cloud controller manager has not even attempted to create the load balancer yet, which usually means it is overloaded or there is a more fundamental problem.

## Cause 1: Azure Resource Quota Exceeded

Azure subscriptions have limits on how many public IP addresses and load balancers you can create. If you hit these limits, the load balancer creation fails silently in some cases.

```bash
# Check your current public IP usage in the region
az network public-ip list --resource-group MC_myRG_myAKS_eastus --query "length(@)"

# Check subscription-level quota for public IPs
az network list-usages --location eastus -o table | grep "Public IP"

# Check load balancer limits
az network list-usages --location eastus -o table | grep "Load Balancer"
```

If you are near the limit, either delete unused public IPs or request a quota increase through the Azure portal.

## Cause 2: Subnet Address Exhaustion

When you use an internal load balancer or your cluster is in a custom VNet, the load balancer needs a free IP in the subnet. If the subnet is full, the IP allocation fails.

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

The AKS cluster identity (either the managed identity or the service principal) needs permissions to create resources in the node resource group (the `MC_` resource group). If someone has modified the role assignments, load balancer creation fails.

```bash
# Find the cluster identity
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

The cluster identity needs at least the "Network Contributor" role on the node resource group. If it is missing, add it back.

```bash
# Reassign the Network Contributor role
az role assignment create \
  --assignee "$IDENTITY" \
  --role "Network Contributor" \
  --scope "/subscriptions/<sub-id>/resourceGroups/$NODE_RG"
```

## Cause 4: Azure Load Balancer SKU Mismatch

AKS clusters use the Standard SKU load balancer by default. If you are trying to use a Basic SKU public IP with a Standard load balancer (or vice versa), the allocation fails.

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

If your service annotation specifies a static IP that lives in a different resource group, you need to tell AKS about it.

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
spec:
  type: LoadBalancer
  # The static IP must exist in the specified resource group
  loadBalancerIP: 20.50.100.200
  ports:
    - port: 80
      targetPort: 8080
  selector:
    app: my-app
```

Without the `azure-load-balancer-resource-group` annotation, AKS only looks in the node resource group (the `MC_` group).

## Cause 6: Network Security Group Blocking

If you have a custom NSG on your AKS subnet, it might be blocking the Azure load balancer health probes or the service traffic itself.

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

## Cause 7: Cloud Controller Manager Not Running

The cloud controller manager is responsible for creating Azure resources when you create a LoadBalancer service. If it is not running or is crashing, nothing happens.

```bash
# Check if the cloud controller manager pods are healthy
kubectl get pods -n kube-system -l component=cloud-controller-manager

# Check for any crash loops
kubectl get pods -n kube-system | grep cloud-controller
```

On AKS, the cloud controller manager runs on the control plane, which you cannot directly access. If these pods are unhealthy, the fix is usually to restart the cluster or contact Azure support.

## Cause 8: Too Many Load Balancer Rules

Azure Standard Load Balancer has a limit of 300 load balancing rules per load balancer. By default, all AKS LoadBalancer services share a single Azure load balancer. If you have more than 300 services, new ones will fail.

```bash
# Count current load balancer rules
LB_NAME=$(az network lb list --resource-group MC_myRG_myAKS_eastus --query "[0].name" -o tsv)

az network lb rule list \
  --resource-group MC_myRG_myAKS_eastus \
  --lb-name "$LB_NAME" \
  --query "length(@)" -o tsv
```

If you are close to the limit, you can split services across multiple load balancers by using annotations.

```yaml
# service-with-separate-lb.yaml
# Force this service to use a separate load balancer
apiVersion: v1
kind: Service
metadata:
  name: my-service
  annotations:
    # Use a different public IP to create a new load balancer frontend
    service.beta.kubernetes.io/azure-load-balancer-internal: "false"
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
kubectl logs -n kube-system -l component=cloud-controller-manager --tail=100

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
