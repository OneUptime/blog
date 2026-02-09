# How to Set Up Local Persistent Volumes with Node Affinity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Storage, LocalVolume, NodeAffinity

Description: Learn how to configure local persistent volumes in Kubernetes with node affinity constraints, leveraging fast local disks like NVMe and SSD for high-performance stateful workloads while managing pod placement correctly.

---

Local persistent volumes provide access to local storage devices like NVMe SSDs, offering significantly better performance than network-attached storage. However, they require careful pod placement using node affinity to ensure pods run on nodes where their data resides.

## Understanding Local Persistent Volumes

Local volumes differ from network storage in key ways:

1. **Node-local** - Data exists only on one node
2. **No replication** - Application must handle data redundancy
3. **Higher performance** - Direct access to local disks
4. **Pod affinity required** - Pods must run where data lives

Use cases for local volumes:

- High-IOPS databases (Cassandra, ScyllaDB)
- In-memory databases with persistence (Redis)
- Distributed storage systems (Ceph, MinIO)
- ML training with large datasets

## Prerequisites

Identify nodes with local storage:

```bash
# List nodes
kubectl get nodes

# Check node storage
kubectl describe node <node-name> | grep -A 10 "Capacity:"

# SSH to a node and check local disks
ssh user@node-hostname
lsblk

# Example output showing NVMe drives:
# NAME        SIZE TYPE MOUNTPOINT
# nvme0n1     1.8T disk
# nvme1n1     1.8T disk
# nvme2n1     1.8T disk
```

## Creating Local Persistent Volumes Manually

First, prepare the local disk on each node:

```bash
# SSH to the node
ssh user@node1

# Create mount point directory
sudo mkdir -p /mnt/local-ssd-1

# Format the disk (if needed)
sudo mkfs.ext4 /dev/nvme1n1

# Mount the disk
sudo mount /dev/nvme1n1 /mnt/local-ssd-1

# Make mount permanent
echo '/dev/nvme1n1 /mnt/local-ssd-1 ext4 defaults 0 0' | sudo tee -a /etc/fstab

# Create a directory for the volume
sudo mkdir -p /mnt/local-ssd-1/vol1
sudo chmod 777 /mnt/local-ssd-1/vol1
```

Create a StorageClass for local volumes:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: local-storage
provisioner: kubernetes.io/no-provisioner
volumeBindingMode: WaitForFirstConsumer
reclaimPolicy: Delete
```

Note: `kubernetes.io/no-provisioner` means no dynamic provisioning. Volumes must be created manually.

Create a PersistentVolume for the local disk:

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: local-pv-node1-nvme1
spec:
  capacity:
    storage: 100Gi
  volumeMode: Filesystem
  accessModes:
  - ReadWriteOnce
  persistentVolumeReclaimPolicy: Delete
  storageClassName: local-storage
  local:
    path: /mnt/local-ssd-1/vol1
  nodeAffinity:
    required:
      nodeSelectorTerms:
      - matchExpressions:
        - key: kubernetes.io/hostname
          operator: In
          values:
          - node1  # Replace with actual node name
```

Apply the resources:

```bash
kubectl apply -f storageclass.yaml
kubectl apply -f local-pv.yaml

# Verify the PV
kubectl get pv local-pv-node1-nvme1
kubectl describe pv local-pv-node1-nvme1
```

## Creating a PVC for Local Storage

Create a PersistentVolumeClaim:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: local-storage-claim
spec:
  accessModes:
  - ReadWriteOnce
  storageClassName: local-storage
  resources:
    requests:
      storage: 100Gi
```

Apply and verify:

```bash
kubectl apply -f local-pvc.yaml

# Check binding
kubectl get pvc local-storage-claim

# Should show "Pending" until a pod uses it
# (due to WaitForFirstConsumer binding mode)
```

## Using Local Volumes in Pods

Create a pod that uses the local volume:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: database-pod
spec:
  containers:
  - name: postgres
    image: postgres:15
    env:
    - name: POSTGRES_PASSWORD
      value: "password"
    - name: PGDATA
      value: /var/lib/postgresql/data/pgdata
    ports:
    - containerPort: 5432
    volumeMounts:
    - name: local-storage
      mountPath: /var/lib/postgresql/data
  volumes:
  - name: local-storage
    persistentVolumeClaim:
      claimName: local-storage-claim
```

Deploy and verify:

```bash
kubectl apply -f database-pod.yaml

# Wait for pod to be scheduled
kubectl get pod database-pod -w

# Verify pod is on the correct node
kubectl get pod database-pod -o wide

# Should show the node where the PV exists

# Check PVC is now bound
kubectl get pvc local-storage-claim
# STATUS should be "Bound"
```

## Using Local Volumes with StatefulSets

For distributed databases, use StatefulSets with local volumes:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: cassandra
  labels:
    app: cassandra
spec:
  ports:
  - port: 9042
  clusterIP: None
  selector:
    app: cassandra
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: cassandra
spec:
  serviceName: cassandra
  replicas: 3
  selector:
    matchLabels:
      app: cassandra
  template:
    metadata:
      labels:
        app: cassandra
    spec:
      containers:
      - name: cassandra
        image: cassandra:4.1
        ports:
        - containerPort: 7000
          name: intra-node
        - containerPort: 7001
          name: tls-intra-node
        - containerPort: 7199
          name: jmx
        - containerPort: 9042
          name: cql
        volumeMounts:
        - name: cassandra-data
          mountPath: /var/lib/cassandra
        env:
        - name: CASSANDRA_SEEDS
          value: "cassandra-0.cassandra.default.svc.cluster.local"
        - name: MAX_HEAP_SIZE
          value: "512M"
        - name: HEAP_NEWSIZE
          value: "100M"
  # Do not use volumeClaimTemplates with local storage
  # Instead, create PVCs manually for each replica
```

Create PVs for each StatefulSet replica:

```yaml
# Node 1 - PV for cassandra-0
apiVersion: v1
kind: PersistentVolume
metadata:
  name: local-pv-node1
spec:
  capacity:
    storage: 500Gi
  volumeMode: Filesystem
  accessModes:
  - ReadWriteOnce
  persistentVolumeReclaimPolicy: Delete
  storageClassName: local-storage
  local:
    path: /mnt/local-ssd-1
  nodeAffinity:
    required:
      nodeSelectorTerms:
      - matchExpressions:
        - key: kubernetes.io/hostname
          operator: In
          values:
          - node1
---
# Node 2 - PV for cassandra-1
apiVersion: v1
kind: PersistentVolume
metadata:
  name: local-pv-node2
spec:
  capacity:
    storage: 500Gi
  volumeMode: Filesystem
  accessModes:
  - ReadWriteOnce
  persistentVolumeReclaimPolicy: Delete
  storageClassName: local-storage
  local:
    path: /mnt/local-ssd-1
  nodeAffinity:
    required:
      nodeSelectorTerms:
      - matchExpressions:
        - key: kubernetes.io/hostname
          operator: In
          values:
          - node2
---
# Node 3 - PV for cassandra-2
apiVersion: v1
kind: PersistentVolume
metadata:
  name: local-pv-node3
spec:
  capacity:
    storage: 500Gi
  volumeMode: Filesystem
  accessModes:
  - ReadWriteOnce
  persistentVolumeReclaimPolicy: Delete
  storageClassName: local-storage
  local:
    path: /mnt/local-ssd-1
  nodeAffinity:
    required:
      nodeSelectorTerms:
      - matchExpressions:
        - key: kubernetes.io/hostname
          operator: In
          values:
          - node3
```

## Using Local Volume Static Provisioner

For easier management, use the local volume static provisioner:

```bash
# Install the local volume provisioner
kubectl apply -f https://raw.githubusercontent.com/kubernetes-sigs/sig-storage-local-static-provisioner/master/deployment/kubernetes/example/default_example_provisioner_generated.yaml

# Or using Helm
helm repo add sig-storage-local-static-provisioner \
  https://kubernetes-sigs.github.io/sig-storage-local-static-provisioner

helm install local-static-provisioner \
  sig-storage-local-static-provisioner/local-static-provisioner \
  --set classes[0].name=fast-disks \
  --set classes[0].hostDir=/mnt/fast-disks \
  --set classes[0].volumeMode=Filesystem
```

Create a configuration for the provisioner:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: local-provisioner-config
  namespace: default
data:
  storageClassMap: |
    fast-disks:
      hostDir: /mnt/fast-disks
      mountDir: /mnt/fast-disks
      blockCleanerCommand:
        - "/scripts/shred.sh"
        - "2"
      volumeMode: Filesystem
      fsType: ext4
```

On each node, create discovery directories:

```bash
# SSH to each node
ssh user@node

# Create discovery directory
sudo mkdir -p /mnt/fast-disks

# Create a directory for each volume
sudo mkdir -p /mnt/fast-disks/vol1
sudo mkdir -p /mnt/fast-disks/vol2
sudo mkdir -p /mnt/fast-disks/vol3

# The provisioner will discover these and create PVs automatically
```

## Performance Testing

Test local volume performance:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: disk-benchmark
spec:
  containers:
  - name: fio
    image: dmonakhov/alpine-fio
    command:
    - fio
    - --name=random-write
    - --ioengine=libaio
    - --iodepth=32
    - --rw=randwrite
    - --bs=4k
    - --size=10G
    - --numjobs=4
    - --runtime=60
    - --time_based
    - --directory=/data
    - --group_reporting
    volumeMounts:
    - name: test-volume
      mountPath: /data
  volumes:
  - name: test-volume
    persistentVolumeClaim:
      claimName: local-storage-claim
  restartPolicy: Never
```

Run the benchmark:

```bash
kubectl apply -f benchmark.yaml

# Wait for completion
kubectl wait --for=condition=Ready pod/disk-benchmark --timeout=300s

# View results
kubectl logs disk-benchmark
```

## Handling Node Failures

Local volumes don't survive node failures. Implement proper backup strategies:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: backup-local-volume
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: restic/restic:latest
            command:
            - /bin/sh
            - -c
            - |
              # Backup local volume to S3
              restic -r s3:s3.amazonaws.com/my-backup-bucket backup /data
            volumeMounts:
            - name: data
              mountPath: /data
              readOnly: true
            env:
            - name: AWS_ACCESS_KEY_ID
              valueFrom:
                secretKeyRef:
                  name: aws-credentials
                  key: access-key-id
            - name: AWS_SECRET_ACCESS_KEY
              valueFrom:
                secretKeyRef:
                  name: aws-credentials
                  key: secret-access-key
            - name: RESTIC_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: restic-secret
                  key: password
          volumes:
          - name: data
            persistentVolumeClaim:
              claimName: local-storage-claim
          restartPolicy: OnFailure
```

## Monitoring Local Volumes

Track local volume usage and health:

```bash
# List all local PVs
kubectl get pv -o json | jq -r '.items[] |
  select(.spec.local != null) |
  "\(.metadata.name): \(.spec.local.path) on node \(.spec.nodeAffinity.required.nodeSelectorTerms[0].matchExpressions[0].values[0])"'

# Check disk usage on nodes
kubectl get nodes -o json | jq -r '.items[] | .metadata.name' | while read node; do
  echo "Node: $node"
  kubectl debug node/$node -it --image=alpine -- df -h
done

# Monitor PVC binding issues
kubectl get events --field-selector reason=FailedBinding
```

## Best Practices

1. **Use WaitForFirstConsumer** binding mode for local volumes
2. **Label nodes** with storage capabilities for easier selection
3. **Implement backups** since local volumes don't replicate
4. **Use distributed applications** that handle data redundancy
5. **Monitor disk health** with node monitoring tools
6. **Plan for node failures** with proper disaster recovery
7. **Use local volumes** only when performance justifies the complexity
8. **Document node topology** and volume locations for operations

Local persistent volumes provide exceptional performance for stateful workloads, but require careful planning around pod placement, data redundancy, and disaster recovery to use effectively in production.
