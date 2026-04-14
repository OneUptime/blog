# How to Use Dapr with Kubernetes Pod Disruption Budgets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kubernetes, Pod Disruption Budget, High Availability, Reliability

Description: Configure Kubernetes Pod Disruption Budgets with Dapr-enabled services to ensure high availability during node maintenance, rolling updates, and cluster operations.

---

## Overview

Pod Disruption Budgets (PDBs) protect Dapr-enabled services from having too many pods evicted simultaneously during voluntary disruptions like node drains or cluster upgrades. Without a PDB, a rolling drain could take down all replicas of a critical Dapr service at once.

## Creating a Basic PDB for a Dapr Service

Define a PDB that ensures at least one pod is always running:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: order-service-pdb
  namespace: default
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: order-service
```

Apply it alongside your deployment:

```bash
kubectl apply -f order-service-pdb.yaml
kubectl get pdb order-service-pdb
```

## PDB with Percentage-Based Availability

For larger deployments, use a percentage to keep most pods available:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: payment-service-pdb
  namespace: default
spec:
  minAvailable: "75%"
  selector:
    matchLabels:
      app: payment-service
```

## Dapr Deployment with PDB-Friendly Settings

Ensure your Dapr deployment has enough replicas for the PDB to be effective:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-service"
        dapr.io/app-port: "3000"
    spec:
      containers:
      - name: order-service
        image: myregistry/order-service:latest
        ports:
        - containerPort: 3000
```

## Protecting Dapr Control Plane Components

Dapr's own control plane components should also have PDBs. After installing Dapr via Helm, add PDBs for the placement service:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: dapr-placement-pdb
  namespace: dapr-system
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: dapr-placement-server
```

## Verifying PDB Behavior During Node Drain

Test that your PDB is working by simulating a node drain:

```bash
# Cordon and drain a node
kubectl cordon node-1
kubectl drain node-1 --ignore-daemonsets --delete-emptydir-data

# Watch pod evictions - PDB will block if minAvailable would be violated
kubectl get pods -w -l app=order-service
```

## Checking PDB Status

Monitor whether your PDB is allowing or blocking disruptions:

```bash
kubectl describe pdb order-service-pdb
# Look for: Allowed disruptions: 2
# And: Current Healthy: 3
```

## Summary

Pod Disruption Budgets are essential for maintaining high availability of Dapr-enabled services during cluster maintenance. By setting `minAvailable` on each Dapr service deployment and on Dapr control plane components like the placement server, you prevent simultaneous eviction of all replicas during voluntary disruptions. Always ensure your replica count exceeds the minAvailable threshold to allow Kubernetes to proceed with maintenance operations.
