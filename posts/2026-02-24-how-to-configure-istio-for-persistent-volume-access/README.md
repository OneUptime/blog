# How to Configure Istio for Persistent Volume Access

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Persistent Volumes, Kubernetes, Storage, Sidecar

Description: Configure Istio to work with Kubernetes Persistent Volumes, handling storage controller traffic, init containers, and volume mount considerations.

---

Persistent Volumes in Kubernetes operate at the node and storage driver level, mostly outside the pod network. But there are situations where Istio's sidecar proxy can interfere with storage operations, especially when init containers need storage access, when CSI drivers use network-based protocols, or when your application needs to reach a network file system through the proxy.

Understanding how PV access interacts with Istio helps you avoid subtle issues where pods hang during startup or storage operations fail silently.

## How Persistent Volumes Work at the Network Level

Most Persistent Volume types have a network component:

- **Cloud block storage** (EBS, Azure Disk, GCE PD) - the kubelet communicates with the cloud API to attach the volume. This happens outside the pod entirely.
- **NFS** - the node mounts the NFS share using kernel-level NFS. Traffic flows from the node to the NFS server, not through the pod network.
- **iSCSI** - similar to NFS, the node establishes iSCSI sessions to the storage target.
- **CSI drivers** - a CSI controller running as a pod may communicate with external storage APIs. CSI node plugins run as DaemonSets.
- **Network file systems (CephFS, GlusterFS)** - the node or a CSI driver handles the network communication.

For most of these, the Istio sidecar is not involved at all because the storage traffic goes through the node, not through the pod's network namespace.

## When Istio Can Interfere with PV Access

There are specific scenarios where Istio does matter:

### 1. Init Containers Accessing Storage

Init containers run before the sidecar starts (unless you are using Kubernetes native sidecar containers). If an init container needs to access network-based storage through the pod network, it will fail because the Istio proxy is not running yet:

```yaml
spec:
  initContainers:
    - name: data-loader
      image: myregistry/data-loader:latest
      command: ["sh", "-c", "curl -o /data/config.json https://config-service/config"]
      volumeMounts:
        - name: data-volume
          mountPath: /data
  containers:
    - name: app
      volumeMounts:
        - name: data-volume
          mountPath: /data
  volumes:
    - name: data-volume
      persistentVolumeClaim:
        claimName: app-data
```

The init container tries to reach `config-service` but the sidecar is not running, so the request fails. The PV itself mounts fine (that is handled by the node), but the network call inside the init container is the problem.

Fix: Exclude the init container's outbound traffic or move the network call to the main container:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/excludeOutboundIPRanges: "10.0.0.0/8"
```

Or better, move the data loading to the main container with `holdApplicationUntilProxyStarts`:

```yaml
metadata:
  annotations:
    proxy.istio.io/config: '{"holdApplicationUntilProxyStarts": true}'
```

### 2. CSI Driver Pods in the Mesh

If your CSI driver controller runs as a Deployment and is part of the Istio mesh, its communication with external storage APIs goes through the sidecar. This can cause issues if mTLS is expected but the storage API does not support it.

The fix is to exclude CSI driver pods from the mesh:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: csi-controller
  namespace: kube-system
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/inject: "false"
```

### 3. Application-Level Storage Access

If your application accesses storage through a network API (like S3, GCS, or a custom storage service), that traffic goes through the sidecar:

```yaml
# This traffic flows through Envoy
# App -> Envoy sidecar -> Storage Service
```

This is actually fine and desired, because you get mTLS, observability, and traffic management. But you need to make sure the external storage endpoint is properly configured.

## PersistentVolumeClaim Setup

The PVC and PV configuration itself does not need any Istio-specific changes:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: app-data
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: standard
  resources:
    requests:
      storage: 10Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: myregistry/my-app:latest
          volumeMounts:
            - name: data
              mountPath: /data
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: app-data
```

The volume mount happens at the filesystem level inside the container. Istio does not intercept filesystem operations, only network traffic. Reading from and writing to `/data` goes directly to the mounted volume without touching Envoy.

## ReadWriteMany Volumes

ReadWriteMany (RWX) volumes, like NFS or CephFS, allow multiple pods to mount the same volume. This works fine with Istio because the NFS/Ceph traffic goes through the node, not through the pod's proxy:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: shared-data
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: nfs-client
  resources:
    requests:
      storage: 50Gi
```

Multiple pods, even across different nodes, can mount this PVC. Istio has no effect on the shared access.

## Volume Permissions with Istio

The Istio init container (istio-init) runs as root to set up iptables rules. This can interact with volume permissions if your volume uses `fsGroup`:

```yaml
spec:
  securityContext:
    fsGroup: 1000
    runAsUser: 1000
  containers:
    - name: my-app
      securityContext:
        runAsUser: 1000
      volumeMounts:
        - name: data
          mountPath: /data
```

The `fsGroup` ensures files written to the PV are owned by group 1000. The Istio init container runs as root and does not write to your volumes, so there is no conflict. However, if you use a volume type that changes permissions at mount time, make sure it runs after the Istio init container.

## StatefulSet Volumes with Istio

StatefulSets commonly use `volumeClaimTemplates` to create per-pod PVCs. Istio works fine with StatefulSets:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database
  namespace: default
spec:
  serviceName: database
  replicas: 3
  selector:
    matchLabels:
      app: database
  template:
    metadata:
      labels:
        app: database
    spec:
      containers:
        - name: database
          image: postgres:15
          ports:
            - containerPort: 5432
              name: tcp-postgres
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes:
          - ReadWriteOnce
        storageClassName: ssd
        resources:
          requests:
            storage: 100Gi
```

Each pod gets its own PVC (data-database-0, data-database-1, data-database-2). The Istio sidecar does not interfere with the volume mounting or filesystem access.

## Debugging Storage Issues with Istio

If you suspect Istio is causing storage problems:

```bash
# Check if the pod is stuck in ContainerCreating (volume mount issue)
kubectl describe pod <pod-name> | grep -A5 "Events"

# Check if init containers are failing (network access during init)
kubectl logs <pod-name> -c istio-init
kubectl logs <pod-name> -c <init-container-name>

# Verify PVC is bound
kubectl get pvc -n default

# Check CSI driver status
kubectl get csidrivers
kubectl get volumeattachments
```

If the pod is stuck and the events mention volume mount timeout, the issue is likely at the node/storage level, not Istio. If the init container fails with a network error, that is an Istio interaction.

Persistent Volume access in Istio is mostly a non-issue because storage traffic happens below the pod network layer. The main things to watch for are init containers that need network access before the sidecar starts and CSI driver pods that should be excluded from the mesh. For everything else, volumes work exactly the same as they do without Istio.
