# Configure Velero Restic Integration for File-Level Backup of Persistent Volumes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Velero, Restic, Kubernetes, Backup, Persistent Volume

Description: Learn how to configure Velero with Restic for file-level backup of persistent volumes in Kubernetes. Complete guide covering installation, configuration, and optimization techniques.

---

While volume snapshots provide fast backups through storage system integration, they have limitations when working with cloud providers that don't support snapshots or when you need to move data between different storage systems. Velero's File System Backup feature solves these challenges by performing file-level backups directly from mounted volumes, creating portable backups that work across any supported object storage backend. This approach offers broad compatibility at the cost of slightly longer backup times.

## Understanding File-Level Backups

Velero File System Backup uses the node-agent DaemonSet and the Kopia uploader by default to create encrypted, deduplicated backups. The node-agent runs on each node and backs up pod volume data by reading files directly from mounted volumes. This file-level approach works with many volume types, including NFS, EBS, Azure Disk, and local persistent volumes. HostPath volumes are not supported.

Unlike snapshot-based backups that rely on storage driver capabilities, file-level backups are storage-agnostic. You can back up volumes from one storage system and restore them to completely different infrastructure, making File System Backup useful for disaster recovery scenarios and cross-cloud migrations.

## Installing Velero with File System Backup Support

Install Velero with the node-agent DaemonSet enabled:

```bash
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.14.0 \
  --bucket my-velero-backups \
  --backup-location-config region=us-east-1 \
  --use-node-agent \
  --secret-file ./credentials-velero
```

The `--use-node-agent` flag deploys the node-agent DaemonSet that performs file-level backups. In current Velero releases, the Restic uploader is deprecated and disabled for new backups, so use the default Kopia uploader for new installations.

Verify the node-agent pods are running:

```bash
kubectl get pods -n velero -l name=node-agent

# Should show one pod per node

kubectl get daemonset -n velero node-agent
```

## Annotating Pods for File-Level Backup

Velero doesn't automatically back up pod volumes with File System Backup unless you opt in globally or per backup. With the default opt-in approach, annotate pods:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-app
  namespace: production
  annotations:
    # Back up this persistent volume in the pod
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
velero backup create fs-backup \
  --include-namespaces production \
  --default-volumes-to-fs-backup=false \
  --wait
```

The `--default-volumes-to-fs-backup=false` flag means only annotated volumes are backed up using file-level backup.

To backup all volumes by default:

```bash
velero backup create fs-backup-all \
  --include-namespaces production \
  --default-volumes-to-fs-backup=true \
  --wait
```

This backs up eligible pod volumes without requiring pod annotations. Velero still excludes volumes such as default service account tokens, Secrets, ConfigMaps, and HostPath volumes from File System Backup.

## Monitoring File-Level Backup Progress

Track backup progress and identify issues:

```bash
# Get backup status
velero backup describe fs-backup

# Check node-agent pod logs
kubectl logs -n velero -l name=node-agent

# View detailed backup logs
velero backup logs fs-backup
```

File-level backups take longer than snapshots. Monitor progress:

```bash
# Watch backup status
watch velero backup get fs-backup

# Check backup phase
kubectl get backup fs-backup -n velero -o jsonpath='{.status.phase}'
```

## Configuring Node-Agent Resource Limits

Node-agent pods consume CPU and memory during backups. Configure appropriate resource limits:

```bash
kubectl patch daemonset node-agent -n velero --patch \
  '{"spec":{"template":{"spec":{"containers":[{"name":"node-agent","resources":{"requests":{"memory":"512Mi","cpu":"500m"},"limits":{"memory":"2Gi","cpu":"2000m"}}}]}}}}'
```

Adjust these values based on your volume sizes and backup frequency.

## Optimizing Backup Performance

Several factors affect file-level backup performance:

**1. Exclude unnecessary volumes or Kubernetes resources:**

```bash
# Exclude a volume from File System Backup when using the opt-out approach
kubectl -n production annotate pod/my-app \
  backup.velero.io/backup-volumes-excludes=cache-volume

# Create backup excluding Kubernetes API resources that are not needed
velero backup create optimized-backup \
  --include-namespaces production \
  --default-volumes-to-fs-backup=true \
  --exclude-resources='events' \
  --wait
```

**2. Configure concurrent uploads:**

Increase file upload parallelism per backup:

```bash
velero backup create optimized-backup \
  --include-namespaces production \
  --default-volumes-to-fs-backup=true \
  --parallel-files-upload 4 \
  --wait
```

You can also configure how many File System Backup operations the node-agent handles per node:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: node-agent-config
  namespace: velero
data:
  config.json: |
    {
      "loadConcurrency": {
        "globalConfig": 2
      }
    }
```

Pass this ConfigMap to Velero at install time with `--node-agent-configmap node-agent-config`, or add `--node-agent-configmap=node-agent-config` to the node-agent DaemonSet arguments and restart the DaemonSet.

**3. Schedule backups during off-peak hours:**

```yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: nightly-fs-backup
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
velero restore create --from-backup fs-backup --wait

# Restore to different namespace
velero restore create --from-backup fs-backup \
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

For very large volumes, adjust the File System Backup operation timeout in the Velero server deployment:

```bash
kubectl edit deployment velero -n velero
```

Add or update the server argument:

```yaml
args:
- server
- --fs-backup-timeout=360m
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

Kopia's deduplication means subsequent backups only store changed data.

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
```

Add or modify the server argument:

```yaml
args:
- server
- --fs-backup-timeout=360m
```

## Comparing Snapshot vs File-Level Backup

Choose the right backup method for your use case:

**Use volume snapshots when:**
- Your storage provider supports snapshots
- You need fast backup/restore times
- You're staying within the same storage infrastructure
- Cost is a consideration (snapshots are often cheaper)

**Use file-level backup when:**
- Storage doesn't support snapshots, such as NFS or local persistent volumes
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
  # File-level backup still requires annotations or defaultVolumesToFsBackup=true
  defaultVolumesToFsBackup: false
```

## Monitoring Backup Repository Health

Check the health of your Velero backup repositories:

```bash
# Get backup repository information
velero repo get

# Check repository statistics
kubectl get backuprepositories -n velero

# Describe repository for details
kubectl describe backuprepository <repo-name> -n velero
```

Occasionally, you may need to check repository maintenance history:

```bash
kubectl describe backuprepository <repo-name> -n velero
```

## Securing File-Level Backups

File System Backup repositories are encrypted using repository credentials stored in the `velero-repo-credentials` secret. Ensure your repository and cloud credentials are properly secured:

```bash
# Verify secret exists
kubectl get secret -n velero cloud-credentials
kubectl get secret -n velero velero-repo-credentials

# Rotate credentials if compromised
kubectl create secret generic cloud-credentials \
  --from-file=cloud=./new-credentials-velero \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart Velero and node-agent pods
kubectl rollout restart deployment velero -n velero
kubectl rollout restart daemonset node-agent -n velero
```

## Configuring Repository Maintenance

Velero runs backup repository maintenance automatically. You can adjust the default maintenance frequency during installation:

```bash
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.14.0 \
  --bucket my-velero-backups \
  --backup-location-config region=us-east-1 \
  --use-node-agent \
  --default-repo-maintain-frequency 6h \
  --secret-file ./credentials-velero
```

Use `velero repo get` and `kubectl describe backuprepository <repo-name> -n velero` to check recent maintenance status.

## Conclusion

Velero's File System Backup provides portable file-level backup capabilities for Kubernetes persistent volumes. While slower than snapshot-based approaches, file-level backups offer broad portability and compatibility across storage systems. Configure appropriate resource limits for node-agent pods, optimize backup schedules for your workload patterns, and leverage Kopia's deduplication to minimize storage costs. Combine file-level backups with volume snapshots to create a comprehensive backup strategy that provides fast recovery within your infrastructure and portable backups for disaster recovery scenarios.
