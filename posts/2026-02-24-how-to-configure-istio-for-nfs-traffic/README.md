# How to Configure Istio for NFS Traffic

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, NFS, Storage, Kubernetes, Networking

Description: Handle NFS storage traffic in Kubernetes clusters running Istio, covering kernel-level NFS mounts, CSI-based NFS, and application-level NFS access patterns.

---

NFS (Network File System) is one of the most common shared storage solutions in Kubernetes. It provides ReadWriteMany (RWX) access, which means multiple pods across different nodes can read and write to the same volume simultaneously. When you add Istio to a cluster that uses NFS, you need to understand how NFS traffic flows and where (if at all) the Istio proxy is involved.

## How NFS Works in Kubernetes

NFS in Kubernetes can be set up in several ways:

1. **Direct NFS PersistentVolume** - Kubernetes mounts the NFS share at the node level
2. **NFS CSI driver** - a CSI driver handles the NFS mounting
3. **NFS subdir external provisioner** - automatically creates subdirectories on an NFS share

In all cases, the actual NFS traffic (RPC calls over port 2049) flows from the Kubernetes node to the NFS server. This traffic is at the kernel level and goes through the node's network interface, NOT through the pod's network namespace. The Istio sidecar proxy does not intercept this traffic.

## Kernel-Level NFS: No Istio Impact

When you use a standard NFS PersistentVolume:

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: nfs-pv
spec:
  capacity:
    storage: 100Gi
  accessModes:
    - ReadWriteMany
  nfs:
    server: 10.0.1.50
    path: /exports/shared
  mountOptions:
    - hard
    - nfsvers=4.1
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: nfs-data
  namespace: default
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: ""
  resources:
    requests:
      storage: 100Gi
  volumeName: nfs-pv
```

The kubelet on each node mounts the NFS share at the host level, then bind-mounts it into the pod's filesystem. Your application reads and writes files through the local mount point:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-with-nfs
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: app-with-nfs
  template:
    metadata:
      labels:
        app: app-with-nfs
    spec:
      containers:
        - name: app
          image: myregistry/app:latest
          volumeMounts:
            - name: shared-data
              mountPath: /data
      volumes:
        - name: shared-data
          persistentVolumeClaim:
            claimName: nfs-data
```

From the application's perspective, `/data` is just a local directory. There is no network call in the pod's network namespace. Istio has zero impact on this.

## NFS CSI Driver

The NFS CSI driver (csi-driver-nfs) provides a more Kubernetes-native way to use NFS. Install it:

```bash
helm repo add csi-driver-nfs https://raw.githubusercontent.com/kubernetes-csi/csi-driver-nfs/master/charts
helm install csi-driver-nfs csi-driver-nfs/csi-driver-nfs -n kube-system
```

Create a StorageClass:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nfs-csi
provisioner: nfs.csi.k8s.io
parameters:
  server: 10.0.1.50
  share: /exports/dynamic
reclaimPolicy: Delete
volumeBindingMode: Immediate
```

Now you can create PVCs that automatically provision NFS subdirectories:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: dynamic-nfs
  namespace: default
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: nfs-csi
  resources:
    requests:
      storage: 10Gi
```

The CSI driver controller runs as a pod. If Istio sidecar injection is enabled for its namespace, you should exclude it:

```yaml
# In the CSI driver deployment
metadata:
  annotations:
    sidecar.istio.io/inject: "false"
```

The CSI driver does not need Istio. Its traffic to the NFS server should not go through a sidecar proxy because it handles storage provisioning at the infrastructure level.

## When Istio Does Affect NFS

There is one scenario where Istio can affect NFS-related operations: when your application uses an NFS client library to connect to NFS over the network instead of using a kernel mount.

Some applications implement their own NFS clients (especially in Java and Go) that make RPC calls directly from the application. These calls go through the pod's network namespace and therefore through the Envoy proxy.

If you have an application that directly connects to NFS:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/excludeOutboundIPRanges: "10.0.1.50/32"
```

This excludes traffic to the NFS server IP from the proxy. NFS uses port 2049 (and sometimes additional ports for mountd and portmapper), and Envoy does not understand the NFS RPC protocol, so proxying it would break things.

Alternatively, exclude the NFS ports:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/excludeOutboundPorts: "111,2049,20048"
```

Port 111 is portmapper, 2049 is NFS, and 20048 is mountd. Your NFS server might use different ports for mountd, so check with:

```bash
rpcinfo -p <nfs-server-ip>
```

## NFS Server Running in Kubernetes

If you run an NFS server as a pod in your cluster (common for development), Istio handles the traffic between clients and the NFS server pod:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: nfs-server
  namespace: default
spec:
  selector:
    app: nfs-server
  ports:
    - name: tcp-nfs
      port: 2049
      targetPort: 2049
    - name: tcp-mountd
      port: 20048
      targetPort: 20048
    - name: tcp-portmapper
      port: 111
      targetPort: 111
```

For NFS server pods, disable the sidecar:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nfs-server
  namespace: default
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/inject: "false"
    spec:
      containers:
        - name: nfs-server
          image: itsthenetwork/nfs-server-alpine:latest
          securityContext:
            privileged: true
          ports:
            - containerPort: 2049
          env:
            - name: SHARED_DIRECTORY
              value: /exports
          volumeMounts:
            - name: nfs-data
              mountPath: /exports
      volumes:
        - name: nfs-data
          persistentVolumeClaim:
            claimName: nfs-backing-storage
```

NFS uses a complex RPC protocol that Envoy does not understand. The sidecar would try to proxy NFS traffic as generic TCP, which might work for basic operations but can break with advanced NFS features like file locking and callbacks.

## Troubleshooting NFS with Istio

If NFS is not working and you suspect Istio:

```bash
# Check if NFS traffic is going through the proxy
kubectl exec -it <pod-name> -c istio-proxy -- \
  pilot-agent request GET stats | grep "2049"

# Check iptables rules to see if NFS ports are intercepted
kubectl exec -it <pod-name> -c istio-proxy -- \
  iptables -t nat -L ISTIO_OUTPUT -n | grep 2049

# Test NFS mount from the node (bypasses Istio)
ssh <node> "showmount -e 10.0.1.50"

# Check if the PV is properly mounted
kubectl exec -it <pod-name> -c app -- df -h /data
kubectl exec -it <pod-name> -c app -- ls -la /data
```

If `df -h /data` shows the NFS mount, the volume is working correctly regardless of Istio.

## Performance Considerations

Since kernel-level NFS traffic does not go through Istio, there is no performance impact from the sidecar proxy on NFS operations. The NFS performance depends on:

- Network bandwidth between nodes and the NFS server
- NFS server performance (disk IOPS, CPU)
- NFS mount options (async vs sync, hard vs soft)

For best NFS performance in Kubernetes:

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: nfs-pv
spec:
  capacity:
    storage: 100Gi
  accessModes:
    - ReadWriteMany
  nfs:
    server: 10.0.1.50
    path: /exports/shared
  mountOptions:
    - hard
    - nfsvers=4.2
    - rsize=1048576
    - wsize=1048576
    - timeo=600
    - retrans=2
```

These mount options (1MB read/write size, NFSv4.2) provide good performance for most workloads.

NFS and Istio coexist peacefully in almost all cases. The kernel handles NFS mounting, and the sidecar proxy never sees the NFS traffic. The only time you need to worry is if you run an NFS server as a pod in the mesh (disable the sidecar) or if your application uses a userspace NFS client (exclude the NFS server IP). For standard PVC-based NFS usage, no Istio configuration changes are needed.
