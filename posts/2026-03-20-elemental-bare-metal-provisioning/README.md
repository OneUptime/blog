# How to Set Up Elemental for Bare Metal Provisioning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elemental, Bare Metal, Kubernetes, Provisioning, Edge

Description: Configure Elemental to automatically provision Kubernetes nodes on bare metal hardware using declarative templates.

## Introduction

Elemental transforms bare metal provisioning from a manual, error-prone process into a declarative, Kubernetes-native workflow. This guide covers the complete end-to-end setup for provisioning bare metal servers into Kubernetes clusters using Elemental.

## Architecture Overview

```mermaid
flowchart TD
    A[Bare Metal Server] -->|Boot from ISO/PXE| B[Elemental Live Environment]
    B -->|Register| C[Rancher MachineInventory]
    C -->|Matched by Selector| D[Kubernetes Cluster]
    D -->|Node Joins| E[Production Cluster]
```

## Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 2 cores | 4+ cores |
| RAM | 4 GB | 8+ GB |
| Disk | 40 GB | 120+ GB |
| Network | 1 GbE | 10 GbE |

## Step 1: Prepare the Management Infrastructure

```bash
# Verify Elemental Operator is running
kubectl get pods -n cattle-elemental-system

# Verify the Elemental CRDs are installed
kubectl get crd \
  machineregistrations.elemental.cattle.io \
  machineinventoryselectortemplates.elemental.cattle.io \
  seedimages.elemental.cattle.io

# Elemental registration and cluster resources are typically created in fleet-default
kubectl get namespace fleet-default
```

## Step 2: Define Server Tiers with MachineRegistrations

```yaml
# control-plane-registration.yaml
apiVersion: elemental.cattle.io/v1beta1
kind: MachineRegistration
metadata:
  name: control-plane-nodes
  namespace: fleet-default
spec:
  machineInventoryLabels:
    role: control-plane
    tier: high-performance
  config:
    elemental:
      install:
        device: /dev/nvme0n1  # NVMe for control plane
        reboot: true
---
# worker-registration.yaml
apiVersion: elemental.cattle.io/v1beta1
kind: MachineRegistration
metadata:
  name: worker-nodes
  namespace: fleet-default
spec:
  machineInventoryLabels:
    role: worker
    tier: standard
  config:
    elemental:
      install:
        device: /dev/sda  # SATA for workers
        reboot: true
```

## Step 3: Create Cluster Template

```yaml
# bare-metal-cluster.yaml
apiVersion: elemental.cattle.io/v1beta1
kind: MachineInventorySelectorTemplate
metadata:
  name: cp-selector
  namespace: fleet-default
spec:
  template:
    spec:
      selector:
        matchLabels:
          role: control-plane
---
apiVersion: elemental.cattle.io/v1beta1
kind: MachineInventorySelectorTemplate
metadata:
  name: worker-selector
  namespace: fleet-default
spec:
  template:
    spec:
      selector:
        matchLabels:
          role: worker
---
apiVersion: provisioning.cattle.io/v1
kind: Cluster
metadata:
  name: production-bare-metal
  namespace: fleet-default
spec:
  kubernetesVersion: v1.34.5+rke2r1

  rkeConfig:
    machineGlobalConfig:
      cni: cilium
      disable:
        - rke2-ingress-nginx

    machinePools:
      - name: control-plane
        quantity: 3
        etcdRole: true
        controlPlaneRole: true
        workerRole: false
        machineConfigRef:
          kind: MachineInventorySelectorTemplate
          apiVersion: elemental.cattle.io/v1beta1
          name: cp-selector

      - name: workers
        quantity: 10
        etcdRole: false
        controlPlaneRole: false
        workerRole: true
        machineConfigRef:
          kind: MachineInventorySelectorTemplate
          apiVersion: elemental.cattle.io/v1beta1
          name: worker-selector
```

## Step 4: Deploy the Seed Images

```yaml
# seed-images.yaml
apiVersion: elemental.cattle.io/v1beta1
kind: SeedImage
metadata:
  name: control-plane-seed
  namespace: fleet-default
spec:
  type: iso
  baseImage: registry.suse.com/suse/sl-micro/6.0/baremetal-iso-image:2.1.1-3.36
  registrationRef:
    apiVersion: elemental.cattle.io/v1beta1
    kind: MachineRegistration
    name: control-plane-nodes
    namespace: fleet-default
---
apiVersion: elemental.cattle.io/v1beta1
kind: SeedImage
metadata:
  name: worker-seed
  namespace: fleet-default
spec:
  type: iso
  baseImage: registry.suse.com/suse/sl-micro/6.0/baremetal-iso-image:2.1.1-3.36
  registrationRef:
    apiVersion: elemental.cattle.io/v1beta1
    kind: MachineRegistration
    name: worker-nodes
    namespace: fleet-default
```

```bash
# Build and download the ISOs for each node type
kubectl apply -f seed-images.yaml

kubectl wait --for=condition=Ready seedimage/control-plane-seed \
  -n fleet-default \
  --timeout=30m

kubectl wait --for=condition=Ready seedimage/worker-seed \
  -n fleet-default \
  --timeout=30m

wget --no-check-certificate \
  "$(kubectl get seedimage control-plane-seed \
    -n fleet-default \
    -o jsonpath='{.status.downloadURL}')" \
  -O elemental-cp.iso

wget --no-check-certificate \
  "$(kubectl get seedimage worker-seed \
    -n fleet-default \
    -o jsonpath='{.status.downloadURL}')" \
  -O elemental-worker.iso
```

## Step 5: Boot and Monitor Provisioning

```bash
# Watch machines register
kubectl get machineinventory -n fleet-default --watch

# Monitor cluster creation
kubectl get cluster -n fleet-default production-bare-metal --watch

# Check machine adoption
kubectl get machineinventory -n fleet-default \
  -o custom-columns='NAME:.metadata.name,ROLE:.metadata.labels.role,SELECTOR:.metadata.ownerReferences[0].name'
```

## Conclusion

Elemental bare metal provisioning turns physical servers into declaratively managed Kubernetes nodes. By defining separate MachineRegistrations for different server tiers and using MachineInventorySelectors to match them to cluster roles, you create a fully automated provisioning pipeline that scales from a handful of servers to thousands of nodes with the same configuration.
