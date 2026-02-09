# How to Schedule Pods with Volume Topology Constraints

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Storage, Topology

Description: Learn how to use volume topology constraints to ensure pods are scheduled in the same zone or region as their persistent volumes, optimizing performance and avoiding cross-zone data transfer costs.

---

Persistent volumes are created in specific availability zones. If a pod using a volume is scheduled in a different zone, it either won't work or will suffer from high latency and data transfer costs. Volume topology constraints solve this by ensuring pods land in the same topology domain as their storage.

## Volume Binding Modes

StorageClass has two volume binding modes:

- **Immediate**: Volume is provisioned immediately when PVC is created, potentially in the wrong zone
- **WaitForFirstConsumer**: Volume provisioning waits until a pod using the PVC is scheduled

Always use `WaitForFirstConsumer` for zone-aware volumes.

## Creating Topology-Aware StorageClass

Define a StorageClass with volume binding delay:

```yaml
# topology-aware-storage.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd-zonal
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp3
  iops: "3000"
  throughput: "125"
# Wait for pod to be scheduled before creating volume
volumeBindingMode: WaitForFirstConsumer
# Limit to specific zones
allowedTopologies:
- matchLabelExpressions:
  - key: topology.kubernetes.io/zone
    values:
    - us-east-1a
    - us-east-1b
    - us-east-1c
```

## Basic Pod with Volume Topology

Deploy a pod with zone-aware volume:

```yaml
# pod-with-volume.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: app-data
spec:
  accessModes:
  - ReadWriteOnce
  storageClassName: fast-ssd-zonal
  resources:
    requests:
      storage: 100Gi
---
apiVersion: v1
kind: Pod
metadata:
  name: app-with-storage
spec:
  containers:
  - name: app
    image: myapp:v1.0
    volumeMounts:
    - name: data
      mountPath: /data
    resources:
      requests:
        cpu: 1000m
        memory: 2Gi
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: app-data
```

The scheduler ensures the pod lands in a zone where the volume can be created.

## StatefulSet with Volume Topology

StatefulSets with volume templates automatically handle topology:

```yaml
# statefulset-with-volumes.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database
spec:
  serviceName: database
  replicas: 6
  selector:
    matchLabels:
      app: database
  template:
    metadata:
      labels:
        app: database
    spec:
      # Spread pods across zones
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: database
      containers:
      - name: postgres
        image: postgres:15
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            cpu: 2000m
            memory: 8Gi
  # Volumes automatically created in same zone as pod
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: fast-ssd-zonal
      resources:
        requests:
          storage: 500Gi
```

## Multi-Zone Deployment with Local Volumes

For applications needing local SSD performance:

```yaml
# local-storage-class.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: local-nvme
provisioner: kubernetes.io/no-provisioner
volumeBindingMode: WaitForFirstConsumer
---
# local-persistent-volumes.yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: local-pv-node1
spec:
  capacity:
    storage: 1Ti
  accessModes:
  - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: local-nvme
  local:
    path: /mnt/nvme0n1
  nodeAffinity:
    required:
      nodeSelectorTerms:
      - matchExpressions:
        - key: kubernetes.io/hostname
          operator: In
          values:
          - worker-node-1
        - key: topology.kubernetes.io/zone
          operator: In
          values:
          - us-east-1a
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: cache-cluster
spec:
  serviceName: cache
  replicas: 3
  selector:
    matchLabels:
      app: cache
  template:
    spec:
      containers:
      - name: redis
        image: redis:7.2
        volumeMounts:
        - name: data
          mountPath: /data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: local-nvme
      resources:
        requests:
          storage: 1Ti
```

## CSI Volume Topology

For CSI drivers with topology support:

```yaml
# csi-storage-class.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: csi-zonal-storage
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  encrypted: "true"
volumeBindingMode: WaitForFirstConsumer
allowedTopologies:
- matchLabelExpressions:
  - key: topology.ebs.csi.aws.com/zone
    values:
    - us-east-1a
    - us-east-1b
    - us-east-1c
```

## Volume Replication Across Zones

Use storage solutions with cross-zone replication:

```yaml
# replicated-storage-class.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: replicated-storage
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-ssd
  replication-type: regional-pd  # GCP regional persistent disk
volumeBindingMode: WaitForFirstConsumer
allowedTopologies:
- matchLabelExpressions:
  - key: topology.gke.io/zone
    values:
    - us-central1-a
    - us-central1-b
```

## Pod with Node and Volume Affinity

Combine node affinity with volume constraints:

```yaml
# combined-affinity.yaml
apiVersion: v1
kind: Pod
metadata:
  name: combined-app
spec:
  affinity:
    nodeAffinity:
      # Prefer specific zones
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        preference:
          matchExpressions:
          - key: topology.kubernetes.io/zone
            operator: In
            values:
            - us-east-1a
      # But must have SSD
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: node.kubernetes.io/instance-type
            operator: In
            values:
            - c5d.2xlarge
            - c5d.4xlarge
  containers:
  - name: app
    image: myapp:v1.0
    volumeMounts:
    - name: data
      mountPath: /data
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: app-data
```

## Monitoring Volume Topology

Check volume and pod placement:

```bash
# List PVs with their zones
kubectl get pv -o json | \
  jq -r '.items[] | {name: .metadata.name, zone: .metadata.labels["topology.kubernetes.io/zone"], node: .spec.nodeAffinity}'

# Check PVC binding status
kubectl get pvc --all-namespaces

# Verify pod is in same zone as volume
POD_NAME="database-0"
kubectl get pod $POD_NAME -o jsonpath='{.spec.nodeName}' | \
  xargs kubectl get node -o jsonpath='{.metadata.labels.topology\.kubernetes\.io/zone}'

# List volumes by zone
kubectl get pv -o json | \
  jq -r '.items[] | .metadata.labels["topology.kubernetes.io/zone"]' | \
  sort | uniq -c
```

## Handling Volume Expansion

Expand volumes while respecting topology:

```yaml
# expandable-storage-class.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: expandable-storage
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp3
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true  # Enable volume expansion
```

Expand a PVC:

```bash
# Edit PVC to increase size
kubectl edit pvc app-data

# Change storage request from 100Gi to 200Gi
spec:
  resources:
    requests:
      storage: 200Gi

# For StatefulSet volumes
kubectl patch pvc data-database-0 -p '{"spec":{"resources":{"requests":{"storage":"1Ti"}}}}'
```

## Volume Snapshot Topology

Create snapshots with topology awareness:

```yaml
# volume-snapshot-class.yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: csi-snapclass
driver: ebs.csi.aws.com
deletionPolicy: Delete
---
# volume-snapshot.yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: database-snapshot
spec:
  volumeSnapshotClassName: csi-snapclass
  source:
    persistentVolumeClaimName: data-database-0
---
# restore-from-snapshot.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: restored-data
spec:
  accessModes:
  - ReadWriteOnce
  storageClassName: fast-ssd-zonal
  dataSource:
    name: database-snapshot
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
  resources:
    requests:
      storage: 500Gi
```

## Best Practices

1. **Use WaitForFirstConsumer**: Always for zone-aware storage
2. **Specify AllowedTopologies**: Limit volume provisioning to appropriate zones
3. **Match Pod Topology**: Ensure pod spread constraints match volume topology
4. **Test Failover**: Validate behavior when zones fail
5. **Monitor Costs**: Track cross-zone data transfer
6. **Plan Capacity**: Ensure sufficient storage in each zone
7. **Use CSI Drivers**: Modern CSI drivers have better topology support
8. **Consider Replication**: Use replicated storage for critical data

## Troubleshooting

If pods are pending due to volume topology:

```bash
# Check PVC status
kubectl describe pvc app-data

# Common issues:
# - "waiting for first consumer to be created before binding"
#   This is normal for WaitForFirstConsumer

# - "no volume zone matches pod zone"
#   Pod scheduled in zone without volume support

# View volume binding events
kubectl get events --sort-by='.lastTimestamp' | grep -i volume

# Check storage class configuration
kubectl describe storageclass fast-ssd-zonal

# Verify allowed topologies
kubectl get storageclass fast-ssd-zonal -o jsonpath='{.allowedTopologies}' | jq
```

If pod and volume are in different zones:

```bash
# This shouldn't happen with WaitForFirstConsumer
# But if it does, check the volume's node affinity
kubectl get pv <pv-name> -o jsonpath='{.spec.nodeAffinity}' | jq

# And compare with pod's node
kubectl get pod <pod-name> -o jsonpath='{.spec.nodeName}' | \
  xargs kubectl get node -o jsonpath='{.metadata.labels}'
```

Volume topology constraints are essential for zone-aware storage in Kubernetes. By using WaitForFirstConsumer binding mode and proper topology configurations, you ensure pods are always scheduled in the same zone as their storage, optimizing performance and minimizing costs.

