# How to Fix DaemonSet Collector Not Collecting Logs from All Pods Due to

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Log, DaemonSet, Filelog Receiver

Description: Fix incorrect filelog receiver path patterns that prevent the DaemonSet Collector from collecting logs from all pods.

Running the OpenTelemetry Collector as a DaemonSet is the standard approach for collecting container logs from Kubernetes nodes. The filelog receiver reads log files from the node's filesystem, but if the path pattern does not match where your container runtime writes logs, you will miss logs from some or all pods.

## How Container Logs Work in Kubernetes

Containers write to stdout/stderr, and the container runtime captures those streams and writes them to files on the node. By default, the kubelet directs the runtime to write pod logs under `/var/log/pods`:

```text
# Kubernetes pod log files
/var/log/pods/<namespace>_<pod-name>_<pod-uid>/<container-name>/<restart-count>.log

# Convenience symlinks
/var/log/containers/<pod-name>_<namespace>_<container-name>-<container-id>.log
```

The `/var/log/containers/` path typically contains symlinks that point to the actual log files under `/var/log/pods/`.

## The Common Misconfiguration

A frequently copied configuration only targets one path pattern:

```yaml
# This might miss logs depending on your container runtime
receivers:
  filelog:
    include:
      - /var/log/containers/*.log
```

The problem: this can work in many clusters, but it depends on the `/var/log/containers/` symlinks and their targets being present inside the Collector container. If those links are missing, or if they point to paths that are not mounted into the Collector, logs can be missed.

## The Correct Configuration

Target the actual log files under `/var/log/pods/`:

```yaml
receivers:
  filelog:
    include:
      - /var/log/pods/*/*/*.log
    # Exclude Collector's own logs to avoid feedback loops
    exclude:
      - /var/log/pods/*/otel-collector/*.log
    start_at: end  # Only collect new logs, not historical
    include_file_path: true
    include_file_name: false
    operators:
      # Parse Kubernetes container logs, including Docker, CRI-O, and containerd formats
      - type: container
        id: container-parser
```

## Mounting the Right Host Paths

The DaemonSet pod needs access to the host's log directory:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: otel-collector
  namespace: observability
spec:
  selector:
    matchLabels:
      app: otel-collector
  template:
    metadata:
      labels:
        app: otel-collector
    spec:
      serviceAccountName: otel-collector
      containers:
        - name: collector
          image: otel/opentelemetry-collector-contrib:latest
          volumeMounts:
            # Mount the pod logs directory
            - name: varlogpods
              mountPath: /var/log/pods
              readOnly: true
            # Mount the container logs directory (symlinks)
            - name: varlogcontainers
              mountPath: /var/log/containers
              readOnly: true
            # Some runtimes need the docker data directory
            - name: varlibdockercontainers
              mountPath: /var/lib/docker/containers
              readOnly: true
      volumes:
        - name: varlogpods
          hostPath:
            path: /var/log/pods
        - name: varlogcontainers
          hostPath:
            path: /var/log/containers
        - name: varlibdockercontainers
          hostPath:
            path: /var/lib/docker/containers
```

## Debugging Missing Logs

```bash
# 1. Check what log files exist on the node
kubectl debug node/my-node -it --image=busybox -- ls /host/var/log/pods/

# 2. Check if the expected pod's log directory exists
kubectl debug node/my-node -it --image=busybox -- \
  ls /host/var/log/pods/my-namespace_my-pod-name_uid/

# 3. Check the actual log file content
kubectl debug node/my-node -it --image=busybox -- \
  tail -5 /host/var/log/pods/my-namespace_my-pod-name_uid/my-container/0.log

# 4. Check the Collector's own logs for filelog receiver errors
kubectl logs -n observability -l app=otel-collector --tail=100 | grep -i "filelog\|file_input"
```

## Log Rotation Handling

Kubernetes rotates container logs when they reach the kubelet `containerLogMaxSize` limit (10Mi by default). Rotated files keep the original log name with an added suffix:

```text
0.log                      # Current log file
0.log.20260206-120000      # Previous rotation
0.log.20260206-121500.gz   # Older compressed rotation
```

Make sure your include pattern captures rotated files if you need historical logs:

```yaml
receivers:
  filelog:
    include:
      - /var/log/pods/*/*/*.log
      - /var/log/pods/*/*/*.log.*  # Include rotated log files
    start_at: beginning  # Read from the start for rotated files
```

## Checkpoint Storage

The filelog receiver tracks its position in each file using checkpoints. Without persistent storage, a Collector restart means re-reading all log files:

```yaml
receivers:
  filelog:
    include:
      - /var/log/pods/*/*/*.log
    storage: file_storage  # Use persistent checkpoint storage

extensions:
  file_storage:
    directory: /var/lib/otelcol/file_storage
    timeout: 10s
```

Mount a persistent directory for checkpoints:

```yaml
volumeMounts:
  - name: checkpoint-storage
    mountPath: /var/lib/otelcol/file_storage
volumes:
  - name: checkpoint-storage
    hostPath:
      path: /var/lib/otelcol/file_storage
      type: DirectoryOrCreate
```

## Testing the Full Pipeline

After fixing the configuration, verify logs are flowing:

```bash
# Create a test pod that writes to stdout
kubectl run log-test --image=busybox --restart=Never -- \
  sh -c 'while true; do echo "test log $(date)"; sleep 5; done'

# Check that the Collector picks up the logs
kubectl logs -n observability -l app=otel-collector --tail=20 | grep "log-test"

# Clean up
kubectl delete pod log-test
```

Getting the filelog receiver path right is essential for complete log collection. Always verify the actual log file locations on your nodes rather than assuming a standard path.
