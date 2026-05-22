# How to Configure Istio for Persistent Volume Access

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Persistent Volume, Kubernetes, Storage, Sidecar

Description: Configure Istio to work with Kubernetes Persistent Volumes, handling storage controller traffic, init containers, and volume mount considerations.

---

Persistent Volumes in Kubernetes operate at the node and storage driver level, mostly outside the pod network. But there are situations where Istio's sidecar proxy can interfere with storage operations, especially when init containers need storage access, when CSI drivers use network-based protocols, or when your application needs to reach a network file system through the proxy.

Understanding how PV access interacts with Istio helps you avoid subtle issues where pods hang during startup or storage operations fail silently.

## How Persistent Volumes Work at the Network Level

Many Persistent Volume types have a network component:

- **Cloud block storage** (EBS, Azure Disk, GCE PD) - Kubernetes storage components or CSI drivers communicate with the cloud API to provision and attach the volume. This happens outside the application pod entirely.
- **NFS** - the node mounts the NFS share using kernel-level NFS. Traffic flows from the node to the NFS server, not through the pod network.
- **iSCSI** - similar to NFS, the node establishes iSCSI sessions to the storage target.
- **CSI drivers** - a CSI controller running as a pod may communicate with external storage APIs. CSI node plugins run as DaemonSets.
- **Network file systems (for example, CephFS through a CSI driver)** - the node or a CSI driver handles the network communication.

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

Fix: Exclude the destination CIDR or port from Istio redirection, or move the network call to the main container:

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

If your CSI driver controller runs as a Deployment and is part of the Istio mesh, its communication with external storage APIs goes through the sidecar. This can cause issues if the driver expects direct egress, if mesh egress policy blocks unknown external services, or if TLS origination is configured incorrectly.

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
      labels:
        sidecar.istio.io/inject: "false"
```

### 3. Application-Level Storage Access

If your application accesses storage through a network API (like S3, GCS, or a custom storage service), that traffic goes through the sidecar:

```yaml
# This traffic flows through Envoy

# App -> Envoy sidecar -> Storage Service
```

This is often fine and desired, because you can get observability and traffic management for the outbound request. Istio mTLS only applies when the peer also participates in the mesh; for external storage endpoints, make sure egress policy, `ServiceEntry` resources, and TLS origination settings are configured as needed.

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

When Istio is installed without the Istio CNI node agent, the Istio init container (`istio-init`) runs with elevated privileges to set up traffic redirection rules. This can raise questions about volume permissions if your volume uses `fsGroup`:

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

The `fsGroup` ensures supported volume types are made readable and writable by group 1000. The Istio init container does not write to your application volumes, so there is no conflict. However, permission changes can happen during volume setup and can slow pod startup for large volumes.

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
