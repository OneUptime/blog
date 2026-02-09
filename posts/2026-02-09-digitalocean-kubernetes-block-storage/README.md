# How to Configure DigitalOcean Kubernetes (DOKS) with Block Storage CSI Driver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DigitalOcean, DOKS, Storage, CSI

Description: Learn how to configure and use DigitalOcean Block Storage with the CSI driver in DOKS clusters for persistent storage, snapshots, volume expansion, and multi-attach capabilities.

---

DigitalOcean Kubernetes (DOKS) includes a Container Storage Interface (CSI) driver for Block Storage volumes. This driver enables dynamic provisioning of persistent volumes, volume snapshots, online expansion, and ReadWriteMany access modes. Understanding the CSI driver capabilities helps optimize storage for stateful applications in DOKS clusters.

## Understanding DigitalOcean Block Storage

DigitalOcean Block Storage provides SSD-backed network volumes that attach to Droplets and Kubernetes nodes. Volumes persist independently of cluster nodes, surviving pod and node failures. They support sizes from 1GB to 16TB and provide consistent performance based on volume size.

The CSI driver automatically handles volume lifecycle: creating volumes when PersistentVolumeClaims are bound, attaching volumes to nodes running pods, mounting volumes into pod filesystems, and cleaning up when volumes are deleted.

Block Storage volumes are regional resources. They must be in the same datacenter region as the cluster. Cross-region volume access is not supported.

## Verifying CSI Driver Installation

DOKS clusters include the CSI driver by default. Verify installation:

```bash
# Check CSI driver pods
kubectl get pods -n kube-system -l app.kubernetes.io/name=csi-do

# View CSI driver version
kubectl get daemonset -n kube-system csi-do-node \
  -o jsonpath='{.spec.template.spec.containers[0].image}'

# Check storage classes
kubectl get storageclass
```

The default StorageClass is do-block-storage, which creates standard SSD volumes.

Inspect the storage class configuration:

```bash
kubectl describe storageclass do-block-storage
```

The output shows provisioner, reclaim policy, and volume binding mode. The default reclaim policy is Delete, meaning volumes are deleted when PVCs are removed.

## Creating Persistent Volume Claims

Request persistent storage with a PersistentVolumeClaim:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: database-storage
  namespace: production
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: do-block-storage
```

Apply and verify:

```bash
kubectl apply -f pvc.yaml

# Check PVC status
kubectl get pvc -n production

# View bound volume
kubectl get pv
```

The CSI driver creates a DigitalOcean Block Storage volume and binds it to the PVC. Check the volume in DigitalOcean:

```bash
# Install doctl CLI
snap install doctl
doctl auth init

# List Block Storage volumes
doctl compute volume list
```

Use the volume in a pod:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: database
  namespace: production
spec:
  containers:
  - name: postgres
    image: postgres:15
    env:
    - name: POSTGRES_PASSWORD
      value: secretpassword
    volumeMounts:
    - name: data
      mountPath: /var/lib/postgresql/data
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: database-storage
```

The pod mounts the volume at the specified path. Data written to /var/lib/postgresql/data persists across pod restarts.

## Using StatefulSets with Dynamic Provisioning

StatefulSets automatically create PVCs for each replica:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mongodb
  namespace: production
spec:
  serviceName: mongodb
  replicas: 3
  selector:
    matchLabels:
      app: mongodb
  template:
    metadata:
      labels:
        app: mongodb
    spec:
      containers:
      - name: mongodb
        image: mongo:6.0
        ports:
        - containerPort: 27017
        volumeMounts:
        - name: data
          mountPath: /data/db
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes:
      - ReadWriteOnce
      resources:
        requests:
          storage: 20Gi
      storageClassName: do-block-storage
```

Apply the StatefulSet:

```bash
kubectl apply -f statefulset.yaml

# Watch PVCs being created
kubectl get pvc -n production -w

# Verify each pod has its own volume
kubectl get pvc -n production -l app=mongodb
```

Each replica gets a dedicated volume (data-mongodb-0, data-mongodb-1, data-mongodb-2). Volumes persist even if the StatefulSet is scaled down.

## Expanding Volumes Online

Expand volumes without downtime using volume expansion:

```bash
# Check if storage class allows expansion
kubectl get storageclass do-block-storage \
  -o jsonpath='{.allowVolumeExpansion}'
```

If false, patch the storage class:

```bash
kubectl patch storageclass do-block-storage \
  -p '{"allowVolumeExpansion": true}'
```

Expand a PVC:

```yaml
# Edit the PVC
kubectl edit pvc database-storage -n production

# Change storage size from 10Gi to 20Gi
spec:
  resources:
    requests:
      storage: 20Gi
```

Or use kubectl patch:

```bash
kubectl patch pvc database-storage -n production \
  -p '{"spec": {"resources": {"requests": {"storage": "20Gi"}}}}'
```

Monitor the expansion:

```bash
# Watch PVC status
kubectl get pvc database-storage -n production -w

# Check events
kubectl describe pvc database-storage -n production
```

The CSI driver expands the DigitalOcean volume and resizes the filesystem. The pod continues running during expansion.

## Creating Volume Snapshots

Snapshot volumes for backups and disaster recovery:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: database-snapshot-20260209
  namespace: production
spec:
  volumeSnapshotClassName: do-block-storage
  source:
    persistentVolumeClaimName: database-storage
```

Apply and verify:

```bash
kubectl apply -f snapshot.yaml

# Check snapshot status
kubectl get volumesnapshot -n production

# View snapshot details
kubectl describe volumesnapshot database-snapshot-20260209 -n production
```

The snapshot creates a point-in-time copy of the volume. Snapshots are stored separately from the cluster and persist even if the cluster is deleted.

List snapshots in DigitalOcean:

```bash
doctl compute volume-snapshot list
```

Restore from a snapshot:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: database-restored
  namespace: production
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi
  storageClassName: do-block-storage
  dataSource:
    name: database-snapshot-20260209
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
```

This creates a new volume populated with data from the snapshot.

## Implementing Automated Snapshot Schedules

Use snapshot schedules for regular backups:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: do-block-storage
driver: dobs.csi.digitalocean.com
deletionPolicy: Retain
parameters:
  snapshots.storage.k8s.io/deletion-policy: Retain
```

Create a CronJob for scheduled snapshots:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: database-backup
  namespace: production
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: snapshot-creator
          containers:
          - name: snapshot
            image: bitnami/kubectl:latest
            command:
            - /bin/sh
            - -c
            - |
              SNAPSHOT_NAME="database-snapshot-$(date +%Y%m%d-%H%M%S)"
              cat <<EOF | kubectl apply -f -
              apiVersion: snapshot.storage.k8s.io/v1
              kind: VolumeSnapshot
              metadata:
                name: $SNAPSHOT_NAME
                namespace: production
              spec:
                volumeSnapshotClassName: do-block-storage
                source:
                  persistentVolumeClaimName: database-storage
              EOF
          restartPolicy: OnFailure
```

Create the service account with necessary permissions:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: snapshot-creator
  namespace: production
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: snapshot-creator
  namespace: production
rules:
- apiGroups: ["snapshot.storage.k8s.io"]
  resources: ["volumesnapshots"]
  verbs: ["create", "get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: snapshot-creator
  namespace: production
subjects:
- kind: ServiceAccount
  name: snapshot-creator
roleRef:
  kind: Role
  name: snapshot-creator
  apiGroup: rbac.authorization.k8s.io
```

## Configuring Custom Storage Classes

Create storage classes with custom settings:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-storage
provisioner: dobs.csi.digitalocean.com
parameters:
  # No custom parameters available for DO Block Storage
allowVolumeExpansion: true
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
```

The Retain reclaim policy prevents volume deletion when PVCs are removed. WaitForFirstConsumer delays volume creation until a pod is scheduled, ensuring the volume is created in the correct zone.

Use the custom storage class:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: important-data
  namespace: production
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
  storageClassName: fast-storage
```

## Monitoring Storage Performance

Track volume performance metrics:

```bash
# Install metrics-server if not present
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Check volume usage
kubectl exec -n production database -- df -h /var/lib/postgresql/data

# Monitor I/O performance
kubectl exec -n production database -- iostat -x 1 5
```

For detailed monitoring, deploy Prometheus and collect CSI metrics:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: csi-do-controller-metrics
  namespace: kube-system
  labels:
    app: csi-do-controller
spec:
  ports:
  - name: metrics
    port: 9808
    targetPort: 9808
  selector:
    app: csi-do-controller
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: csi-do-controller
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: csi-do-controller
  endpoints:
  - port: metrics
```

Query volume metrics in Prometheus:

```promql
# Volume attachment time
kubelet_csi_operations_seconds{operation_name="volume_attach"}

# Volume provisioning errors
kubelet_csi_operations_errors_total{operation_name="volume_provision"}
```

## Troubleshooting Storage Issues

Common issues include attachment failures and mount errors.

Check volume attachment status:

```bash
# List attached volumes
doctl compute volume list --format ID,Name,DropletIDs

# Check CSI driver logs
kubectl logs -n kube-system -l app.kubernetes.io/name=csi-do --tail=100

# Verify volume exists
kubectl get pv -o yaml | grep volumeHandle
```

If a pod fails to start due to volume attachment:

```bash
# Describe pod to see events
kubectl describe pod database -n production

# Check node attachment limit (DigitalOcean supports 7 volumes per node)
kubectl get pods -o json | jq '.items[] | select(.spec.nodeName=="<node>") | .spec.volumes[] | select(.persistentVolumeClaim) | .persistentVolumeClaim.claimName'
```

Force detach stuck volumes:

```bash
# Delete the pod
kubectl delete pod database -n production --force --grace-period=0

# Detach volume manually
doctl compute volume-action detach <volume-id> <droplet-id>
```

Debug mount failures:

```bash
# Check volume mount logs on node
kubectl get pod database -n production -o jsonpath='{.spec.nodeName}'

# SSH to node and check mounts
mount | grep /var/lib/kubelet/pods
dmesg | grep volume
```

DigitalOcean Block Storage with the CSI driver provides reliable persistent storage for DOKS clusters. The driver handles provisioning, attachment, and lifecycle management automatically, simplifying storage operations for stateful applications.
