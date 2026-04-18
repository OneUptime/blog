# How to View Kubernetes Cluster Details in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Cluster Management, Observability, DevOps

Description: Learn how to view Kubernetes cluster details including node status, resource usage, and version information in Portainer.

## Accessing Cluster Details

In Portainer, after selecting your Kubernetes environment:

1. Click on the environment name in the sidebar.
2. The **Cluster Overview** page shows a dashboard with:
   - Number of nodes
   - Kubernetes version
   - Total and used CPU/memory
   - Number of running workloads
   - Namespace count

## What You Can See in Cluster Overview

### Node Summary

The node table shows each node with:
- Hostname
- Role (master/worker)
- Status (Ready/NotReady)
- Kubernetes version
- CPU and memory capacity vs. usage

Resource Consumption

```bash
# Equivalent CLI command to view resource usage per node

kubectl top nodes

# View all nodes with their capacity
kubectl get nodes -o custom-columns='NAME:.metadata.name,\
CPU:.status.capacity.cpu,\
MEMORY:.status.capacity.memory,\
STATUS:.status.conditions[?(@.type=="Ready")].status'
```

### Workload Summary

Portainer shows counts of:
- Deployments
- StatefulSets
- DaemonSets
- Pods (running vs. total)
- Services

## Viewing Detailed Node Information

Click on a node name in Portainer to see:
- Full node spec (OS, architecture, container runtime)
- Conditions (MemoryPressure, DiskPressure, PIDPressure, Ready)
- Allocated resources vs. capacity
- Labels and annotations

```bash
# CLI equivalent for detailed node information
kubectl describe node <node-name>

# Get node details in JSON for scripting
kubectl get node <node-name> -o json | \
  jq '{name: .metadata.name, capacity: .status.capacity, conditions: .status.conditions}'
```

## Checking Kubernetes Version

```bash
# Get cluster Kubernetes version
kubectl version

# Get version for all nodes
kubectl get nodes -o custom-columns=\
NAME:.metadata.name,VERSION:.status.nodeInfo.kubeletVersion
```

## Viewing System Namespaces

By default, Portainer hides system namespaces (`kube-system`, `kube-public`, etc.). To view them:

1. Toggle **Show system resources** in the Portainer settings for your environment.

```bash
# View pods in all namespaces including system
kubectl get pods --all-namespaces

# View only system namespace pods
kubectl get pods -n kube-system
```

## Conclusion

Portainer's cluster overview gives you a consolidated health dashboard for your Kubernetes environment. It consolidates information that would otherwise require several `kubectl describe` and `kubectl top` commands into a single readable view.
