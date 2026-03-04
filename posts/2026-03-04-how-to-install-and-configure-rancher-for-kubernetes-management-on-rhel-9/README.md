# How to Install and Configure Rancher for Kubernetes Management on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Kubernetes, Rancher

Description: Step-by-step guide on install and configure rancher for kubernetes management on rhel 9 with practical examples and commands.

---

Rancher provides a unified management platform for Kubernetes clusters running on RHEL 9.

## Install Rancher with Helm

Prerequisites: A Kubernetes cluster with cert-manager installed.

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Add Rancher repo
helm repo add rancher-stable https://releases.rancher.com/server-charts/stable
helm repo update

# Install Rancher
helm install rancher rancher-stable/rancher \
  --namespace cattle-system --create-namespace \
  --set hostname=rancher.example.com \
  --set replicas=3
```

## Access Rancher UI

```bash
kubectl -n cattle-system get deploy rancher
# Access https://rancher.example.com
```

## Import Existing Clusters

In the Rancher UI:
1. Click "Import Existing"
2. Run the provided kubectl command on your cluster

```bash
kubectl apply -f https://rancher.example.com/v3/import/xxx.yaml
```

## Provision New Clusters

Rancher can provision clusters on:
- Custom nodes (RHEL 9 servers)
- Cloud providers (AWS, Azure, GCP)
- vSphere

## Conclusion

Rancher on RHEL 9 provides centralized Kubernetes management with a user-friendly web interface. Use it to manage multiple clusters, enforce policies, and simplify Kubernetes operations.

