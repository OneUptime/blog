# How to Use kubectl logs to Debug Container Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, kubectl, Logging, Debugging, Troubleshooting

Description: A practical guide to using kubectl logs for debugging container issues, including streaming logs, filtering output, accessing previous container logs, and troubleshooting common logging problems.

---

Container logs are your first line of defense when debugging Kubernetes applications. The `kubectl logs` command provides direct access to container stdout and stderr, making it essential for understanding what your applications are doing and why they might be failing.

## Basic Log Commands

### View Pod Logs

```bash
# Get logs from a pod
kubectl logs my-pod

# Get logs from specific namespace
kubectl logs -n production my-pod

# Limit output to last N lines
kubectl logs my-pod --tail=100

# Get logs from last hour
kubectl logs my-pod --since=1h

# Get logs since specific time
kubectl logs my-pod --since-time="2024-01-25T10:00:00Z"
```

### Stream Logs in Real-Time

```bash
# Follow logs (like tail -f)
kubectl logs -f my-pod

# Follow with timestamp
kubectl logs -f my-pod --timestamps

# Follow multiple pods using selector
kubectl logs -f -l app=web
```

## Multi-Container Pods

When a pod has multiple containers, specify which one:

```bash
# List containers in pod
kubectl get pod my-pod -o jsonpath='{.spec.containers[*].name}'

# Get logs from specific container
kubectl logs my-pod -c nginx

# Get logs from all containers
kubectl logs my-pod --all-containers=true

# Follow logs from specific container
kubectl logs -f my-pod -c sidecar
```

## Init Container Logs

```bash
# List init containers
kubectl get pod my-pod -o jsonpath='{.spec.initContainers[*].name}'

# Get init container logs
kubectl logs my-pod -c init-container-name

# Get logs from all init containers
kubectl logs my-pod --all-containers=true
```

## Previous Container Logs

When a container crashes and restarts, access logs from the previous instance:

```bash
# Get logs from previous container instance
kubectl logs my-pod --previous

# Previous logs from specific container
kubectl logs my-pod -c app --previous

# Combine with tail
kubectl logs my-pod --previous --tail=200
```

## Logs from Multiple Pods

### Using Labels

```bash
# Get logs from all pods matching label
kubectl logs -l app=web

# Follow logs from all matching pods
kubectl logs -f -l app=web

# With max-log-requests to handle many pods
kubectl logs -l app=web --max-log-requests=10
```

### Using Deployment/ReplicaSet

```bash
# Logs from deployment (picks one pod)
kubectl logs deployment/web-app

# Logs from specific container in deployment
kubectl logs deployment/web-app -c nginx
```

## Filtering and Searching Logs

### Using grep

```bash
# Filter logs locally
kubectl logs my-pod | grep -i error

# Filter with context
kubectl logs my-pod | grep -A 5 -B 5 "exception"

# Count occurrences
kubectl logs my-pod | grep -c "ERROR"

# Multiple patterns
kubectl logs my-pod | grep -E "(error|warning|critical)"
```

### Using jq for JSON Logs

```bash
# Parse JSON logs
kubectl logs my-pod | jq '.'

# Filter by field
kubectl logs my-pod | jq 'select(.level == "error")'

# Extract specific fields
kubectl logs my-pod | jq '{time: .timestamp, message: .msg}'

# Filter and format
kubectl logs my-pod | jq 'select(.status >= 500) | {path: .path, status: .status}'
```

## Common Debugging Scenarios

### Scenario 1: Application Crash

```bash
# Check current logs
kubectl logs my-pod

# If container restarted, check previous logs
kubectl logs my-pod --previous

# Check pod events for context
kubectl describe pod my-pod | tail -20
```

### Scenario 2: Slow Startup

```bash
# Watch logs during startup
kubectl logs -f my-pod

# Check init container logs
kubectl logs my-pod -c init-db --timestamps

# Look for startup timing
kubectl logs my-pod | grep -i "started\|ready\|listening"
```

### Scenario 3: Connection Errors

```bash
# Search for connection-related errors
kubectl logs my-pod | grep -i "connection\|timeout\|refused"

# Check recent logs
kubectl logs my-pod --since=5m | grep -i error
```

### Scenario 4: Memory Issues

```bash
# Look for OOM or memory warnings
kubectl logs my-pod | grep -i "memory\|oom\|heap"

# Check for garbage collection issues
kubectl logs my-pod | grep -i "gc\|garbage"
```

### Scenario 5: Request Errors

```bash
# Filter HTTP errors
kubectl logs my-pod | grep -E "HTTP/[0-9.]+ [45][0-9]{2}"

# JSON logs - filter 5xx errors
kubectl logs my-pod | jq 'select(.status >= 500)'
```

## Log Analysis Tips

### Count Errors by Type

```bash
# Count log levels
kubectl logs my-pod | grep -oE "(INFO|WARN|ERROR|DEBUG)" | sort | uniq -c

# For JSON logs
kubectl logs my-pod | jq -r '.level' | sort | uniq -c
```

### Time-Based Analysis

```bash
# Get logs with timestamps
kubectl logs my-pod --timestamps

# Filter by time range (using timestamps in log)
kubectl logs my-pod --timestamps | awk '$1 >= "2024-01-25T10:00:00" && $1 <= "2024-01-25T11:00:00"'
```

### Export Logs for Analysis

```bash
# Save logs to file
kubectl logs my-pod > pod-logs.txt

# Save with timestamps
kubectl logs my-pod --timestamps > pod-logs-timestamped.txt

# Save all pod logs
kubectl logs -l app=web --all-containers > all-web-logs.txt
```

## Stern: Enhanced Log Tailing

For better multi-pod log viewing, use stern:

```bash
# Install stern
brew install stern    # macOS
# or download from https://github.com/stern/stern

# Tail all pods matching pattern
stern web-app

# Tail with specific container
stern web-app -c nginx

# Tail across namespaces
stern web-app --all-namespaces

# With color output
stern web-app --output=raw

# Filter by content
stern web-app --include="error"
stern web-app --exclude="health"
```

## Troubleshooting Log Issues

### No Logs Available

```bash
# Check if container is running
kubectl get pod my-pod

# Check container status
kubectl describe pod my-pod | grep -A 5 "Container ID"

# Application might not be logging to stdout
kubectl exec my-pod -- cat /var/log/app.log
```

### Logs Too Verbose

```bash
# Limit output
kubectl logs my-pod --tail=100

# Use since to limit time range
kubectl logs my-pod --since=10m

# Filter out noise
kubectl logs my-pod | grep -v "DEBUG\|TRACE"
```

### Log Rotation

```bash
# Kubernetes rotates logs automatically
# Check kubelet log settings:
# --container-log-max-size (default 10Mi)
# --container-log-max-files (default 5)

# To access rotated logs, check node directly
# /var/log/pods/<namespace>_<pod>_<uid>/<container>/
```

### Binary/Non-Text Logs

```bash
# If logs contain binary data
kubectl logs my-pod | strings

# Or use hexdump for analysis
kubectl logs my-pod | hexdump -C | head
```

## Centralized Logging

For production, send logs to a centralized system:

### Fluentd Sidecar

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-logging
spec:
  containers:
    - name: app
      image: myapp:v1
      volumeMounts:
        - name: logs
          mountPath: /var/log/app
    - name: fluentd
      image: fluent/fluentd:v1.16
      volumeMounts:
        - name: logs
          mountPath: /var/log/app
        - name: fluentd-config
          mountPath: /fluentd/etc
  volumes:
    - name: logs
      emptyDir: {}
    - name: fluentd-config
      configMap:
        name: fluentd-config
```

### Structured Logging Best Practice

```python
# Python example - structured logging
import json
import sys

def log(level, message, **kwargs):
    entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "level": level,
        "message": message,
        **kwargs
    }
    print(json.dumps(entry), file=sys.stdout, flush=True)

# Usage
log("INFO", "Request processed", path="/api/users", status=200, duration_ms=45)
```

Output:
```json
{"timestamp": "2024-01-25T10:30:00.000Z", "level": "INFO", "message": "Request processed", "path": "/api/users", "status": 200, "duration_ms": 45}
```

## Quick Reference

```bash
# Basic logs
kubectl logs POD

# Stream logs
kubectl logs -f POD

# Previous container
kubectl logs POD --previous

# Specific container
kubectl logs POD -c CONTAINER

# All containers
kubectl logs POD --all-containers

# By label
kubectl logs -l app=web

# Last N lines
kubectl logs POD --tail=100

# Since duration
kubectl logs POD --since=1h

# With timestamps
kubectl logs POD --timestamps
```

## Best Practices

1. **Always log to stdout/stderr** - Kubernetes captures these automatically
2. **Use structured logging (JSON)** - Easier to parse and analyze
3. **Include correlation IDs** - Track requests across services
4. **Set appropriate log levels** - Debug in dev, info/warn in prod
5. **Include timestamps** - Essential for debugging timing issues
6. **Avoid logging sensitive data** - Never log passwords or tokens
7. **Use centralized logging** - kubectl logs does not scale for production

---

kubectl logs is the starting point for debugging container issues. Master the options for filtering, streaming, and accessing previous container logs. For production systems, complement kubectl logs with centralized logging solutions that provide search, aggregation, and long-term retention.
