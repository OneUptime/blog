# How to Create Unique Kubernetes Services per NFS Server in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, NFS, Kubernetes, Service

Description: Learn how Rook creates unique Kubernetes Services per NFS server instance and how to configure them for external or per-server access.

---

## How Rook Creates NFS Services

When you deploy a `CephNFS` resource with multiple active server instances, Rook creates one Kubernetes Service per NFS-Ganesha pod. Each NFS server pod gets its own dedicated Service, rather than a single shared Service load-balancing across all pods. This matters because NFS is stateful - clients must maintain a connection to the same server throughout a session to preserve file locks and state.

## Viewing Per-Server Services

After deploying a `CephNFS` with two active instances, inspect the created Services:

```bash
kubectl -n rook-ceph get services -l app=rook-ceph-nfs
```

You will see one Service per active server:

```text
NAME                         TYPE        CLUSTER-IP      PORT(S)
rook-ceph-nfs-my-nfs-0       ClusterIP   10.96.12.10     2049/TCP
rook-ceph-nfs-my-nfs-1       ClusterIP   10.96.12.11     2049/TCP
```

Each Service selects exactly one NFS pod by pod name, ensuring sticky routing.

## Configuring the CephNFS for Multiple Instances

Set the `active` count to control how many NFS server pods and Services are created:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephNFS
metadata:
  name: my-nfs
  namespace: rook-ceph
spec:
  server:
    active: 3
```

Rook creates pods `rook-ceph-nfs-my-nfs-0`, `rook-ceph-nfs-my-nfs-1`, and `rook-ceph-nfs-my-nfs-2`, each with its own ClusterIP Service.

## Exposing Individual NFS Services Externally

To give clients outside Kubernetes access to a specific NFS server, create a LoadBalancer Service targeting one pod:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: nfs-external-0
  namespace: rook-ceph
spec:
  type: LoadBalancer
  selector:
    app: rook-ceph-nfs
    ceph_nfs: my-nfs
    ceph_daemon_id: "my-nfs-0"
  ports:
    - name: nfs
      port: 2049
      protocol: TCP
    - name: rpcbind
      port: 111
      protocol: TCP
```

The label `ceph_daemon_id: "my-nfs-0"` ensures this Service routes only to the first NFS pod.

## Distributing Clients Across Servers

Since each NFS server has a unique IP, you can distribute client mounts across servers manually for load balancing:

```bash
# Client group A mounts server 0
mount -t nfs4 10.96.12.10:/cephfs-export /mnt/nfs

# Client group B mounts server 1
mount -t nfs4 10.96.12.11:/cephfs-export /mnt/nfs
```

Clients stay affined to their assigned server as long as the connection is maintained.

## Monitoring Per-Server Status

Check the status of each NFS instance:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-nfs -o wide
```

For detailed Ganesha status on a specific instance:

```bash
kubectl -n rook-ceph exec -it rook-ceph-nfs-my-nfs-0 -- \
  ceph nfs cluster info my-nfs
```

## Summary

Rook creates one Kubernetes Service per NFS server pod, reflecting NFS's stateful nature. Configure the number of servers via `spec.server.active` in the `CephNFS` CR. For external access, create additional LoadBalancer Services that select individual pods by daemon ID label. This per-server Service model ensures client sessions remain pinned to a specific server, preserving NFS state and file locking semantics.
