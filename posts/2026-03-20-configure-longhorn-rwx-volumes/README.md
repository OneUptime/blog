# How to Enable Longhorn ReadWriteMany (RWX) Volume Support

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Kubernetes, Storage, RWX, NFS, Shared Storage

Description: Learn how to configure and use Longhorn ReadWriteMany (RWX) volumes that allow multiple pods to simultaneously read and write to the same volume.

## Introduction

ReadWriteMany (RWX) volumes allow multiple pods running on different nodes to mount and write to the same volume simultaneously. Longhorn implements RWX using an internal NFSv4 server, making shared storage possible without requiring external NFS infrastructure. This is useful for applications that need shared file storage across multiple replicas.

## How Longhorn Implements RWX

Longhorn RWX volumes work as follows:
1. A Longhorn volume is created as the backing block storage
2. A share manager pod (NFSv4 server) is started on the same node as the volume
3. Other nodes mount the NFSv4 share to access the volume
4. All writes go through the share manager, ensuring consistency

## Prerequisites

- Longhorn v1.1.0 or later
- `nfs-common` (Ubuntu/Debian) or `nfs-utils` (RHEL/CentOS) on all nodes
- NFSv4 kernel module loaded

### Install NFS Client on All Nodes

```bash
# Ubuntu/Debian

apt-get install -y nfs-common

# RHEL/CentOS/Rocky Linux
yum install -y nfs-utils
systemctl enable --now nfs-client.target

# Verify NFSv4 support
cat /proc/filesystems | grep nfs
```

## Creating an RWX PVC

### Using the Default Longhorn StorageClass

```yaml
# rwx-pvc.yaml - ReadWriteMany PVC backed by Longhorn
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: shared-storage
  namespace: default
spec:
  accessModes:
    - ReadWriteMany   # Multiple pods can mount this simultaneously
  storageClassName: longhorn
  resources:
    requests:
      storage: 10Gi
```

```bash
kubectl apply -f rwx-pvc.yaml
kubectl get pvc shared-storage
```

### Creating a Dedicated RWX StorageClass

```yaml
# storageclass-rwx.yaml - Dedicated RWX storage class
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-rwx
provisioner: driver.longhorn.io
allowVolumeExpansion: true
parameters:
  numberOfReplicas: "3"
  staleReplicaTimeout: "30"
  fsType: "ext4"
  # Optional: customize NFS mount options for the RWX share-manager
  nfsOptions: "vers=4.1,noresvport"
```

```bash
kubectl apply -f storageclass-rwx.yaml
```

## Using RWX Volumes in a Deployment

Multiple replicas can all mount the same RWX volume:

```yaml
# deployment-rwx.yaml - Deployment where all pods share the same volume
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: default
spec:
  replicas: 3   # All 3 replicas share the same volume
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
        - name: nginx
          image: nginx:stable
          volumeMounts:
            - name: shared-web-content
              mountPath: /usr/share/nginx/html
      volumes:
        - name: shared-web-content
          persistentVolumeClaim:
            claimName: shared-storage   # All pods use the same RWX PVC
```

```bash
kubectl apply -f deployment-rwx.yaml

# Verify all pods are running and using the shared volume
kubectl get pods -l app=web-app -o wide
```

## Testing RWX Functionality

```bash
# Test that writes from one pod are visible on another
# Get pod names
PODS=$(kubectl get pods -l app=web-app -o name | head -3)

# Write from the first pod
FIRST_POD=$(kubectl get pods -l app=web-app -o name | head -1)
kubectl exec ${FIRST_POD} -- sh -c "echo 'Written from pod 1' > /usr/share/nginx/html/index.html"

# Read from the second pod
SECOND_POD=$(kubectl get pods -l app=web-app -o name | sed -n '2p')
kubectl exec ${SECOND_POD} -- cat /usr/share/nginx/html/index.html
# Should output: Written from pod 1
```

## RWX Volume with StatefulSet

For StatefulSets that need shared storage (uncommon but valid):

```yaml
# statefulset-shared-rwx.yaml - StatefulSet using a shared RWX PVC
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: content-processors
spec:
  serviceName: processors
  replicas: 3
  selector:
    matchLabels:
      app: processor
  template:
    metadata:
      labels:
        app: processor
    spec:
      containers:
        - name: processor
          image: busybox
          command: ["sh", "-c", "while true; do echo $(hostname) >> /shared/log.txt; sleep 5; done"]
          volumeMounts:
            - name: shared-log
              mountPath: /shared
      volumes:
        - name: shared-log
          persistentVolumeClaim:
            # All replicas share this single PVC
            claimName: shared-storage
```

## Monitoring RWX Share Manager

```bash
# Check the share manager pods (one per RWX volume)
kubectl get pods -n longhorn-system -l longhorn.io/component=share-manager

# View share manager logs
kubectl logs -n longhorn-system -l longhorn.io/component=share-manager --tail=50

# Check the NFS service for an RWX volume
kubectl get service -n longhorn-system | grep share-manager
```

## Performance Considerations for RWX

RWX volumes have performance characteristics to be aware of:

1. **All writes go through one share manager pod** - this is a single point of throughput
2. **Network overhead**: Remote nodes access data via NFSv4 (network latency applies)
3. **Not suitable for write-heavy workloads** requiring very low latency from multiple nodes
4. **Best for**: shared configuration, web content, log aggregation

For write-intensive shared workloads, consider alternatives:
- Use a distributed database instead
- Use message queues for cross-pod communication
- Use ReadWriteOnce volumes per pod for write-intensive operations

## Troubleshooting RWX Volumes

### Share Manager Pod Not Starting

```bash
# Check share manager pod status
kubectl get pods -n longhorn-system | grep share-manager

# Describe the pod for error details
kubectl describe pod -n longhorn-system <share-manager-pod>

# The share manager pod runs an NFS-Ganesha (userspace) server internally;
# it does not require a host-side NFS server package on cluster nodes.
```

### NFS Mount Failing on Nodes

```bash
# Test NFS connectivity
# The share manager service is in longhorn-system namespace
kubectl get svc -n longhorn-system | grep share

# From a node, test the NFS mount (get the ClusterIP first)
mount -t nfs4 <share-manager-clusterip>:/ /mnt/test
```

## Conclusion

Longhorn RWX volumes provide a convenient way to share storage across multiple pods without external NFS infrastructure. By leveraging Longhorn's built-in NFSv4 share manager, you can enable shared file access for web content, configuration files, log aggregation, and other read-heavy multi-pod workloads. For best results, use RWX volumes for cases where the shared access pattern fits the NFSv4 model rather than for high-throughput write operations.
