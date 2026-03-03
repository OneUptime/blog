# How to Reduce Storage Costs on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Storage Costs, Kubernetes, Persistent Volume, Cost Optimization, Storage Management

Description: Practical strategies for reducing persistent storage costs on Talos Linux clusters without compromising data availability or performance.

---

Storage is often the second-largest cost item in Kubernetes clusters after compute. The problem is that storage costs tend to creep up over time because volumes are provisioned but rarely reclaimed, developers request premium storage tiers for workloads that do not need them, and nobody regularly audits what is actually being used. On Talos Linux clusters, the OS itself uses very little disk space, but the workloads running on top can still accumulate significant storage costs.

This guide covers practical strategies for identifying and reducing storage waste on Talos Linux.

## Understanding Storage Costs

Storage costs in Kubernetes come from several sources:

- **Persistent Volumes (PVs)**: The biggest cost driver, especially when using premium SSD tiers
- **Container images**: Each node stores pulled images locally
- **Ephemeral storage**: Temporary storage used by pods for logs and caches
- **etcd storage**: The Kubernetes state database on control plane nodes
- **Backup storage**: Snapshots and backup copies of persistent data

On cloud providers, you pay for provisioned capacity, not actual usage. A 100GB volume that only uses 10GB still costs the same as a full 100GB volume.

## Auditing Current Storage Usage

Start by understanding what you have:

```bash
# List all persistent volume claims with their sizes and status
kubectl get pvc -A -o custom-columns=\
NAMESPACE:.metadata.namespace,\
NAME:.metadata.name,\
STATUS:.status.phase,\
SIZE:.spec.resources.requests.storage,\
STORAGECLASS:.spec.storageClassName,\
VOLUME:.spec.volumeName

# Find PVCs that are not bound to any pod
kubectl get pvc -A -o json | jq '
  .items[] |
  select(.status.phase == "Bound") |
  {
    namespace: .metadata.namespace,
    name: .metadata.name,
    size: .spec.resources.requests.storage,
    storageClass: .spec.storageClassName
  }'

# Check actual disk usage inside pods
kubectl exec -n database my-postgres-0 -- df -h /var/lib/postgresql/data
```

## Strategy 1: Use the Right Storage Class

Not every workload needs high-performance SSD storage. Create tiered storage classes:

```yaml
# storage-class-standard.yaml
# Cost-effective storage for non-performance-critical workloads
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: standard
  annotations:
    storageclass.kubernetes.io/is-default-class: "false"
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "3000"
  throughput: "125"
reclaimPolicy: Delete
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer

---
# storage-class-cold.yaml
# Cheap storage for archives and infrequently accessed data
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: cold-storage
provisioner: ebs.csi.aws.com
parameters:
  type: sc1  # Cold HDD - cheapest option
reclaimPolicy: Delete
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer

---
# storage-class-performance.yaml
# High-performance storage only for workloads that need it
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: performance
provisioner: ebs.csi.aws.com
parameters:
  type: io2
  iops: "10000"
reclaimPolicy: Retain
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

Set the cost-effective tier as the default:

```bash
# Set the standard storage class as default
kubectl patch storageclass standard \
  -p '{"metadata": {"annotations": {"storageclass.kubernetes.io/is-default-class": "true"}}}'
```

## Strategy 2: Right-Size Persistent Volumes

Many PVCs are over-provisioned because developers estimate generously during initial setup:

```bash
# Check actual usage versus provisioned size
# Run this across all namespaces with PVCs
for ns in $(kubectl get pvc -A --no-headers | awk '{print $1}' | sort -u); do
  for pvc in $(kubectl get pvc -n $ns --no-headers | awk '{print $1}'); do
    pod=$(kubectl get pods -n $ns -o json | \
      jq -r ".items[] | select(.spec.volumes[]?.persistentVolumeClaim.claimName == \"$pvc\") | .metadata.name" | head -1)
    if [ -n "$pod" ]; then
      echo "Namespace: $ns, PVC: $pvc"
      kubectl exec -n $ns $pod -- df -h 2>/dev/null | grep -E "^/dev"
    fi
  done
done
```

Since most storage classes support volume expansion, start small and grow as needed:

```yaml
# Start with a smaller volume and expand later
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: app-data
  namespace: production
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: standard
  resources:
    requests:
      storage: 10Gi  # Start small instead of 100Gi
```

To expand a volume later:

```bash
# Expand a PVC from 10Gi to 50Gi (no downtime on most providers)
kubectl patch pvc app-data -n production \
  -p '{"spec": {"resources": {"requests": {"storage": "50Gi"}}}}'
```

## Strategy 3: Clean Up Unused Volumes

Find and remove orphaned persistent volumes:

```bash
# Find PVs in Released state (PVC was deleted but PV remains)
kubectl get pv -o json | jq '
  .items[] |
  select(.status.phase == "Released") |
  {
    name: .metadata.name,
    size: .spec.capacity.storage,
    storageClass: .spec.storageClassName,
    reclaimPolicy: .spec.persistentVolumeReclaimPolicy
  }'

# Find PVCs not mounted by any running pod
comm -23 \
  <(kubectl get pvc -A --no-headers | awk '{print $1"/"$2}' | sort) \
  <(kubectl get pods -A -o json | jq -r '
    .items[] |
    .metadata.namespace as $ns |
    .spec.volumes[]? |
    select(.persistentVolumeClaim != null) |
    $ns + "/" + .persistentVolumeClaim.claimName
  ' | sort -u)
```

Set up automated cleanup with a CronJob:

```yaml
# pv-cleanup-cronjob.yaml
# Weekly check for orphaned persistent volumes
apiVersion: batch/v1
kind: CronJob
metadata:
  name: pv-audit
  namespace: kube-system
spec:
  schedule: "0 9 * * 1"  # Every Monday at 9 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: pv-auditor
          containers:
            - name: auditor
              image: bitnami/kubectl:latest
              command:
                - /bin/sh
                - -c
                - |
                  echo "=== Orphaned PV Report ==="
                  echo "Released PVs:"
                  kubectl get pv -o json | jq -r '
                    .items[] |
                    select(.status.phase == "Released") |
                    "  \(.metadata.name) - \(.spec.capacity.storage)"'
                  echo ""
                  echo "Unbound PVCs older than 7 days:"
                  kubectl get pvc -A -o json | jq -r '
                    .items[] |
                    select(.status.phase == "Pending") |
                    "  \(.metadata.namespace)/\(.metadata.name) - \(.spec.resources.requests.storage)"'
          restartPolicy: OnFailure
```

## Strategy 4: Implement Data Lifecycle Policies

Move old data to cheaper storage or delete it:

```yaml
# Use an init container to archive old data before the main app starts
apiVersion: apps/v1
kind: Deployment
metadata:
  name: log-processor
spec:
  template:
    spec:
      initContainers:
        - name: archive-old-logs
          image: alpine:latest
          command:
            - /bin/sh
            - -c
            - |
              # Move logs older than 30 days to cold storage
              find /data/logs -mtime +30 -name "*.log" \
                -exec mv {} /archive/ \;
              # Delete logs older than 90 days
              find /archive -mtime +90 -name "*.log" -delete
          volumeMounts:
            - name: log-data
              mountPath: /data/logs
            - name: archive-data
              mountPath: /archive
      volumes:
        - name: log-data
          persistentVolumeClaim:
            claimName: log-data-fast  # SSD storage
        - name: archive-data
          persistentVolumeClaim:
            claimName: log-archive-cold  # HDD storage
```

## Strategy 5: Optimize Container Image Storage

Container images consume local disk space on each node. Reduce this by:

```yaml
# Configure Talos garbage collection for unused images
machine:
  kubelet:
    extraArgs:
      # Start garbage collection when disk is 80% full
      image-gc-high-threshold: "80"
      # Stop garbage collection when disk drops to 70%
      image-gc-low-threshold: "70"
      # Minimum age before an image can be garbage collected
      minimum-image-ttl-duration: "24h"
```

Use smaller base images to reduce pull times and storage:

```dockerfile
# Use distroless or alpine instead of full Ubuntu/Debian
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=builder /app/binary /app/binary
ENTRYPOINT ["/app/binary"]
```

## Strategy 6: Use CSI Snapshots for Backups

Snapshots are more cost-effective than full volume clones:

```yaml
# volume-snapshot.yaml
# Create a snapshot instead of a full backup copy
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: database-snapshot-daily
  namespace: production
spec:
  volumeSnapshotClassName: csi-aws-ebs-snapshots
  source:
    persistentVolumeClaimName: database-data
```

## Summary

Storage cost optimization on Talos Linux requires ongoing attention. Start by auditing what you have - you will almost certainly find orphaned volumes, over-provisioned PVCs, and workloads using premium storage tiers unnecessarily. Implement tiered storage classes, right-size your volumes, clean up unused resources, and set up automated auditing to catch waste early. On Talos Linux, the OS itself is lean with storage, so your focus should be entirely on workload-level optimization. Even modest improvements - switching from io2 to gp3 storage or reclaiming orphaned volumes - can save hundreds of dollars per month in a mid-sized cluster.
