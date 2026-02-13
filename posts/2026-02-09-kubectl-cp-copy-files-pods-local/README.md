# How to Use kubectl cp to Copy Files Between Pods and Local Machine Safely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, kubectl, File Management

Description: Master kubectl cp to transfer files between your local machine and Kubernetes pods, including best practices for safety, troubleshooting common issues, and handling edge cases.

---

Moving files in and out of containers is essential for debugging, backups, and deployments. kubectl cp provides tar-based file transfer between your local filesystem and running pods without requiring additional tools inside containers.

## Basic kubectl cp Syntax

The command follows a source-to-destination pattern with colons separating pod names from paths:

```bash
# Copy from pod to local
kubectl cp <pod-name>:<source-path> <local-dest-path>

# Copy from local to pod
kubectl cp <local-source-path> <pod-name>:<dest-path>

# Examples
kubectl cp webapp:/var/log/app.log ./app.log
kubectl cp ./config.yaml webapp:/etc/app/config.yaml
```

The colon separates pod names from file paths, similar to scp syntax.

## Copying Files from Pods

Extract files from running containers:

```bash
# Copy single file from pod
kubectl cp nginx:/etc/nginx/nginx.conf ./nginx.conf

# Copy directory from pod
kubectl cp webapp:/var/log ./logs/

# Copy with specific namespace
kubectl cp webapp:/data/export.csv ./export.csv -n production

# Copy from specific container in multi-container pod
kubectl cp webapp:/app/data.json ./data.json -c sidecar
```

The local destination path is relative to your current directory unless you provide an absolute path.

## Copying Files to Pods

Upload files to containers:

```bash
# Copy single file to pod
kubectl cp ./app-config.yaml webapp:/etc/app/config.yaml

# Copy directory to pod
kubectl cp ./html/ nginx:/usr/share/nginx/html/

# Copy to specific namespace
kubectl cp ./database.sql postgres:/tmp/restore.sql -n databases

# Copy to specific container
kubectl cp ./certs/ webapp:/etc/certs/ -c nginx
```

This uploads files without rebuilding images or using volume mounts.

## Working with Multi-Container Pods

Specify the target container when pods run multiple containers:

```bash
# List containers in a pod
kubectl get pod webapp -o jsonpath='{.spec.containers[*].name}'

# Copy to specific container
kubectl cp ./config.json webapp:/app/config.json -c main-app

# Copy from specific container
kubectl cp webapp:/logs/error.log ./error.log -c sidecar

# Without -c flag, kubectl uses the first container
```

Always use `-c` when working with multi-container pods to avoid ambiguity.

## Preserving Permissions

By default, cp preserves file permissions:

```bash
# Copy preserving permissions
kubectl cp webapp:/app/script.sh ./script.sh

# Check copied permissions
ls -l script.sh

# Copy executable and run locally
kubectl cp webapp:/bin/custom-tool ./custom-tool
chmod +x ./custom-tool  # May need to restore execute bit
./custom-tool
```

Some permission attributes might not transfer perfectly due to user ID differences.

## Handling Symbolic Links

kubectl cp does not follow symbolic links by default:

```bash
# Symbolic links are copied as links, not their targets
kubectl cp webapp:/app/current ./current

# To copy link targets, use tar manually
kubectl exec webapp -- tar cf - -h /app/current | tar xf - -C ./

# Or resolve links before copying
kubectl exec webapp -- readlink -f /app/current
# Then copy the resolved path
```

This prevents accidentally copying large directory trees through symlinks.

## Copying Large Files

Large file transfers can timeout. Monitor progress and adjust timeouts:

```bash
# Copy large file with default timeout
kubectl cp webapp:/data/backup.tar.gz ./backup.tar.gz

# Check file size first
kubectl exec webapp -- ls -lh /data/backup.tar.gz

# Monitor transfer with verbose output
kubectl cp webapp:/data/large-file.bin ./large-file.bin -v=8

# Split large files before copying
kubectl exec webapp -- split -b 100M /data/huge-file.bin /tmp/part-
kubectl cp webapp:/tmp/part-aa ./part-aa
kubectl cp webapp:/tmp/part-ab ./part-ab
# Combine locally
cat part-* > huge-file.bin
```

For very large files, consider using object storage or volume mounts instead.

## Wildcard and Pattern Matching

kubectl cp doesn't support wildcards directly. Use tar for pattern-based copying:

```bash
# Won't work:
# kubectl cp webapp:/logs/*.log ./logs/

# Instead, use tar with wildcards
kubectl exec webapp -- tar cf - -C /logs --wildcards "*.log" | tar xf - -C ./logs/

# Copy all files matching a pattern
kubectl exec webapp -- sh -c "tar cf - /var/log/*.log" | tar xf -

# Copy multiple specific files
kubectl exec webapp -- tar cf - /etc/app/config.yaml /etc/app/secrets.yaml | tar xf -
```

Tar provides more flexible file selection than cp.

## Safety and Validation

Validate before copying to prevent data loss:

```bash
# Check if source file exists
kubectl exec webapp -- ls -l /app/config.yaml

# Check destination directory exists locally
mkdir -p ./configs

# Copy with confirmation
read -p "Copy config from webapp pod? (yes/no): " confirm
if [[ "$confirm" == "yes" ]]; then
    kubectl cp webapp:/app/config.yaml ./configs/config.yaml
fi

# Verify successful copy
ls -l ./configs/config.yaml
```

Always verify source file existence before copying to avoid confusing error messages.

## Backup and Restore Workflows

Common backup patterns using cp:

```bash
#!/bin/bash
# backup-pod-data.sh

POD="database-0"
NAMESPACE="production"
BACKUP_DIR="./backups/$(date +%Y-%m-%d)"

mkdir -p "$BACKUP_DIR"

# Backup database files
kubectl cp "$POD:/var/lib/postgresql/data" "$BACKUP_DIR/data" -n "$NAMESPACE"

# Backup configuration
kubectl cp "$POD:/etc/postgresql/postgresql.conf" "$BACKUP_DIR/postgresql.conf" -n "$NAMESPACE"

# Create archive
tar czf "backup-$(date +%Y-%m-%d-%H%M%S).tar.gz" -C "$BACKUP_DIR" .

echo "Backup complete: backup-$(date +%Y-%m-%d-%H%M%S).tar.gz"
```

This creates timestamped backups of pod data.

## Restore Operations

Upload backup files to restore data:

```bash
#!/bin/bash
# restore-pod-data.sh

POD="database-0"
NAMESPACE="production"
BACKUP_FILE="backup-2026-02-09.tar.gz"

# Extract backup locally
mkdir -p ./restore-temp
tar xzf "$BACKUP_FILE" -C ./restore-temp

# Stop application (if needed)
kubectl scale deployment app --replicas=0 -n "$NAMESPACE"

# Copy files to pod
kubectl cp ./restore-temp/data "$POD:/var/lib/postgresql/data" -n "$NAMESPACE"
kubectl cp ./restore-temp/postgresql.conf "$POD:/etc/postgresql/postgresql.conf" -n "$NAMESPACE"

# Restart application
kubectl scale deployment app --replicas=3 -n "$NAMESPACE"

# Cleanup
rm -rf ./restore-temp

echo "Restore complete"
```

This safely restores backed-up data to pods.

## Troubleshooting cp Errors

Common errors and solutions:

```bash
# Error: tar: Removing leading '/' from member names
# This is a warning, not an error. Files copy successfully.

# Error: tar: command not found
# Pod container doesn't have tar installed
# Solution: Use a different method or add tar to container image

# Error: unable to copy: no such file or directory
# Check source file exists
kubectl exec webapp -- ls -l /path/to/file

# Error: OCI runtime exec failed
# Pod might be in non-Running state
kubectl get pod webapp
kubectl describe pod webapp

# Error: connection refused
# API server connectivity issue
kubectl cluster-info
```

Most errors relate to missing tar or incorrect paths.

## Alternative: Using Volume Mounts

For frequent file transfers, use volume mounts:

```yaml
# deployment.yaml
apiVersion: v1
kind: Pod
metadata:
  name: webapp
spec:
  containers:
  - name: app
    image: webapp:latest
    volumeMounts:
    - name: data
      mountPath: /data
  volumes:
  - name: data
    hostPath:
      path: /shared-data
      type: DirectoryOrCreate
```

Volume mounts provide better performance for ongoing file access.

## Using PVCs for Data Transfer

Persistent volumes enable large-scale data transfer:

```bash
# Create PVC
kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: data-transfer
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
EOF

# Mount to source pod
kubectl set volume pod/source --add --name=transfer \
  --claim-name=data-transfer --mount-path=/transfer

# Copy data inside pod
kubectl exec source -- cp -r /data/* /transfer/

# Mount to destination pod
kubectl set volume pod/destination --add --name=transfer \
  --claim-name=data-transfer --mount-path=/transfer

# Copy from shared volume
kubectl exec destination -- cp -r /transfer/* /data/
```

This avoids network transfer overhead for large datasets.

## Security Considerations

Be cautious when copying files:

```bash
# Don't copy sensitive files to insecure locations
# Bad:
kubectl cp postgres:/var/lib/postgresql/passwords.txt ./passwords.txt

# Better: Copy to secure location with restricted permissions
kubectl cp postgres:/var/lib/postgresql/passwords.txt ~/secure/passwords.txt
chmod 600 ~/secure/passwords.txt

# Validate file contents after copying sensitive data
file ./sensitive-data.bin

# Shred local copies after use
shred -u ./sensitive-data.bin
```

Always handle credentials and sensitive data with appropriate security measures.

## Performance Optimization

Optimize large file transfers:

```bash
# Compress before copying
kubectl exec webapp -- tar czf /tmp/data.tar.gz /var/data
kubectl cp webapp:/tmp/data.tar.gz ./data.tar.gz
kubectl exec webapp -- rm /tmp/data.tar.gz

# Use streaming compression
kubectl exec webapp -- tar czf - /var/data > data.tar.gz

# Split large transfers
kubectl exec webapp -- split -b 500M /var/data/large.bin /tmp/part-
# Copy parts individually
kubectl cp webapp:/tmp/part-aa ./part-aa
kubectl cp webapp:/tmp/part-ab ./part-ab
# Combine and cleanup
cat part-* > large.bin
kubectl exec webapp -- rm /tmp/part-*
```

Compression reduces transfer time significantly for text and log files.

## Copying Between Pods

Transfer files between pods without local storage:

```bash
# Copy from pod1 to pod2 via local machine
kubectl cp pod1:/data/file.txt ./temp-file.txt
kubectl cp ./temp-file.txt pod2:/data/file.txt
rm ./temp-file.txt

# Or use a pipeline
kubectl exec pod1 -- tar cf - /data/file.txt | \
kubectl exec -i pod2 -- tar xf - -C /data/
```

Pipeline approach avoids local disk usage.

## Integration with CI/CD

Use cp in deployment pipelines:

```bash
#!/bin/bash
# deploy-config.sh

POD=$(kubectl get pod -l app=webapp -o jsonpath='{.items[0].metadata.name}')

# Upload new configuration
kubectl cp ./config/production.yaml $POD:/etc/app/config.yaml

# Reload configuration
kubectl exec $POD -- /app/reload-config.sh

# Verify configuration
kubectl exec $POD -- cat /etc/app/config.yaml | grep "environment: production"
```

This enables configuration updates without rebuilding containers.

kubectl cp provides essential file transfer capabilities for Kubernetes workflows. Use it for debugging, backups, and emergency configuration updates. For production data management, prefer volume mounts or object storage, but keep cp in your toolkit for quick file operations. Learn more about pod interaction at https://oneuptime.com/blog/post/2026-01-22-kubectl-exec-troubleshoot-containers/view.
