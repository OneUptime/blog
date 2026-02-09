# How to Troubleshoot Collector CrashLoopBackOff in Kubernetes Caused by Persistent Queue Corruption

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Kubernetes, Persistent Queue

Description: Fix OpenTelemetry Collector CrashLoopBackOff in Kubernetes caused by corrupted persistent queue storage files on disk.

Your OpenTelemetry Collector pod is in CrashLoopBackOff. You check the logs and see errors like:

```
Error: failed to start exporters: failed to create sending queue:
  failed to open persistent storage: corrupted data in queue file
```

The Collector starts, tries to load the persistent queue from disk, finds corrupted data, and crashes. Kubernetes restarts it, and it crashes again in a loop.

## Why Queue Corruption Happens

Persistent queues store telemetry data on disk so it survives Collector restarts. The data is written using a storage extension (typically `file_storage`). Corruption happens when:

1. The Collector is OOM-killed mid-write
2. The node's disk fills up during a write
3. The persistent volume is shared or has filesystem issues
4. A Collector upgrade changes the queue serialization format

## Diagnosing the Issue

Check the Collector logs before the crash:

```bash
kubectl logs <pod-name> --previous
```

Look for messages like:
- `corrupted data in queue file`
- `failed to restore queue from storage`
- `unexpected EOF`
- `invalid data format`

Check the persistent volume:

```bash
# Exec into a debug container that mounts the same PVC
kubectl run debug --image=busybox --restart=Never \
  --overrides='{"spec":{"volumes":[{"name":"queue","persistentVolumeClaim":{"claimName":"otel-collector-queue"}}],"containers":[{"name":"debug","image":"busybox","command":["sh"],"stdin":true,"tty":true,"volumeMounts":[{"name":"queue","mountPath":"/queue"}]}]}}'

# Check the queue directory
ls -la /queue/
du -sh /queue/
```

## Fix 1: Delete the Corrupted Queue Data

The fastest fix is to clear the queue storage. You lose the queued data, but the Collector can start again:

```bash
# Scale down the Collector
kubectl scale deployment otel-collector --replicas=0

# Create a temporary pod to clean the PVC
kubectl run cleanup --image=busybox --restart=Never \
  --overrides='{
    "spec": {
      "volumes": [{
        "name": "queue",
        "persistentVolumeClaim": {"claimName": "otel-collector-queue"}
      }],
      "containers": [{
        "name": "cleanup",
        "image": "busybox",
        "command": ["rm", "-rf", "/queue/*"],
        "volumeMounts": [{
          "name": "queue",
          "mountPath": "/queue"
        }]
      }]
    }
  }'

# Wait for cleanup to complete
kubectl wait --for=condition=ready pod/cleanup --timeout=60s

# Delete the cleanup pod
kubectl delete pod cleanup

# Scale back up
kubectl scale deployment otel-collector --replicas=1
```

## Fix 2: Use an Init Container for Automatic Cleanup

Add an init container that validates the queue on startup:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
spec:
  template:
    spec:
      initContainers:
      - name: queue-check
        image: busybox
        command:
        - sh
        - -c
        - |
          # Check if queue files exist and are potentially corrupted
          if [ -d "/queue" ] && [ "$(ls -A /queue 2>/dev/null)" ]; then
            echo "Queue directory has files, checking size..."
            TOTAL_SIZE=$(du -s /queue | awk '{print $1}')
            # If queue is suspiciously large (>1GB), clear it
            if [ "$TOTAL_SIZE" -gt 1048576 ]; then
              echo "Queue is too large ($TOTAL_SIZE KB), clearing..."
              rm -rf /queue/*
            fi
          fi
          echo "Queue check complete"
        volumeMounts:
        - name: queue-storage
          mountPath: /queue
      containers:
      - name: collector
        image: otel/opentelemetry-collector-contrib:0.121.0
        volumeMounts:
        - name: queue-storage
          mountPath: /var/lib/otelcol/queue
      volumes:
      - name: queue-storage
        persistentVolumeClaim:
          claimName: otel-collector-queue
```

## Fix 3: Disable Persistent Queue Temporarily

If you need the Collector running immediately, disable the persistent queue:

```yaml
exporters:
  otlp:
    endpoint: backend:4317
    sending_queue:
      enabled: true
      # Remove the storage reference to use in-memory queue
      # storage: file_storage  # commented out
      queue_size: 1000
```

Without `storage`, the queue is in-memory only. Data is lost on restart, but the Collector will not crash on corrupted files.

## Prevention: Configure Queue Limits

Prevent queue corruption by limiting queue size and ensuring the volume has enough space:

```yaml
extensions:
  file_storage:
    directory: /var/lib/otelcol/queue
    # Set a compaction interval to clean up
    compaction:
      directory: /var/lib/otelcol/queue/compact
      on_start: true  # compact on startup
      on_rebound: true

exporters:
  otlp:
    sending_queue:
      enabled: true
      storage: file_storage
      queue_size: 5000  # limit the number of items
```

Also ensure the PVC has enough space:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: otel-collector-queue
spec:
  accessModes: [ReadWriteOnce]
  resources:
    requests:
      storage: 5Gi  # ensure enough space
```

## Fix 4: Handle Corruption Gracefully in Newer Versions

Newer Collector versions have better error handling for corrupted queues. Check if upgrading to the latest version resolves the crash:

```yaml
# Update the image to the latest version
containers:
- name: collector
  image: otel/opentelemetry-collector-contrib:0.121.0
```

Some versions will log a warning and start with an empty queue instead of crashing.

## Summary

Persistent queue corruption causes CrashLoopBackOff because the Collector cannot load the queue on startup. The immediate fix is to clear the queue data. For prevention, use compaction, limit queue size, ensure adequate disk space, and consider using an init container that validates queue integrity before the Collector starts.
