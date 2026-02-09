# How to Configure NFS Persistent Volumes with Dynamic Provisioning on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, NFS, Storage

Description: Set up NFS-based persistent volumes with dynamic provisioning on Kubernetes using storage classes, automatic volume creation, and proper access modes for shared storage.

---

Network File System (NFS) provides shared storage accessible from multiple nodes simultaneously, making it ideal for Kubernetes workloads requiring ReadWriteMany access. Dynamic provisioning automates the creation of persistent volumes when applications request storage through PersistentVolumeClaims, eliminating manual volume management and improving developer productivity.

## Understanding NFS for Kubernetes

NFS operates on a client-server model where an NFS server exports directories that clients mount over the network. In Kubernetes, the NFS server runs outside the cluster (or as a StatefulSet within it), while worker nodes act as NFS clients mounting volumes for pods.

Dynamic provisioning requires a storage provisioner that watches for PersistentVolumeClaim objects and automatically creates PersistentVolumes backed by NFS exports. The provisioner communicates with the NFS server to create subdirectories for each volume, providing isolation between applications.

## Setting Up NFS Server

Start by deploying an NFS server. For production, use dedicated NFS appliances or managed services. For development and testing, deploy NFS server in Kubernetes.

```yaml
# nfs-server.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: nfs-server-pvc
  namespace: nfs-system
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 100Gi
  storageClassName: standard
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nfs-server
  namespace: nfs-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nfs-server
  template:
    metadata:
      labels:
        app: nfs-server
    spec:
      containers:
      - name: nfs-server
        image: k8s.gcr.io/volume-nfs:0.8
        ports:
        - name: nfs
          containerPort: 2049
        - name: mountd
          containerPort: 20048
        - name: rpcbind
          containerPort: 111
        securityContext:
          privileged: true
        volumeMounts:
        - name: nfs-storage
          mountPath: /exports
      volumes:
      - name: nfs-storage
        persistentVolumeClaim:
          claimName: nfs-server-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: nfs-server
  namespace: nfs-system
spec:
  selector:
    app: nfs-server
  ports:
  - name: nfs
    port: 2049
  - name: mountd
    port: 20048
  - name: rpcbind
    port: 111
  clusterIP: None
```

Deploy the NFS server:

```bash
kubectl create namespace nfs-system
kubectl apply -f nfs-server.yaml

# Verify NFS server is running
kubectl get pods -n nfs-system
kubectl get svc -n nfs-system
```

## Installing NFS Subdir External Provisioner

The NFS Subdir External Provisioner creates subdirectories on an NFS server for each PVC, providing dynamic provisioning.

```bash
# Add Helm repository
helm repo add nfs-subdir-external-provisioner \
  https://kubernetes-sigs.github.io/nfs-subdir-external-provisioner
helm repo update

# Install the provisioner
helm install nfs-provisioner nfs-subdir-external-provisioner/nfs-subdir-external-provisioner \
  --namespace nfs-system \
  --set nfs.server=nfs-server.nfs-system.svc.cluster.local \
  --set nfs.path=/exports \
  --set storageClass.name=nfs-dynamic \
  --set storageClass.defaultClass=false \
  --set storageClass.accessModes=ReadWriteMany
```

For manual deployment without Helm:

```yaml
# nfs-provisioner.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: nfs-provisioner
  namespace: nfs-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: nfs-provisioner-runner
rules:
- apiGroups: [""]
  resources: ["persistentvolumes"]
  verbs: ["get", "list", "watch", "create", "delete"]
- apiGroups: [""]
  resources: ["persistentvolumeclaims"]
  verbs: ["get", "list", "watch", "update"]
- apiGroups: ["storage.k8s.io"]
  resources: ["storageclasses"]
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources: ["events"]
  verbs: ["create", "update", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: run-nfs-provisioner
subjects:
- kind: ServiceAccount
  name: nfs-provisioner
  namespace: nfs-system
roleRef:
  kind: ClusterRole
  name: nfs-provisioner-runner
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nfs-provisioner
  namespace: nfs-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nfs-provisioner
  strategy:
    type: Recreate
  template:
    metadata:
      labels:
        app: nfs-provisioner
    spec:
      serviceAccountName: nfs-provisioner
      containers:
      - name: nfs-provisioner
        image: k8s.gcr.io/sig-storage/nfs-subdir-external-provisioner:v4.0.2
        volumeMounts:
        - name: nfs-client-root
          mountPath: /persistentvolumes
        env:
        - name: PROVISIONER_NAME
          value: nfs-provisioner
        - name: NFS_SERVER
          value: nfs-server.nfs-system.svc.cluster.local
        - name: NFS_PATH
          value: /exports
      volumes:
      - name: nfs-client-root
        nfs:
          server: nfs-server.nfs-system.svc.cluster.local
          path: /exports
```

## Creating Storage Class

Define a StorageClass that uses the NFS provisioner for dynamic volume creation.

```yaml
# nfs-storage-class.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nfs-dynamic
provisioner: nfs-provisioner
parameters:
  archiveOnDelete: "false"
  pathPattern: "${.PVC.namespace}/${.PVC.name}"
reclaimPolicy: Delete
volumeBindingMode: Immediate
allowVolumeExpansion: true
mountOptions:
- hard
- nfsvers=4.1
- noatime
- nodiratime
```

The `pathPattern` parameter controls subdirectory naming. This configuration creates directories named `namespace/pvc-name` on the NFS server.

The `archiveOnDelete: "false"` parameter deletes data when PVCs are removed. Set to `"true"` to archive deleted volumes instead.

Apply the storage class:

```bash
kubectl apply -f nfs-storage-class.yaml

# Verify storage class
kubectl get storageclass nfs-dynamic
```

## Creating Dynamic PVCs

Applications can now request NFS storage dynamically through PersistentVolumeClaims.

```yaml
# app-with-nfs-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: shared-data
  namespace: default
spec:
  accessModes:
  - ReadWriteMany
  storageClassName: nfs-dynamic
  resources:
    requests:
      storage: 10Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: default
spec:
  replicas: 3
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
        image: nginx:1.25
        volumeMounts:
        - name: shared-storage
          mountPath: /usr/share/nginx/html
        ports:
        - containerPort: 80
      volumes:
      - name: shared-storage
        persistentVolumeClaim:
          claimName: shared-data
```

Deploy the application:

```bash
kubectl apply -f app-with-nfs-pvc.yaml

# Check PVC status
kubectl get pvc shared-data

# Verify PV was created automatically
kubectl get pv

# Check volume binding
kubectl describe pvc shared-data
```

The provisioner automatically creates a PersistentVolume and binds it to the PVC. All three nginx replicas share the same storage volume.

## Multiple Storage Classes

Create different storage classes for various use cases with different parameters.

```yaml
# nfs-storage-classes.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nfs-fast
provisioner: nfs-provisioner
parameters:
  archiveOnDelete: "false"
  pathPattern: "fast/${.PVC.namespace}/${.PVC.name}"
reclaimPolicy: Delete
volumeBindingMode: Immediate
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nfs-backup
provisioner: nfs-provisioner
parameters:
  archiveOnDelete: "true"
  pathPattern: "backup/${.PVC.namespace}/${.PVC.name}"
reclaimPolicy: Retain
volumeBindingMode: Immediate
```

Applications choose the appropriate storage class based on requirements:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: backup-data
spec:
  accessModes:
  - ReadWriteMany
  storageClassName: nfs-backup
  resources:
    requests:
      storage: 50Gi
```

## Access Modes and Use Cases

NFS excels at ReadWriteMany scenarios where multiple pods need concurrent write access.

```yaml
# shared-logs-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: shared-logs
  namespace: logging
spec:
  accessModes:
  - ReadWriteMany
  storageClassName: nfs-dynamic
  resources:
    requests:
      storage: 20Gi
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: log-collector
  namespace: logging
spec:
  selector:
    matchLabels:
      app: log-collector
  template:
    metadata:
      labels:
        app: log-collector
    spec:
      containers:
      - name: collector
        image: fluent/fluent-bit:2.0
        volumeMounts:
        - name: logs
          mountPath: /logs
        - name: varlog
          mountPath: /var/log
          readOnly: true
      volumes:
      - name: logs
        persistentVolumeClaim:
          claimName: shared-logs
      - name: varlog
        hostPath:
          path: /var/log
```

## Monitoring NFS Volumes

Monitor NFS volume usage and performance.

```bash
# Check volume usage
kubectl exec -it <pod-name> -- df -h /mount/path

# View NFS mount options
kubectl exec -it <pod-name> -- mount | grep nfs

# Check NFS server statistics
kubectl exec -it -n nfs-system nfs-server-<pod-id> -- nfsstat
```

Deploy volume usage monitoring:

```yaml
# volume-exporter.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: volume-exporter
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: volume-exporter
  template:
    metadata:
      labels:
        app: volume-exporter
    spec:
      containers:
      - name: exporter
        image: prom/node-exporter:latest
        args:
        - --path.rootfs=/host
        - --collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)
        volumeMounts:
        - name: root
          mountPath: /host
          readOnly: true
        ports:
        - containerPort: 9100
      volumes:
      - name: root
        hostPath:
          path: /
```

## Troubleshooting

Common issues with NFS dynamic provisioning:

```bash
# Check provisioner logs
kubectl logs -n nfs-system deployment/nfs-provisioner

# Verify NFS server connectivity
kubectl run -it --rm debug --image=busybox --restart=Never -- \
  nc -zv nfs-server.nfs-system.svc.cluster.local 2049

# Test NFS mount manually
kubectl run -it --rm nfs-test --image=busybox --restart=Never -- \
  mount -t nfs nfs-server.nfs-system.svc.cluster.local:/exports /mnt

# Check PVC events
kubectl describe pvc <pvc-name>

# Verify storage class configuration
kubectl get storageclass nfs-dynamic -o yaml
```

## Performance Optimization

Optimize NFS mount options for better performance:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nfs-optimized
provisioner: nfs-provisioner
parameters:
  archiveOnDelete: "false"
mountOptions:
- hard
- nfsvers=4.1
- noatime
- nodiratime
- rsize=1048576
- wsize=1048576
- timeo=600
- retrans=2
- actimeo=60
```

These mount options balance performance and reliability:
- `rsize/wsize=1048576`: Larger read/write buffer sizes
- `timeo=600`: Longer timeout for busy networks
- `actimeo=60`: Cache file attributes for 60 seconds

## Conclusion

NFS with dynamic provisioning provides shared storage for Kubernetes workloads requiring ReadWriteMany access. The NFS Subdir External Provisioner automates volume creation, eliminating manual PV management while maintaining the flexibility of traditional NFS. This approach works well for shared configuration files, uploaded media, shared logs, and any scenario requiring concurrent write access from multiple pods. Configure appropriate mount options for your workload characteristics and monitor volume performance to ensure optimal operation.
