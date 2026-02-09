# How to Use kubectl cp to Copy Files Between Local System and Pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, File Management, Debugging

Description: Master kubectl cp for copying files between your local system and Kubernetes pods to transfer configs, collect logs, deploy scripts, and debug applications.

---

Moving files in and out of containers is a common task when debugging, deploying configuration changes, collecting diagnostic data, or transferring artifacts. kubectl cp provides a convenient way to copy files between your local filesystem and containers running in Kubernetes pods, without needing to set up volume mounts or external storage.

While kubectl cp is primarily a debugging tool and not recommended for production deployments, it's invaluable for quick file transfers during development and troubleshooting.

## Basic kubectl cp Syntax

Copy files to and from pods:

```bash
# Copy file from local to pod
kubectl cp /local/path/file.txt pod-name:/container/path/file.txt

# Copy file from pod to local
kubectl cp pod-name:/container/path/file.txt /local/path/file.txt

# Copy directory from local to pod
kubectl cp /local/directory pod-name:/container/path/

# Copy directory from pod to local
kubectl cp pod-name:/container/directory /local/path/
```

## Copying to Specific Containers

Handle multi-container pods:

```bash
# Copy to specific container
kubectl cp /local/file.txt pod-name:/path/file.txt -c container-name

# Copy from specific container
kubectl cp pod-name:/path/file.txt /local/file.txt -c container-name

# List containers in pod
kubectl get pod pod-name -o jsonpath='{.spec.containers[*].name}'
```

## Copying with Namespace

Work with pods in different namespaces:

```bash
# Copy to pod in specific namespace
kubectl cp /local/file.txt -n production pod-name:/path/file.txt

# Copy from pod in specific namespace
kubectl cp -n production pod-name:/path/file.txt /local/file.txt
```

## Copying Configuration Files

Deploy config files to containers:

```bash
# Copy application config
kubectl cp app-config.yaml api-pod:/etc/app/config.yaml

# Copy environment file
kubectl cp .env api-pod:/app/.env

# Copy TLS certificates
kubectl cp certs/tls.crt api-pod:/etc/ssl/certs/tls.crt
kubectl cp certs/tls.key api-pod:/etc/ssl/private/tls.key

# Verify copied files
kubectl exec api-pod -- ls -la /etc/app/config.yaml
kubectl exec api-pod -- cat /etc/app/config.yaml
```

## Collecting Log Files

Extract logs and diagnostic data:

```bash
# Copy application logs
kubectl cp api-pod:/var/log/app.log ./app.log

# Copy entire log directory
kubectl cp api-pod:/var/log/ ./pod-logs/

# Copy core dumps
kubectl cp crashed-pod:/tmp/core.dump ./core.dump

# Copy heap dumps
kubectl cp java-pod:/tmp/heapdump.hprof ./heapdump.hprof

# Compress before copying (in pod)
kubectl exec my-pod -- tar czf /tmp/logs.tar.gz /var/log/
kubectl cp my-pod:/tmp/logs.tar.gz ./logs.tar.gz
tar xzf logs.tar.gz
```

## Deploying Scripts

Copy and execute scripts in containers:

```bash
# Copy debug script
kubectl cp debug-script.sh api-pod:/tmp/debug.sh

# Make executable and run
kubectl exec api-pod -- chmod +x /tmp/debug.sh
kubectl exec api-pod -- /tmp/debug.sh

# Copy and run in one command
kubectl cp analyze.sh api-pod:/tmp/analyze.sh && \
kubectl exec api-pod -- sh -c "chmod +x /tmp/analyze.sh && /tmp/analyze.sh"
```

## Backing Up Data

Extract data from containers:

```bash
# Backup database dump
kubectl exec postgres-pod -- pg_dump mydb > /tmp/backup.sql
kubectl cp postgres-pod:/tmp/backup.sql ./db-backup.sql

# Backup application data
kubectl cp app-pod:/data/ ./app-data-backup/

# Backup with timestamp
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
kubectl cp app-pod:/data/ "./backup-${TIMESTAMP}/"

# Automated backup script
#!/bin/bash
POD_NAME="app-pod"
BACKUP_DIR="./backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
kubectl cp "$POD_NAME:/data/" "$BACKUP_DIR/"
echo "Backup saved to: $BACKUP_DIR"
```

## Copying Between Pods

Transfer files between pods:

```bash
# Copy from pod1 to local, then to pod2
kubectl cp pod1:/app/data.json /tmp/data.json
kubectl cp /tmp/data.json pod2:/app/data.json
rm /tmp/data.json

# Direct pod-to-pod copy (using exec)
kubectl exec pod1 -- cat /app/data.json | \
kubectl exec -i pod2 -- tee /app/data.json > /dev/null
```

## Handling Large Files

Optimize large file transfers:

```bash
# Compress before copying
kubectl exec my-pod -- tar czf /tmp/data.tar.gz /app/data/
kubectl cp my-pod:/tmp/data.tar.gz ./data.tar.gz
kubectl exec my-pod -- rm /tmp/data.tar.gz

# Split large files
kubectl exec my-pod -- split -b 100M /large/file.bin /tmp/file.part.
kubectl cp my-pod:/tmp/file.part.aa ./
kubectl cp my-pod:/tmp/file.part.ab ./
kubectl cp my-pod:/tmp/file.part.ac ./
cat file.part.* > file.bin

# Use streaming for very large files
kubectl exec my-pod -- cat /large/file.bin > ./file.bin
```

## Wildcard and Pattern Copying

Copy multiple files:

```bash
# Copy all log files (requires tar in pod)
kubectl exec my-pod -- tar cf - /var/log/*.log | tar xf - -C ./logs/

# Copy all config files
kubectl exec my-pod -- sh -c 'cd /etc/app && tar cf - *.yaml' | tar xf - -C ./configs/

# Copy matching files
kubectl exec my-pod -- find /app/data -name "*.json" -print0 | \
kubectl exec -i my-pod -- tar czf /tmp/json-files.tar.gz --null -T -
kubectl cp my-pod:/tmp/json-files.tar.gz ./json-files.tar.gz
```

## Error Handling and Troubleshooting

Common issues and solutions:

```bash
# Error: "error: open /local/file: permission denied"
# Solution: Check local file permissions
chmod 644 /local/file
kubectl cp /local/file pod-name:/path/file

# Error: "tar: Removing leading `/` from member names"
# This is a warning, usually safe to ignore

# Error: "error: couldn't attach to pod"
# Solution: Check pod status
kubectl get pod pod-name
kubectl describe pod pod-name

# Error: "error: unable to upgrade connection: container not found"
# Solution: Specify container name
kubectl cp file.txt pod-name:/path -c container-name

# Verify copy succeeded
LOCAL_MD5=$(md5sum /local/file | awk '{print $1}')
REMOTE_MD5=$(kubectl exec pod-name -- md5sum /remote/file | awk '{print $1}')
if [ "$LOCAL_MD5" == "$REMOTE_MD5" ]; then
    echo "Copy verified successfully"
else
    echo "Copy failed - checksums don't match"
fi
```

## Automated File Sync Script

Create a script for syncing files:

```bash
#!/bin/bash
# Save as kubectl-sync.sh

POD_NAME=$1
LOCAL_DIR=$2
REMOTE_DIR=$3
DIRECTION=${4:-to}  # 'to' or 'from'

if [ -z "$POD_NAME" ] || [ -z "$LOCAL_DIR" ] || [ -z "$REMOTE_DIR" ]; then
    echo "Usage: $0 <pod-name> <local-dir> <remote-dir> [to|from]"
    exit 1
fi

case $DIRECTION in
    to)
        echo "Syncing $LOCAL_DIR -> $POD_NAME:$REMOTE_DIR"
        kubectl cp "$LOCAL_DIR" "$POD_NAME:$REMOTE_DIR"
        ;;
    from)
        echo "Syncing $POD_NAME:$REMOTE_DIR -> $LOCAL_DIR"
        kubectl cp "$POD_NAME:$REMOTE_DIR" "$LOCAL_DIR"
        ;;
    *)
        echo "Invalid direction: $DIRECTION. Use 'to' or 'from'"
        exit 1
        ;;
esac

if [ $? -eq 0 ]; then
    echo "Sync completed successfully"
else
    echo "Sync failed"
    exit 1
fi
```

## Copying with Progress Indication

Show progress for large files:

```bash
# Using pv (pipe viewer) if available locally
kubectl exec my-pod -- cat /large/file.bin | pv > ./file.bin

# Creating a progress script
#!/bin/bash
POD_NAME=$1
REMOTE_FILE=$2
LOCAL_FILE=$3

# Get file size
SIZE=$(kubectl exec "$POD_NAME" -- stat -f%z "$REMOTE_FILE" 2>/dev/null || \
       kubectl exec "$POD_NAME" -- stat -c%s "$REMOTE_FILE")

echo "Copying $SIZE bytes..."

# Copy with progress
kubectl exec "$POD_NAME" -- cat "$REMOTE_FILE" | \
    pv -s "$SIZE" > "$LOCAL_FILE"

echo "Copy complete!"
```

## Batch File Operations

Copy multiple files efficiently:

```bash
#!/bin/bash
# Save as batch-copy.sh

POD_NAME=$1
shift

while [ $# -gt 0 ]; do
    LOCAL_FILE=$1
    REMOTE_FILE=${2:-/tmp/$(basename "$LOCAL_FILE")}

    echo "Copying $LOCAL_FILE -> $POD_NAME:$REMOTE_FILE"
    kubectl cp "$LOCAL_FILE" "$POD_NAME:$REMOTE_FILE"

    if [ $? -eq 0 ]; then
        echo "✓ Copied successfully"
    else
        echo "✗ Copy failed"
    fi

    shift 2
done

# Usage:
# ./batch-copy.sh my-pod \
#   config.yaml /etc/app/config.yaml \
#   script.sh /tmp/script.sh \
#   data.json /app/data.json
```

## Security Considerations

Best practices for secure file copying:

```bash
# Avoid copying sensitive files
# Use Secrets instead of kubectl cp for credentials
kubectl create secret generic app-secrets --from-file=./credentials.json

# Check file permissions after copying
kubectl exec my-pod -- ls -la /path/to/copied/file

# Set proper permissions after copy
kubectl exec my-pod -- chmod 600 /path/to/sensitive/file

# Verify file ownership
kubectl exec my-pod -- chown app:app /path/to/file

# Use temporary locations for sensitive data
kubectl cp sensitive.key my-pod:/tmp/temp.key
kubectl exec my-pod -- sh -c "mv /tmp/temp.key /secure/location/ && chmod 600 /secure/location/temp.key"
```

## Alternatives to kubectl cp

When kubectl cp isn't suitable:

```bash
# Use ConfigMaps for configuration
kubectl create configmap app-config --from-file=config.yaml
# Mount in pod spec

# Use Secrets for sensitive data
kubectl create secret generic app-secret --from-file=key.pem

# Use init containers for startup files
# Define in pod spec

# Use volume mounts for shared storage
# Use PVC or hostPath volumes

# Use container image for static files
# Build files into your container image
```

kubectl cp is a convenient tool for quick file transfers during debugging and development, but for production deployments, prefer ConfigMaps, Secrets, or volume mounts for better reliability and security.
