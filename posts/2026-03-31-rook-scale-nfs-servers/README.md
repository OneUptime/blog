# How to Scale NFS Servers in Rook-Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, NFS, Scaling, Kubernetes

Description: Learn how to scale NFS-Ganesha server instances in a Rook-Ceph cluster, including considerations for client affinity and session continuity.

---

## How NFS Scaling Works in Rook

Rook manages NFS-Ganesha servers as individual pods, each backed by a dedicated Kubernetes Service. Scaling means changing the `active` count in the `CephNFS` spec. When you scale up, Rook creates new Ganesha pods, each reading the shared export configuration from RADOS. When you scale down, pods are removed. Unlike stateless HTTP servers, NFS servers hold client state, so scaling down requires care.

## Scaling Up NFS Servers

Edit the `CephNFS` resource to increase the `active` count:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephNFS
metadata:
  name: my-nfs
  namespace: rook-ceph
spec:
  rados:
    pool: my-fs-data0
    namespace: nfs-ns
  server:
    active: 4
```

Apply the change:

```bash
kubectl apply -f cephnfs.yaml
```

Rook creates the additional NFS pods and Services:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-nfs
```

New pods (`rook-ceph-nfs-my-nfs-2`, `rook-ceph-nfs-my-nfs-3`) appear and become ready. Each reads the same RADOS-stored export config, so they immediately serve all configured exports.

## Directing New Clients to New Servers

New NFS services appear automatically:

```bash
kubectl -n rook-ceph get services -l app=rook-ceph-nfs
```

Point new clients at the newly created service IPs. Existing clients continue to use their original server - NFS does not migrate sessions automatically.

## Scaling Down NFS Servers

Before reducing the `active` count, gracefully migrate clients away from the servers you plan to remove. Check which clients are connected to a specific pod:

```bash
kubectl -n rook-ceph exec -it rook-ceph-nfs-my-nfs-3 -- \
  dbus-send --type=method_call --print-reply --system \
  --dest=org.ganesha.nfsd \
  /org/ganesha/nfsd/ClientMgr \
  org.ganesha.nfsd.clientmgr.ShowClients
```

Notify clients to remount before scaling down. Then reduce the count:

```yaml
spec:
  server:
    active: 2
```

```bash
kubectl apply -f cephnfs.yaml
```

Rook removes the highest-numbered pods first (scale-down is in reverse order).

## Using Pod Disruption Budgets

Protect against unintended simultaneous removal of too many NFS servers:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: rook-nfs-pdb
  namespace: rook-ceph
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: rook-ceph-nfs
      ceph_nfs: my-nfs
```

This ensures at least one NFS server is always available during node drain or rolling updates.

## Resource Requests for Scaled Pods

Set resource requests to ensure Kubernetes can schedule NFS pods appropriately when scaling:

```yaml
spec:
  server:
    active: 4
    resources:
      requests:
        cpu: "1"
        memory: "2Gi"
      limits:
        cpu: "4"
        memory: "8Gi"
```

## Summary

Scaling NFS servers in Rook is controlled by the `active` field in the `CephNFS` spec. Scaling up is straightforward - Rook creates new pods that automatically load the shared RADOS export config. Scaling down requires graceful client migration because NFS is stateful. Use PodDisruptionBudgets to prevent accidental removal of too many servers at once and set resource requests to guide pod scheduling on scaled clusters.
