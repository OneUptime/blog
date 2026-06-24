# How to Provision Kubernetes Clusters with Elemental

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elemental, Kubernetes, Rancher, Provisioning, Edge

Description: Learn how to use Elemental MachineInventorySelectors and Rancher cluster templates to provision Kubernetes clusters on registered bare metal nodes.

## Introduction

Once machines are registered in the Elemental MachineInventory, the next step is to provision them into Kubernetes clusters. Elemental integrates with Rancher's cluster provisioning by using MachineInventorySelectorTemplates that define how registered machines are matched to cluster roles (control plane, etcd, worker).

## Prerequisites

- Elemental Operator installed
- Machines registered in MachineInventory
- Rancher v2.7+ with cluster provisioning enabled

## Step 1: Verify Machines in Inventory

```bash
# List all registered machines

kubectl get machineinventory -n fleet-default

# Check machine labels
kubectl get machineinventory -n fleet-default --show-labels
```

## Step 2: Create MachineInventorySelectorTemplates

The MachineInventorySelectorTemplate defines which machines from inventory are eligible for a specific cluster role:

```yaml
# machine-selector-templates.yaml
apiVersion: elemental.cattle.io/v1beta1
kind: MachineInventorySelectorTemplate
metadata:
  name: cp-selector-template
  namespace: fleet-default
spec:
  template:
    spec:
      selector:
        matchLabels:
          role: control-plane
          location: datacenter-1
---
apiVersion: elemental.cattle.io/v1beta1
kind: MachineInventorySelectorTemplate
metadata:
  name: worker-selector-template
  namespace: fleet-default
spec:
  template:
    spec:
      selector:
        matchLabels:
          role: worker
          location: datacenter-1
```

```bash
kubectl apply -f machine-selector-templates.yaml
```

## Step 3: Create a Cluster Using Rancher UI

1. In Rancher, open **OS Management** > **Inventory of Machines**
2. Select the registered machines you want to use
3. Click **Actions** > **Create Elemental Cluster**
4. Configure the cluster name and Kubernetes version
5. Click **Create**

## Step 4: Create Cluster via YAML

```yaml
# elemental-cluster.yaml
apiVersion: provisioning.cattle.io/v1
kind: Cluster
metadata:
  name: my-edge-cluster
  namespace: fleet-default
spec:
  kubernetesVersion: v1.28.0+rke2r1
  rkeConfig:
    machinePools:
      # Control plane nodes
      - name: control-plane
        quantity: 3
        etcdRole: true
        controlPlaneRole: true
        workerRole: false
        machineConfigRef:
          kind: MachineInventorySelectorTemplate
          apiVersion: elemental.cattle.io/v1beta1
          name: cp-selector-template
      # Worker nodes
      - name: workers
        quantity: 5
        etcdRole: false
        controlPlaneRole: false
        workerRole: true
        machineConfigRef:
          kind: MachineInventorySelectorTemplate
          apiVersion: elemental.cattle.io/v1beta1
          name: worker-selector-template
```

## Step 5: Monitor Cluster Provisioning

```bash
# Watch the cluster status
kubectl get clusters.provisioning.cattle.io -n fleet-default my-edge-cluster --watch

# Check selector-to-machine assignments
kubectl get machineinventoryselector -n fleet-default \
  -o custom-columns=NAME:.metadata.name,INVENTORY:.status.machineInventoryRef.name,READY:.status.ready

# View provisioning events
kubectl get events -n fleet-default --sort-by=.metadata.creationTimestamp
```

## Conclusion

Elemental's integration with Rancher's cluster provisioning creates a seamless pipeline from bare metal machine to production Kubernetes cluster. By using MachineInventorySelectorTemplates, you can declaratively define which machines form each cluster role, enabling reproducible and scalable edge Kubernetes deployments.
