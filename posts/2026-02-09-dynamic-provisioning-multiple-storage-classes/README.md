# How to Set Up Dynamic Provisioning with Multiple StorageClasses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Storage, DynamicProvisioning, StorageClass

Description: Learn how to configure and manage multiple StorageClasses in Kubernetes for dynamic provisioning, enabling workloads to automatically select appropriate storage based on performance, cost, and reliability requirements.

---

Dynamic provisioning in Kubernetes automatically creates persistent volumes when applications request storage. By setting up multiple StorageClasses, you enable applications to choose the right storage backend based on their specific needs without manual intervention.

## Understanding Dynamic Provisioning

Dynamic provisioning eliminates the need to pre-create persistent volumes. When a PersistentVolumeClaim (PVC) references a StorageClass, Kubernetes automatically:

1. Calls the storage provisioner specified in the StorageClass
2. Creates a new persistent volume with the requested parameters
3. Binds the PVC to the newly created PV

Multiple StorageClasses allow you to offer different storage tiers within the same cluster, each optimized for specific use cases.

## Setting Up Basic Multiple StorageClasses

Create a set of StorageClasses for different performance tiers:

```yaml
# High-performance storage for databases
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
  labels:
    tier: premium
    type: ssd
provisioner: ebs.csi.aws.com
parameters:
  type: io2
  iops: "10000"
  encrypted: "true"
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
---
# Standard storage for general applications
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: standard-ssd
  labels:
    tier: standard
    type: ssd
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "3000"
  throughput: "125"
  encrypted: "true"
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
---
# Budget storage for non-critical workloads
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: budget-hdd
  labels:
    tier: economy
    type: hdd
provisioner: ebs.csi.aws.com
parameters:
  type: st1
  encrypted: "false"
reclaimPolicy: Delete
volumeBindingMode: Immediate
allowVolumeExpansion: true
```

Apply all StorageClasses:

```bash
kubectl apply -f storage-classes.yaml

# Verify they're created
kubectl get storageclass

# Expected output:
# NAME            PROVISIONER       RECLAIMPOLICY   VOLUMEBINDINGMODE      AGE
# fast-ssd        ebs.csi.aws.com   Retain          WaitForFirstConsumer   10s
# standard-ssd    ebs.csi.aws.com   Delete          WaitForFirstConsumer   10s
# budget-hdd      ebs.csi.aws.com   Delete          Immediate              10s
```

## Using Different StorageClasses

Applications explicitly request storage classes in their PVCs:

```yaml
# Database using high-performance storage
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: fast-ssd
  resources:
    requests:
      storage: 50Gi
---
# Web application using standard storage
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: web-assets
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: standard-ssd
  resources:
    requests:
      storage: 20Gi
---
# Logs using budget storage
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: application-logs
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: budget-hdd
  resources:
    requests:
      storage: 100Gi
```

Deploy and verify:

```bash
kubectl apply -f pvcs.yaml

# Watch PVC binding
kubectl get pvc -w

# Check which StorageClass each PVC uses
kubectl get pvc -o custom-columns=\
NAME:.metadata.name,\
STORAGECLASS:.spec.storageClassName,\
STATUS:.status.phase,\
CAPACITY:.status.capacity.storage
```

## Multi-Provider Setup

Configure StorageClasses from different providers in the same cluster:

```yaml
# AWS EBS for block storage
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: aws-ebs-storage
  labels:
    provider: aws
    type: block
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  encrypted: "true"
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
---
# AWS EFS for shared storage
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: aws-efs-storage
  labels:
    provider: aws
    type: filesystem
provisioner: efs.csi.aws.com
parameters:
  provisioningMode: efs-ap
  fileSystemId: fs-xxxxx
  directoryPerms: "700"
volumeBindingMode: Immediate
---
# Ceph RBD for on-premises block storage
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ceph-rbd-storage
  labels:
    provider: ceph
    type: block
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: replicapool
  imageFormat: "2"
  imageFeatures: layering
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
volumeBindingMode: Immediate
allowVolumeExpansion: true
---
# Ceph FS for shared filesystem
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ceph-fs-storage
  labels:
    provider: ceph
    type: filesystem
provisioner: rook-ceph.cephfs.csi.ceph.com
parameters:
  clusterID: rook-ceph
  fsName: myfs
  pool: myfs-data0
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-cephfs-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-cephfs-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
volumeBindingMode: Immediate
allowVolumeExpansion: true
```

## Access Mode Based StorageClasses

Create StorageClasses optimized for different access patterns:

```yaml
# ReadWriteOnce - Single pod access
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rwo-storage
  labels:
    accessMode: ReadWriteOnce
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  encrypted: "true"
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
---
# ReadWriteMany - Multi-pod shared access
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rwx-storage
  labels:
    accessMode: ReadWriteMany
provisioner: efs.csi.aws.com
parameters:
  provisioningMode: efs-ap
  fileSystemId: fs-xxxxx
volumeBindingMode: Immediate
---
# ReadOnlyMany - Shared read-only access
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rom-storage
  labels:
    accessMode: ReadOnlyMany
provisioner: efs.csi.aws.com
parameters:
  provisioningMode: efs-ap
  fileSystemId: fs-xxxxx
  readOnly: "true"
volumeBindingMode: Immediate
```

## Environment-Specific StorageClasses

Separate storage configurations by environment:

```yaml
# Development environment
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: dev-storage
  labels:
    environment: development
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "3000"
  encrypted: "false"
  tagSpecification_1: "Name=Environment|Value=Development"
reclaimPolicy: Delete  # Auto-delete to save costs
volumeBindingMode: Immediate
allowVolumeExpansion: true
---
# Staging environment
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: staging-storage
  labels:
    environment: staging
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "5000"
  throughput: "250"
  encrypted: "true"
  tagSpecification_1: "Name=Environment|Value=Staging"
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
---
# Production environment
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: prod-storage
  labels:
    environment: production
provisioner: ebs.csi.aws.com
parameters:
  type: io2
  iops: "10000"
  encrypted: "true"
  tagSpecification_1: "Name=Environment|Value=Production"
  tagSpecification_2: "Name=Backup|Value=Required"
reclaimPolicy: Retain  # Keep for compliance
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

## Automated StorageClass Selection

Use Pod scheduling and PVC templates to automate selection:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database-cluster
spec:
  serviceName: database
  replicas: 3
  selector:
    matchLabels:
      app: database
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      # StatefulSet automatically uses this StorageClass
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 100Gi
  - metadata:
      name: logs
    spec:
      accessModes: [ "ReadWriteOnce" ]
      # Different StorageClass for logs
      storageClassName: budget-hdd
      resources:
        requests:
          storage: 50Gi
  template:
    metadata:
      labels:
        app: database
    spec:
      containers:
      - name: postgres
        image: postgres:15
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
        - name: logs
          mountPath: /var/log/postgresql
```

## Dynamic Provisioning with Topology Constraints

Use topology-aware provisioning for multi-zone clusters:

```yaml
# Zone-specific StorageClasses
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: zonal-storage-us-east-1a
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  encrypted: "true"
volumeBindingMode: WaitForFirstConsumer
allowedTopologies:
- matchLabelExpressions:
  - key: topology.kubernetes.io/zone
    values:
    - us-east-1a
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: zonal-storage-us-east-1b
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  encrypted: "true"
volumeBindingMode: WaitForFirstConsumer
allowedTopologies:
- matchLabelExpressions:
  - key: topology.kubernetes.io/zone
    values:
    - us-east-1b
```

## Monitoring Dynamic Provisioning

Track provisioning activity across StorageClasses:

```bash
# List all PVs with their StorageClass
kubectl get pv -o custom-columns=\
NAME:.metadata.name,\
STORAGECLASS:.spec.storageClassName,\
CAPACITY:.spec.capacity.storage,\
STATUS:.status.phase

# Count volumes per StorageClass
kubectl get pv -o json | jq -r '.items[] | .spec.storageClassName' | sort | uniq -c

# Total provisioned storage per StorageClass
kubectl get pv -o json | jq -r '.items[] |
  select(.status.phase == "Bound") |
  "\(.spec.storageClassName) \(.spec.capacity.storage)"' |
  awk '{
    # Parse storage size (e.g., "10Gi" -> 10)
    size = $2
    gsub(/[^0-9]/, "", size)
    sum[$1] += size
  }
  END {
    for (sc in sum) print sc, sum[sc] "Gi"
  }'

# Find unbound PVCs
kubectl get pvc -A -o json | jq -r '.items[] |
  select(.status.phase != "Bound") |
  "\(.metadata.namespace)/\(.metadata.name): \(.spec.storageClassName)"'
```

## Troubleshooting Multiple StorageClasses

Common issues and solutions:

```bash
# 1. PVC stuck in Pending - Check provisioner
kubectl describe pvc <pvc-name>

# Look for events like:
# "Failed to provision volume: storageclass not found"

# Verify StorageClass exists
kubectl get storageclass <class-name>

# 2. Check provisioner logs
kubectl logs -n kube-system -l app=ebs-csi-controller --tail=100

# 3. Verify CSI driver is running
kubectl get csidrivers

# 4. Check node plugin is running on all nodes
kubectl get pods -n kube-system -l app=ebs-csi-node -o wide

# 5. Test provisioning manually
kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-provision
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: standard-ssd
  resources:
    requests:
      storage: 1Gi
EOF

# Watch for binding
kubectl get pvc test-provision -w

# Clean up test
kubectl delete pvc test-provision
```

## Cost Management with Multiple Classes

Implement policies to control storage costs:

```yaml
# ResourceQuota to limit expensive storage
apiVersion: v1
kind: ResourceQuota
metadata:
  name: storage-quota
  namespace: default
spec:
  hard:
    # Limit total fast storage
    fast-ssd.storageclass.storage.k8s.io/requests.storage: "500Gi"
    # Limit total standard storage
    standard-ssd.storageclass.storage.k8s.io/requests.storage: "2Ti"
    # Unlimited budget storage
  scopeSelector:
    matchExpressions:
    - operator: In
      scopeName: PriorityClass
      values: ["high", "medium"]
```

## Best Practices

1. **Set a default StorageClass** for convenience
2. **Use WaitForFirstConsumer** for zone-aware provisioning
3. **Enable allowVolumeExpansion** for flexibility
4. **Use Retain for production** data
5. **Tag resources** for cost tracking
6. **Document StorageClass purposes** for team clarity
7. **Monitor provisioning failures** and set up alerts
8. **Test each StorageClass** after creation

By implementing multiple StorageClasses with dynamic provisioning, you provide applications with flexible, self-service storage options that automatically match their performance, reliability, and cost requirements.
