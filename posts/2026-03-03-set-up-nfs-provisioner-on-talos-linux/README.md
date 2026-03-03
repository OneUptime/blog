# How to Set Up NFS Provisioner on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, NFS, Kubernetes, Storage Provisioner, Shared Storage

Description: Deploy an NFS provisioner on Talos Linux to provide dynamically provisioned shared storage for your Kubernetes workloads.

---

NFS (Network File System) has been a reliable shared storage solution for decades, and it remains a practical choice for Kubernetes clusters that need ReadWriteMany volumes without the complexity of distributed storage systems. On Talos Linux, you can either connect to an external NFS server or run an NFS provisioner directly inside your cluster.

This guide covers both approaches: using an external NFS server and deploying an in-cluster NFS provisioner on Talos Linux.

## Option 1: External NFS Server

If you already have an NFS server on your network, the simplest approach is to use the NFS CSI driver to dynamically provision volumes from it.

### Installing the NFS CSI Driver

```bash
# Add the NFS CSI driver Helm repository
helm repo add csi-driver-nfs https://raw.githubusercontent.com/kubernetes-csi/csi-driver-nfs/master/charts
helm repo update

# Install the NFS CSI driver
helm install csi-driver-nfs csi-driver-nfs/csi-driver-nfs \
  --namespace kube-system \
  --set driver.name=nfs.csi.k8s.io \
  --set controller.replicas=2

# Verify the driver is running
kubectl -n kube-system get pods -l app.kubernetes.io/name=csi-driver-nfs
```

### Creating a StorageClass

Point the StorageClass at your NFS server:

```yaml
# nfs-storageclass.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nfs-shared
provisioner: nfs.csi.k8s.io
parameters:
  server: 192.168.1.100        # Your NFS server IP
  share: /exports/kubernetes    # NFS export path
  subDir: "${pvc.metadata.namespace}/${pvc.metadata.name}"
  mountPermissions: "0777"
reclaimPolicy: Delete
volumeBindingMode: Immediate
mountOptions:
  - nfsvers=4.1
  - hard
  - noresvport
```

```bash
# Apply the StorageClass
kubectl apply -f nfs-storageclass.yaml
```

### Testing with a PVC

```yaml
# test-nfs-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: nfs-test
  namespace: default
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 5Gi
  storageClassName: nfs-shared
---
apiVersion: v1
kind: Pod
metadata:
  name: nfs-test-pod
  namespace: default
spec:
  containers:
    - name: test
      image: busybox
      command: ["sh", "-c", "echo 'NFS works' > /data/test.txt && cat /data/test.txt && sleep 3600"]
      volumeMounts:
        - name: nfs-data
          mountPath: /data
  volumes:
    - name: nfs-data
      persistentVolumeClaim:
        claimName: nfs-test
```

```bash
kubectl apply -f test-nfs-pvc.yaml
kubectl get pvc nfs-test
kubectl logs nfs-test-pod
```

## Option 2: In-Cluster NFS Server

If you do not have an external NFS server, you can run one inside your Talos Linux cluster using the NFS Ganesha provisioner.

### Installing NFS Ganesha Server Provisioner

```bash
# Add the NFS provisioner Helm repository
helm repo add nfs-ganesha-server-and-external-provisioner \
  https://kubernetes-sigs.github.io/nfs-ganesha-server-and-external-provisioner
helm repo update
```

Create a values file:

```yaml
# nfs-provisioner-values.yaml
persistence:
  enabled: true
  storageClass: "longhorn"  # Or whatever storage class backs your NFS server
  size: 200Gi
  accessMode: ReadWriteOnce

storageClass:
  name: nfs
  defaultClass: false
  reclaimPolicy: Delete
  allowVolumeExpansion: true
  mountOptions:
    - nfsvers=4.1
    - hard
    - noresvport

resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi

nodeSelector: {}
tolerations: []
```

```bash
# Install the NFS provisioner
helm install nfs-server nfs-ganesha-server-and-external-provisioner/nfs-server-provisioner \
  --namespace nfs-provisioner \
  --create-namespace \
  -f nfs-provisioner-values.yaml

# Verify it is running
kubectl -n nfs-provisioner get pods
kubectl get storageclass nfs
```

## Using NFS Storage for ReadWriteMany Workloads

NFS is one of the simplest ways to get ReadWriteMany volumes on Kubernetes. Here is an example with multiple pods sharing storage:

```yaml
# shared-workspace.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: shared-workspace
  namespace: data-processing
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 50Gi
  storageClassName: nfs-shared
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: data-writer
  namespace: data-processing
spec:
  replicas: 3
  selector:
    matchLabels:
      app: data-writer
  template:
    metadata:
      labels:
        app: data-writer
    spec:
      containers:
        - name: writer
          image: myorg/data-writer:1.0.0
          volumeMounts:
            - name: workspace
              mountPath: /workspace
          resources:
            requests:
              cpu: 200m
              memory: 256Mi
      volumes:
        - name: workspace
          persistentVolumeClaim:
            claimName: shared-workspace
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: data-reader
  namespace: data-processing
spec:
  replicas: 5
  selector:
    matchLabels:
      app: data-reader
  template:
    metadata:
      labels:
        app: data-reader
    spec:
      containers:
        - name: reader
          image: myorg/data-reader:1.0.0
          volumeMounts:
            - name: workspace
              mountPath: /workspace
              readOnly: true
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
      volumes:
        - name: workspace
          persistentVolumeClaim:
            claimName: shared-workspace
```

In this example, three writer pods and five reader pods all share the same NFS volume.

## Talos Linux NFS Configuration

Talos Linux includes NFS client support by default, but you may need to load additional kernel modules for certain NFS versions:

```yaml
# If you need NFSv4 support patches
machine:
  kernel:
    modules:
      - name: nfs
      - name: nfsd
```

Most of the time, the default Talos configuration handles NFS mounts through the CSI driver without any additional patches.

## Static NFS Volumes

For cases where you want to mount a specific NFS export without dynamic provisioning:

```yaml
# static-nfs-pv.yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: nfs-media
spec:
  capacity:
    storage: 500Gi
  accessModes:
    - ReadWriteMany
  persistentVolumeReclaimPolicy: Retain
  nfs:
    server: 192.168.1.100
    path: /exports/media
  mountOptions:
    - nfsvers=4.1
    - hard
    - noresvport
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: nfs-media
  namespace: my-app
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 500Gi
  volumeName: nfs-media
  storageClassName: ""
```

## Performance Tuning

NFS performance depends on network throughput and server configuration. Here are some tips:

```yaml
# StorageClass with optimized mount options
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nfs-optimized
provisioner: nfs.csi.k8s.io
parameters:
  server: 192.168.1.100
  share: /exports/kubernetes
mountOptions:
  - nfsvers=4.1
  - hard
  - noresvport
  - rsize=1048576    # Read buffer size (1MB)
  - wsize=1048576    # Write buffer size (1MB)
  - timeo=600        # Timeout in deciseconds
  - retrans=2        # Number of retransmissions
  - noacl            # Disable ACL checking if not needed
```

## Monitoring NFS Health

```bash
# Check NFS mount status on a node (through a debug pod)
kubectl run nfs-debug --rm -it --image=busybox -- sh -c "mount | grep nfs"

# Check NFS provisioner logs
kubectl -n nfs-provisioner logs -l app=nfs-server-provisioner --tail=50

# Check CSI driver logs
kubectl -n kube-system logs -l app.kubernetes.io/name=csi-driver-nfs --tail=50

# Verify PVC is properly bound
kubectl get pvc -A | grep nfs
```

## Troubleshooting

Common NFS issues on Talos Linux:

1. If mounts fail with "permission denied", check that your NFS server allows connections from the cluster node IPs and that the export options include `no_root_squash` or appropriate UID/GID mappings.

2. If you see stale NFS handles, it usually means the NFS server was restarted or the export path changed. Delete and recreate the PVC.

3. For timeout issues, verify network connectivity between your Talos nodes and the NFS server using a debug pod.

```bash
# Test NFS server connectivity
kubectl run nfs-test --rm -it --image=busybox -- \
  sh -c "nc -zv 192.168.1.100 2049"
```

## Summary

NFS provisioning on Talos Linux gives you a simple, well-understood shared storage solution. Whether you connect to an external NFS server or run one inside your cluster, the NFS CSI driver handles dynamic provisioning through standard StorageClasses and PersistentVolumeClaims. While NFS does not match the performance of local storage or specialized distributed systems like Ceph, it is perfectly adequate for many use cases like shared configuration files, media storage, and data processing pipelines. The simplicity of NFS makes it a good starting point for teams that need ReadWriteMany storage on Talos Linux without the operational complexity of more advanced solutions.
