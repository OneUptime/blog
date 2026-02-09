# How to Configure Velero Restic Integration for File-Level Backup of Persistent Volumes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Velero, Restic, Kubernetes, Backup, Persistent Volumes

Description: Learn how to configure Velero with Restic for file-level backup of persistent volumes in Kubernetes. Complete guide covering installation, configuration, and optimization techniques.

---

While volume snapshots provide fast backups through storage system integration, they have limitations when working with cloud providers that don't support snapshots or when you need to move data between different storage systems. Velero's Restic integration solves these challenges by performing file-level backups directly from mounted volumes, creating portable backups that work across any storage backend. This approach offers universal compatibility at the cost of slightly longer backup times.

## Understanding Restic File-Level Backups

Restic is an open-source backup program that creates encrypted, deduplicated backups. When integrated with Velero, Restic runs as a DaemonSet on every node, backing up pod volume data by reading files directly from mounted volumes. This file-level approach works with any volume type including NFS, HostPath, EBS, Azure Disk, and others.

Unlike snapshot-based backups that rely on storage driver capabilities, Restic backups are storage-agnostic. You can back up volumes from one storage system and restore them to completely different infrastructure, making Restic ideal for disaster recovery scenarios and cross-cloud migrations.

## Installing Velero with Restic Support

Install Velero with the Restic DaemonSet enabled:

```bash
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.9.0 \
  --bucket my-velero-backups \
  --backup-location-config region=us-east-1 \
  --use-node-agent \
  --secret-file ./credentials-velero
```

The `--use-node-agent` flag deploys the node-agent DaemonSet (formerly called Restic) that performs file-level backups.

Verify the node-agent pods are running:

```bash
kubectl get pods -n velero -l name=node-agent

# Should show one pod per node
kubectl get daemonset -n velero node-agent
```

## Annotating Pods for Restic Backup

Velero doesn't automatically back up volumes with Restic. You must explicitly opt-in by annotating pods:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-app
  namespace: production
  annotations:
    # Back up all volumes in this pod
    backup.velero.io/backup-volumes: data-volume,config-volume
spec:
  containers:
  - name: app
    image: myapp:latest
    volumeMounts:
    - name: data-volume
      mountPath: /data
    - name: config-volume
      mountPath: /config
  volumes:
  - name: data-volume
    persistentVolumeClaim:
      claimName: app-data-pvc
  - name: config-volume
    configMap:
      name: app-config
```

The annotation `backup.velero.io/backup-volumes` lists which volumes to back up using file-level backup.

For Deployments, add the annotation to the pod template:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
      annotations:
        backup.velero.io/backup-volumes: data-volume
    spec:
      containers:
      - name: app
        image: myapp:latest
        volumeMounts:
        - name: data-volume
          mountPath: /data
      volumes:
      - name: data-volume
        persistentVolumeClaim:
          claimName: app-data-pvc
```

## Creating Backups with File-Level Volume Backup

Once pods are annotated, create backups normally:

```bash
# Create backup including file-level volume data
velero backup create restic-backup \
  --include-namespaces production \
  --default-volumes-to-fs-backup=false \
  --wait
```

The `--default-volumes-to-fs-backup=false` flag means only annotated volumes are backed up using file-level backup.

To backup all volumes by default:

```bash
velero backup create restic-backup-all \
  --include-namespaces production \
  --default-volumes-to-fs-backup=true \
  --wait
```

This backs up all volumes without requiring pod annotations.

## Monitoring File-Level Backup Progress

Track backup progress and identify issues:

```bash
# Get backup status
velero backup describe restic-backup

# Check node-agent pod logs
kubectl logs -n velero -l name=node-agent

# View detailed backup logs
velero backup logs restic-backup
```

File-level backups take longer than snapshots. Monitor progress:

```bash
# Watch backup status
watch velero backup get restic-backup

# Check backup phase
kubectl get backup restic-backup -n velero -o jsonpath='{.status.phase}'
```

## Configuring Restic Resource Limits

Node-agent pods consume CPU and memory during backups. Configure appropriate resource limits:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-agent
  namespace: velero
spec:
  template:
    spec:
      containers:
      - name: node-agent
        image: velero/velero:v1.12.0
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
```

Adjust these values based on your volume sizes and backup frequency.

## Optimizing Backup Performance

Several factors affect file-level backup performance:

**1. Exclude unnecessary files:**

```bash
# Create backup excluding temporary files
velero backup create optimized-backup \
  --include-namespaces production \
  --default-volumes-to-fs-backup=true \
  --exclude-resources='events,pods/log' \
  --wait
```

**2. Configure concurrent uploads:**

Increase parallelism by setting environment variables:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-agent
  namespace: velero
spec:
  template:
    spec:
      containers:
      - name: node-agent
        env:
        # Increase concurrent file uploads
        - name: VELERO_RESTIC_TIMEOUT
          value: "4h"
        # Set upload parallelism
        - name: GOMAXPROCS
          value: "4"
```

**3. Schedule backups during off-peak hours:**

```yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: nightly-restic-backup
  namespace: velero
spec:
  # Run at 2 AM when load is low
  schedule: "0 2 * * *"
  template:
    ttl: 168h
    includedNamespaces:
    - production
    defaultVolumesToFsBackup: true
```

## Restoring File-Level Backups

Restore volumes backed up with file-level backup:

```bash
# Restore entire backup
velero restore create --from-backup restic-backup --wait

# Restore to different namespace
velero restore create --from-backup restic-backup \
  --namespace-mappings production:production-restore \
  --wait
```

Velero automatically uses file-level restore for volumes that were backed up with file-level backup.

Monitor restore progress:

```bash
# Check restore status
velero restore describe <restore-name>

# View restore logs
velero restore logs <restore-name>

# Check node-agent logs during restore
kubectl logs -n velero -l name=node-agent --follow
```

## Handling Large Volumes

For very large volumes, adjust timeout settings:

```yaml
apiVersion: velero.io/v1
kind: Backup
metadata:
  name: large-volume-backup
  namespace: velero
spec:
  includedNamespaces:
  - production
  defaultVolumesToFsBackup: true
  # Increase timeout to 6 hours for large volumes
  fsBackupTimeout: 6h
```

Also consider splitting large volumes into smaller incremental backups:

```bash
# First full backup
velero backup create full-backup \
  --include-namespaces production \
  --default-volumes-to-fs-backup=true \
  --wait

# Subsequent incremental backups are faster due to deduplication
velero backup create incremental-backup \
  --include-namespaces production \
  --default-volumes-to-fs-backup=true \
  --wait
```

Restic's deduplication means subsequent backups only store changed data.

## Troubleshooting File-Level Backup Issues

Common problems and solutions:

**Backup stuck in progress:**

```bash
# Check node-agent pod status
kubectl get pods -n velero -l name=node-agent

# Review node-agent logs for errors
kubectl logs -n velero -l name=node-agent | grep -i error

# Check if pods can mount volumes
kubectl describe pod <app-pod> -n production
```

**Insufficient disk space on nodes:**

```bash
# Check node disk usage
kubectl get nodes -o json | jq '.items[] | {name:.metadata.name, disk:.status.allocatable.ephemeralStorage}'

# Free up space or add node-agent tolerations to schedule on different nodes
```

**Timeout errors:**

Increase the timeout in Velero configuration:

```bash
kubectl edit deployment velero -n velero

# Add or modify environment variable
env:
- name: VELERO_RESTIC_TIMEOUT
  value: "6h"
```

## Comparing Snapshot vs File-Level Backup

Choose the right backup method for your use case:

**Use volume snapshots when:**
- Your storage provider supports snapshots
- You need fast backup/restore times
- You're staying within the same storage infrastructure
- Cost is a consideration (snapshots are often cheaper)

**Use file-level backup when:**
- Storage doesn't support snapshots (NFS, HostPath)
- You need portability between storage systems
- You're performing cross-cloud migrations
- You want backup encryption and deduplication

You can combine both approaches:

```yaml
apiVersion: velero.io/v1
kind: Backup
metadata:
  name: hybrid-backup
  namespace: velero
spec:
  includedNamespaces:
  - production
  # Use snapshots where possible
  snapshotVolumes: true
  # Fall back to file-level for unsupported volumes
  defaultVolumesToFsBackup: false
```

## Monitoring Restic Repository Health

Check the health of your Restic repository:

```bash
# Get Restic repository information
velero restic repo get

# Check repository statistics
kubectl get resticrepositories -n velero

# Describe repository for details
kubectl describe resticrepository <repo-name> -n velero
```

Occasionally, you may need to maintain the repository:

```bash
# Prune old backup data (Velero does this automatically)
# But you can trigger it manually if needed
velero backup-location get
```

## Securing File-Level Backups

Restic backups are encrypted by default using AES-256. Ensure your Velero credentials are properly secured:

```bash
# Verify secret exists
kubectl get secret -n velero cloud-credentials

# Rotate credentials if compromised
kubectl create secret generic cloud-credentials \
  --from-file=cloud=./new-credentials-velero \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart Velero and node-agent pods
kubectl rollout restart deployment velero -n velero
kubectl rollout restart daemonset node-agent -n velero
```

## Automating Restic Maintenance

Set up automated repository maintenance:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: velero-restic-maintenance
  namespace: velero
spec:
  schedule: "0 3 * * 0"  # Weekly on Sunday at 3 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: velero
          containers:
          - name: maintenance
            image: velero/velero:v1.12.0
            command:
            - /bin/bash
            - -c
            - |
              # Check backup locations
              velero backup-location get

              # List old backups
              velero backup get | grep -E "Completed|PartiallyFailed" | awk '{print $1}'
          restartPolicy: OnFailure
```

This CronJob performs regular repository health checks.

## Conclusion

Velero's Restic integration provides universal file-level backup capabilities for Kubernetes persistent volumes. While slower than snapshot-based approaches, file-level backups offer unmatched portability and compatibility across storage systems. Configure appropriate resource limits for node-agent pods, optimize backup schedules for your workload patterns, and leverage Restic's deduplication to minimize storage costs. Combine file-level backups with volume snapshots to create a comprehensive backup strategy that provides fast recovery within your infrastructure and portable backups for disaster recovery scenarios.
