# How to Deploy Rook-Ceph on SUSE Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Rancher, SUSE, Kubernetes, Storage, RKE

Description: Deploy Rook-Ceph on SUSE Rancher-managed Kubernetes clusters using the Rancher App Catalog or Helm for distributed storage.

---

## Overview

SUSE Rancher is a Kubernetes management platform that can manage multiple downstream clusters. Rook-Ceph can be deployed on Rancher-managed clusters (RKE, RKE2, or imported clusters) using Rancher's App Catalog or direct Helm installation. This guide covers deployment via both methods.

## Prerequisites

- A Rancher-managed cluster with at least 3 worker nodes
- RKE2 or RKE1 downstream cluster with raw disks on nodes
- Rancher UI access with cluster admin role
- `kubectl` configured for the target cluster

## Method 1 - Deploy via Rancher App Catalog

1. Open the Rancher UI and select your downstream cluster
2. Navigate to Apps > Charts
3. Search for "Rook-Ceph"
4. Configure Helm values and click Install

Set the following in the UI form or YAML values:

```yaml
csi:
  enableCSIHostNetwork: true
  kubeletDirPath: /var/lib/kubelet
```

## Method 2 - Deploy via Helm CLI

Connect to the downstream cluster:

```bash
# Export kubeconfig from Rancher
rancher cluster kubeconfig my-cluster > ~/.kube/config

helm repo add rook-release https://charts.rook.io/release
helm repo update

helm install rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  --create-namespace
```

## Step 3 - Deploy the Ceph Cluster

For RKE2 clusters, the kubelet path is `/var/lib/kubelet`:

```yaml
# cluster-rancher.yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cephVersion:
    image: quay.io/ceph/ceph:v18.2.0
  dataDirHostPath: /var/lib/rook
  mon:
    count: 3
    allowMultiplePerNode: false
  mgr:
    count: 1
  dashboard:
    enabled: true
  storage:
    useAllNodes: true
    useAllDevices: false
    deviceFilter: "^sd[b-z]$"
```

```bash
kubectl apply -f cluster-rancher.yaml
```

## Step 4 - Configure Rancher Persistent Storage

Once Rook-Ceph is healthy, configure it as a Rancher storage class:

```bash
kubectl apply -f - <<'EOF'
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: replicapool
  namespace: rook-ceph
spec:
  replicated:
    size: 3
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-block
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: replicapool
  imageFormat: "2"
  imageFeatures: layering
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/controller-expand-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/controller-expand-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
allowVolumeExpansion: true
EOF
```

## Step 5 - Expose Dashboard Through Rancher Ingress

Create an Ingress to access the Ceph dashboard via Rancher's ingress controller:

```yaml
# dashboard-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: rook-ceph-dashboard
  namespace: rook-ceph
  annotations:
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
spec:
  ingressClassName: nginx
  rules:
    - host: ceph-dashboard.cluster.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: rook-ceph-mgr-dashboard
                port:
                  number: 8443
```

```bash
kubectl apply -f dashboard-ingress.yaml
```

## Monitoring in Rancher

Rancher's built-in monitoring (Prometheus/Grafana) can scrape Ceph metrics:

```bash
# Enable Rancher monitoring add-on
# Then add a ServiceMonitor for Ceph
kubectl apply -f https://raw.githubusercontent.com/rook/rook/master/deploy/examples/monitoring/service-monitor.yaml
```

## Summary

Rook-Ceph on SUSE Rancher can be deployed through the Rancher App Catalog for a GUI-driven workflow or via Helm CLI for automation. Using RKE2's standard kubelet path simplifies configuration, while Rancher's ingress controller and monitoring integration provide operational visibility and access to the Ceph dashboard across managed cluster environments.
