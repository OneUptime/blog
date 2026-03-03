# How to Configure Azure Availability Zones with Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Azure, Availability Zones, High Availability, Kubernetes

Description: Guide to deploying a zone-redundant Talos Linux Kubernetes cluster across Azure Availability Zones for high availability.

---

Azure Availability Zones are physically separate locations within an Azure region, each with independent power, cooling, and networking. Spreading your Talos Linux cluster across zones protects you from zone-level failures. This is not optional for production workloads - it is a baseline requirement. This guide covers how to design your Azure infrastructure and deploy Talos across zones for maximum resilience.

## Azure Availability Zones Overview

Not all Azure regions support Availability Zones, so verify your target region first. Regions like East US, West Europe, and Southeast Asia support three zones (labeled 1, 2, and 3). Each zone maps to a different physical data center, so a failure in Zone 1 has no impact on Zones 2 and 3.

Azure zones differ from AWS AZs in one important way: zone numbering is consistent across your subscription. Zone 1 always means the same physical location for your account (though it might map to a different physical data center for a different subscription).

## Network Setup

Create a virtual network with subnets that span all zones. Unlike AWS, Azure subnets are not zone-specific - a single subnet can serve instances in any zone:

```bash
# Create the resource group
az group create --name talos-rg --location eastus

# Create the virtual network
az network vnet create \
  --resource-group talos-rg \
  --name talos-vnet \
  --address-prefix 10.0.0.0/16

# Create a subnet for all nodes
az network vnet subnet create \
  --resource-group talos-rg \
  --vnet-name talos-vnet \
  --name nodes-subnet \
  --address-prefix 10.0.1.0/24

# Create a network security group
az network nsg create \
  --resource-group talos-rg \
  --name talos-nsg

# Allow Kubernetes API access
az network nsg rule create \
  --resource-group talos-rg \
  --nsg-name talos-nsg \
  --name allow-k8s-api \
  --protocol tcp \
  --direction inbound \
  --priority 1000 \
  --destination-port-range 6443 \
  --access allow

# Allow Talos API access
az network nsg rule create \
  --resource-group talos-rg \
  --nsg-name talos-nsg \
  --name allow-talos-api \
  --protocol tcp \
  --direction inbound \
  --priority 1001 \
  --destination-port-range 50000 \
  --access allow

# Associate NSG with subnet
az network vnet subnet update \
  --resource-group talos-rg \
  --vnet-name talos-vnet \
  --name nodes-subnet \
  --network-security-group talos-nsg
```

## Load Balancer for the API Server

Create a Standard Load Balancer for the Kubernetes API:

```bash
# Create a public IP for the load balancer
az network public-ip create \
  --resource-group talos-rg \
  --name talos-api-ip \
  --sku Standard \
  --zone 1 2 3

# Create the load balancer
az network lb create \
  --resource-group talos-rg \
  --name talos-api-lb \
  --sku Standard \
  --frontend-ip-name api-frontend \
  --public-ip-address talos-api-ip \
  --backend-pool-name cp-pool

# Create the health probe
az network lb probe create \
  --resource-group talos-rg \
  --lb-name talos-api-lb \
  --name api-health \
  --protocol tcp \
  --port 6443

# Create the load balancer rule
az network lb rule create \
  --resource-group talos-rg \
  --lb-name talos-api-lb \
  --name api-rule \
  --frontend-ip-name api-frontend \
  --backend-pool-name cp-pool \
  --protocol tcp \
  --frontend-port 6443 \
  --backend-port 6443 \
  --probe api-health
```

The `--zone 1 2 3` flag on the public IP makes it zone-redundant, meaning it stays available even if one or two zones go down.

## Deploying Control Plane Nodes

Create one control plane VM in each zone:

```bash
# Generate Talos configuration
talosctl gen config my-cluster https://<lb-public-ip>:6443 \
  --config-patch='[
    {"op": "add", "path": "/cluster/externalCloudProvider", "value": {"enabled": true}}
  ]'

# Create control plane VM in Zone 1
az vm create \
  --resource-group talos-rg \
  --name cp-zone1 \
  --zone 1 \
  --image talos-v1.7.0 \
  --size Standard_D4s_v5 \
  --vnet-name talos-vnet \
  --subnet nodes-subnet \
  --nsg talos-nsg \
  --custom-data controlplane.yaml \
  --no-wait

# Create control plane VM in Zone 2
az vm create \
  --resource-group talos-rg \
  --name cp-zone2 \
  --zone 2 \
  --image talos-v1.7.0 \
  --size Standard_D4s_v5 \
  --vnet-name talos-vnet \
  --subnet nodes-subnet \
  --nsg talos-nsg \
  --custom-data controlplane.yaml \
  --no-wait

# Create control plane VM in Zone 3
az vm create \
  --resource-group talos-rg \
  --name cp-zone3 \
  --zone 3 \
  --image talos-v1.7.0 \
  --size Standard_D4s_v5 \
  --vnet-name talos-vnet \
  --subnet nodes-subnet \
  --nsg talos-nsg \
  --custom-data controlplane.yaml
```

Add the control plane VMs to the load balancer backend pool:

```bash
# Add each CP NIC to the load balancer backend pool
for vm in cp-zone1 cp-zone2 cp-zone3; do
  NIC_ID=$(az vm show --resource-group talos-rg --name $vm --query 'networkProfile.networkInterfaces[0].id' -o tsv)
  az network nic ip-config update \
    --ids "${NIC_ID}/ipConfigurations/ipconfig1" \
    --lb-name talos-api-lb \
    --lb-address-pools cp-pool
done
```

## Deploying Worker Nodes with VMSS

Use a Virtual Machine Scale Set (VMSS) for worker nodes. VMSS can distribute instances across zones automatically:

```bash
# Create a VMSS for worker nodes across all zones
az vmss create \
  --resource-group talos-rg \
  --name talos-workers \
  --image talos-v1.7.0 \
  --vm-sku Standard_D4s_v5 \
  --instance-count 6 \
  --zones 1 2 3 \
  --custom-data worker.yaml \
  --vnet-name talos-vnet \
  --subnet nodes-subnet \
  --nsg talos-nsg \
  --upgrade-policy-mode manual
```

With `--zones 1 2 3` and an instance count of 6, Azure distributes 2 instances per zone.

## Pod Distribution

Ensure your pods are spread across zones:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: production-app
spec:
  replicas: 6
  selector:
    matchLabels:
      app: production-app
  template:
    metadata:
      labels:
        app: production-app
    spec:
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: production-app
      containers:
        - name: app
          image: myapp:latest
```

## Zone-Redundant Storage

Azure Managed Disks can be zone-redundant (ZRS), which replicates data across all three zones:

```yaml
# zone-redundant-sc.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: azure-zrs
provisioner: disk.csi.azure.com
parameters:
  skuName: Premium_ZRS
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

ZRS disks can be attached to VMs in any zone, making them ideal for StatefulSets that might need to failover to a different zone.

## Monitoring Zone Health

Keep tabs on your zone distribution:

```bash
# Check node zones
kubectl get nodes -L topology.kubernetes.io/zone

# Check which zone each pod is in
kubectl get pods -o wide -l app=production-app | while read line; do
  node=$(echo $line | awk '{print $7}')
  zone=$(kubectl get node $node -o jsonpath='{.metadata.labels.topology\.kubernetes\.io/zone}' 2>/dev/null)
  echo "$line  ZONE=$zone"
done
```

## Handling Zone Failures

When a zone fails:

1. The load balancer stops routing API traffic to the control plane node in the failed zone
2. Etcd continues operating with two of three members
3. Pods on worker nodes in the failed zone are marked for rescheduling
4. The Cluster Autoscaler (if configured) can add new nodes in the remaining zones

Test your zone failure handling by cordoning all nodes in one zone:

```bash
# Simulate a zone failure by cordoning nodes in zone 1
kubectl get nodes -l topology.kubernetes.io/zone=eastus-1 -o name | xargs -I {} kubectl cordon {}

# Verify pods reschedule to other zones
kubectl get pods -o wide -l app=production-app

# Uncordon when done testing
kubectl get nodes -l topology.kubernetes.io/zone=eastus-1 -o name | xargs -I {} kubectl uncordon {}
```

## Conclusion

Configuring Azure Availability Zones with Talos Linux follows the same principles as any multi-zone Kubernetes deployment, but Azure's zone-spanning subnets and zone-redundant storage options simplify the networking and storage aspects. Three control plane nodes across three zones, a VMSS for workers with zone balancing, and topology spread constraints for pods give you a cluster that survives zone-level failures gracefully. ZRS storage adds an extra layer of resilience for stateful workloads that need cross-zone data availability.
