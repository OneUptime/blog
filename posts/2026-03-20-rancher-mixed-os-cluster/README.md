# How to Configure Mixed Linux and Windows Clusters in Rancher - Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Window, Linux, Mixed OS, Hybrid Cluster

Description: Configure and operate Rancher Kubernetes clusters with both Linux and Windows worker nodes, managing workload placement, networking, and node lifecycle in a hybrid environment.

## Introduction

Mixed OS clusters allow organizations to consolidate Linux and Windows workloads under a single Kubernetes management plane. Linux nodes handle Linux-native microservices while Windows nodes run .NET Framework, IIS, and Windows-specific applications. This guide covers the architecture, configuration, and operational practices for hybrid clusters in Rancher.

## Prerequisites

- RKE2 cluster with Linux control plane and at least one Linux worker node
- Windows Server 2019/2022 worker nodes
- kubectl and Rancher UI access
- Calico or Flannel CNI configured for Windows support

## Step 1: Cluster Architecture

```text
Mixed OS Cluster Architecture:
├── Control Plane (Linux only)
│   ├── etcd: 3x Linux nodes
│   └── API Server, Controller Manager, Scheduler: Linux nodes
│
├── Linux Worker Nodes
│   ├── Microservices (Go, Node.js, Python, Java)
│   ├── Databases (PostgreSQL, Redis, MongoDB)
│   └── Message queues (Kafka, RabbitMQ)
│
└── Windows Worker Nodes
    ├── .NET Framework applications (IIS)
    ├── .NET 8 applications
    └── Windows Services

Note: Windows nodes CANNOT run:
- Control plane components (API server, etcd, scheduler)
- Most CNI plugins (in RKE2, Windows support requires Calico or Flannel)
- Most system daemonsets
```

## Step 2: Add Windows Nodes to Existing Linux Cluster

```bash
# Check existing cluster nodes and OS labels

kubectl get nodes -L kubernetes.io/os

# Verify the cluster is using a Windows-compatible CNI
# In RKE2, look for rke2-flannel or rke2-calico in kube-system
kubectl get helmcharts.helm.cattle.io -n kube-system

# On new Windows node (as Administrator):
# Download and run RKE2 Windows agent
# See: rancher-windows-workers post for detailed steps
```

## Step 3: Configure Workload Placement

```yaml
# Ensure Linux workloads stay on Linux nodes
# Best practice: add explicit nodeSelector to all workloads
# In Rancher mixed-OS clusters, Linux workers are typically tainted

# Linux workload - explicit Linux selector
apiVersion: apps/v1
kind: Deployment
metadata:
  name: linux-microservice
  namespace: production
spec:
  selector:
    matchLabels:
      app: linux-microservice
  template:
    metadata:
      labels:
        app: linux-microservice
    spec:
      # Explicit Linux node selector
      nodeSelector:
        kubernetes.io/os: linux
      tolerations:
        - key: cattle.io/os
          operator: Equal
          value: linux
          effect: NoSchedule
      containers:
        - name: service
          image: registry.example.com/linux-service:v1.0
---
# Windows workload
apiVersion: apps/v1
kind: Deployment
metadata:
  name: windows-app
  namespace: production
spec:
  selector:
    matchLabels:
      app: windows-app
  template:
    metadata:
      labels:
        app: windows-app
    spec:
      nodeSelector:
        kubernetes.io/os: windows
      containers:
        - name: app
          image: registry.example.com/windows-app:v1.0
```

## Step 4: Configure System DaemonSets for Mixed OS

```yaml
# System DaemonSets (like node-exporter, Fluent Bit) should target Linux only
# For packaged components managed by Rancher or Helm, set the equivalent
# pod template values in the chart so the change persists across upgrades
spec:
  template:
    spec:
      nodeSelector:
        kubernetes.io/os: linux
      tolerations:
        - key: cattle.io/os
          operator: Equal
          value: linux
          effect: NoSchedule
```

## Step 5: Cross-OS Service Communication

```yaml
# Linux pod calling Windows service
# Windows service deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: windows-api
  namespace: production
spec:
  selector:
    matchLabels:
      app: windows-api
  template:
    metadata:
      labels:
        app: windows-api
    spec:
      nodeSelector:
        kubernetes.io/os: windows
      containers:
        - name: api
          image: registry.example.com/windows-api:v1.0
          ports:
            - containerPort: 8080
---
# Service (OS-agnostic - any pod can call this)
apiVersion: v1
kind: Service
metadata:
  name: windows-api
  namespace: production
spec:
  selector:
    app: windows-api  # Selects Windows pods
  ports:
    - port: 80
      targetPort: 8080
```

```python
# Linux Python service calling Windows API
import requests

# This works seamlessly - Kubernetes handles routing across OS
response = requests.get("http://windows-api.production.svc.cluster.local/api/data")
```

## Step 6: Configure Node Pools and Labels

```bash
# Add descriptive labels to differentiate node types
kubectl label node win-node-01 \
  node-type=windows-worker \
  workload-profile=dotnet \
  windows-version=2022

kubectl label node linux-worker-01 \
  node-type=linux-worker \
  workload-profile=general

# Use node pools via Rancher UI for organized management
# Rancher allows separate node pools per OS with different instance types
```

## Step 7: Mixed OS Monitoring Setup

```yaml
# Windows exporter pod template
spec:
  template:
    spec:
      nodeSelector:
        kubernetes.io/os: windows
---
# Linux node exporter pod template
spec:
  template:
    spec:
      nodeSelector:
        kubernetes.io/os: linux
      tolerations:
        - key: cattle.io/os
          operator: Equal
          value: linux
          effect: NoSchedule
```

## Step 8: Upgrade Strategy for Mixed OS Clusters

```powershell
# Windows nodes must be upgraded separately from Linux nodes
# Kubernetes version skew policy applies during upgrade

# Step 1: Upgrade control plane (Linux)
# Through Rancher UI: Cluster > Edit > Kubernetes Version

# Step 2: Upgrade Linux worker nodes
# Rancher drains and upgrades each node sequentially

# Step 3: Upgrade Windows worker nodes
# From a workstation with cluster access, drain the node first
kubectl drain win-node-01 --ignore-daemonsets --delete-emptydir-data

# On the Windows node, re-run the installer with the target RKE2 version
Invoke-WebRequest -Uri https://raw.githubusercontent.com/rancher/rke2/master/install.ps1 -Outfile install.ps1
./install.ps1 -Version <target-rke2-version>
Restart-Service rke2

# From a workstation with cluster access, make the node schedulable again
kubectl uncordon win-node-01
```

## Conclusion

Mixed OS Kubernetes clusters in Rancher provide a unified management platform for heterogeneous workloads. The fundamental principle is always specifying `kubernetes.io/os` node selectors in pod specifications and, for Linux workloads on Rancher-provisioned mixed clusters, adding the `cattle.io/os=linux:NoSchedule` toleration for tainted Linux workers. Cross-OS service communication works transparently through Kubernetes services, enabling Linux and Windows pods to call each other via standard DNS names. Monitor both Linux and Windows nodes through their respective exporters, and plan separate upgrade windows for Linux and Windows nodes since they require different procedures.
