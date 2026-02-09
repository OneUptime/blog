# How to Configure kubectl logs with Timestamps and Since-Time Filters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, kubectl, Logging, Debugging, Troubleshooting

Description: Master kubectl logs command with timestamps, time-based filters, and advanced options for efficient Kubernetes application debugging and log analysis.

---

The kubectl logs command is one of the most frequently used debugging tools in Kubernetes. While basic usage is straightforward, advanced options like timestamps and time-based filters can dramatically improve your troubleshooting efficiency by helping you pinpoint exactly when issues occurred.

## Understanding kubectl logs Basics

The kubectl logs command retrieves container logs from pods, but it offers much more than simple log retrieval. Understanding its full capabilities helps you debug faster and more effectively.

Basic syntax:

```bash
# Get logs from a single-container pod
kubectl logs pod-name

# Get logs from a specific container in a multi-container pod
kubectl logs pod-name -c container-name

# Get logs from all containers in a pod
kubectl logs pod-name --all-containers=true
```

## Adding Timestamps to Logs

Timestamps are crucial for correlating logs with events, metrics, and traces. The `--timestamps` flag adds RFC3339 timestamps to each log line:

```bash
# Enable timestamps
kubectl logs myapp-7d8f9b6c5d-k4m2n --timestamps

# Output example:
# 2026-02-09T10:30:45.123456789Z Starting application server
# 2026-02-09T10:30:46.234567890Z Database connection established
# 2026-02-09T10:30:47.345678901Z Listening on port 8080
```

This is especially useful when debugging issues that occurred at specific times:

```bash
# Get timestamped logs and search for errors around 10:30 AM
kubectl logs myapp-pod --timestamps | grep "2026-02-09T10:30"

# Compare logs from multiple pods at the same time
kubectl logs pod-1 --timestamps > pod1.log
kubectl logs pod-2 --timestamps > pod2.log
diff -u pod1.log pod2.log
```

## Using Since-Time Filters

The `--since-time` flag retrieves logs from a specific timestamp onwards:

```bash
# Get logs since a specific time (RFC3339 format)
kubectl logs myapp-pod --since-time="2026-02-09T10:00:00Z"

# Get logs since a specific time with timezone
kubectl logs myapp-pod --since-time="2026-02-09T10:00:00+05:30"

# Include timestamps for better context
kubectl logs myapp-pod --since-time="2026-02-09T10:00:00Z" --timestamps
```

This is invaluable when investigating incidents:

```bash
# Investigate logs after a deployment
DEPLOY_TIME=$(kubectl get deploy myapp -o jsonpath='{.metadata.creationTimestamp}')
kubectl logs -l app=myapp --since-time="$DEPLOY_TIME" --timestamps

# Check logs after a known incident
kubectl logs myapp-pod --since-time="2026-02-09T14:23:00Z" --timestamps | grep -i error
```

## Using Since Duration Filters

The `--since` flag is often more convenient than `--since-time` for relative time periods:

```bash
# Get logs from the last 5 minutes
kubectl logs myapp-pod --since=5m

# Get logs from the last hour
kubectl logs myapp-pod --since=1h

# Get logs from the last 2 days
kubectl logs myapp-pod --since=48h

# Common time units: s (seconds), m (minutes), h (hours)
```

Combine with timestamps for precise debugging:

```bash
# Find errors in the last 30 minutes with timestamps
kubectl logs myapp-pod --since=30m --timestamps | grep -i error

# Get recent logs from all pods in a deployment
kubectl logs -l app=myapp --since=15m --timestamps --prefix

# Monitor recent logs across a namespace
kubectl logs -n production --since=10m --all-containers --timestamps --selector=tier=frontend
```

## Controlling Log Output Volume

Limit the number of log lines to avoid overwhelming output:

```bash
# Get the last 100 lines
kubectl logs myapp-pod --tail=100

# Get last 50 lines with timestamps
kubectl logs myapp-pod --tail=50 --timestamps

# Combine tail with since duration
kubectl logs myapp-pod --tail=200 --since=1h --timestamps
```

This is particularly useful for containers with verbose logging:

```bash
# Quick check of recent activity
kubectl logs myapp-pod --tail=20

# Get last hour but limit to 1000 lines
kubectl logs myapp-pod --since=1h --tail=1000

# Check initialization logs
kubectl logs myapp-pod --tail=50 | head -20
```

## Following Logs in Real-Time

The `--follow` or `-f` flag streams logs as they are generated:

```bash
# Follow logs in real-time
kubectl logs myapp-pod --follow

# Follow with timestamps
kubectl logs myapp-pod --follow --timestamps

# Follow recent logs only
kubectl logs myapp-pod --follow --since=5m --timestamps

# Follow with line limit
kubectl logs myapp-pod --follow --tail=50 --timestamps
```

For deployment-wide monitoring:

```bash
# Follow logs from all pods with a label
kubectl logs -l app=myapp --follow --timestamps --prefix

# Follow logs from multiple containers
kubectl logs myapp-pod --all-containers --follow --timestamps

# Follow logs with filtering
kubectl logs myapp-pod --follow --timestamps | grep -i "error\|warn"
```

## Advanced Filtering Techniques

Combine kubectl logs with Unix tools for powerful analysis:

```bash
# Find all errors in the last hour
kubectl logs myapp-pod --since=1h --timestamps | grep -i error

# Count error occurrences by minute
kubectl logs myapp-pod --since=1h --timestamps | grep -i error | cut -d':' -f1-2 | sort | uniq -c

# Extract logs between two timestamps
kubectl logs myapp-pod --timestamps | awk '/2026-02-09T10:00/,/2026-02-09T11:00/'

# Find the busiest 5-minute window
kubectl logs myapp-pod --since=1h --timestamps | cut -d':' -f1-2 | sort | uniq -c | sort -nr | head -1
```

Create reusable functions for common patterns:

```bash
# Add to .bashrc or .zshrc
klogs-error() {
  kubectl logs "$1" --since="${2:-1h}" --timestamps | grep -i error
}

klogs-time() {
  kubectl logs "$1" --since-time="$2" --timestamps
}

klogs-between() {
  kubectl logs "$1" --timestamps | awk "/$2/,/$3/"
}

# Usage:
klogs-error myapp-pod 30m
klogs-time myapp-pod "2026-02-09T10:00:00Z"
klogs-between myapp-pod "10:00" "11:00"
```

## Debugging Multi-Container Pods

Handle logs from pods with multiple containers:

```bash
# List containers in a pod
kubectl get pod myapp-pod -o jsonpath='{.spec.containers[*].name}'

# Get logs from each container with timestamps
for container in $(kubectl get pod myapp-pod -o jsonpath='{.spec.containers[*].name}'); do
  echo "=== Container: $container ==="
  kubectl logs myapp-pod -c $container --since=10m --timestamps
  echo ""
done

# Get logs from all containers with prefixes
kubectl logs myapp-pod --all-containers --timestamps --prefix --since=15m

# Compare logs from two containers
diff <(kubectl logs myapp-pod -c app --timestamps) <(kubectl logs myapp-pod -c sidecar --timestamps)
```

## Accessing Previous Container Logs

When a container crashes and restarts, access previous logs:

```bash
# Get logs from previous container instance
kubectl logs myapp-pod --previous

# Get previous logs with timestamps
kubectl logs myapp-pod --previous --timestamps

# Check why container restarted
kubectl logs myapp-pod --previous --tail=100 --timestamps

# Get logs from previous container in multi-container pod
kubectl logs myapp-pod -c container-name --previous --timestamps
```

Debug crashloop scenarios:

```bash
# Compare current and previous logs
echo "=== Previous Container ===" > comparison.txt
kubectl logs myapp-pod --previous --timestamps >> comparison.txt
echo "" >> comparison.txt
echo "=== Current Container ===" >> comparison.txt
kubectl logs myapp-pod --timestamps >> comparison.txt

# Find the crash point
kubectl logs myapp-pod --previous --timestamps | tail -50
```

## Log Aggregation Patterns

Collect logs from multiple pods efficiently:

```bash
# Get logs from all pods in a deployment since a specific time
for pod in $(kubectl get pods -l app=myapp -o name); do
  echo "=== $pod ==="
  kubectl logs $pod --since-time="2026-02-09T10:00:00Z" --timestamps
done

# Aggregate logs by label with timestamps
kubectl logs -l app=myapp --since=30m --timestamps --prefix | sort

# Save logs from all pods to files
for pod in $(kubectl get pods -l app=myapp -o jsonpath='{.items[*].metadata.name}'); do
  kubectl logs $pod --since=1h --timestamps > "${pod}-logs.txt"
done
```

## Performance Considerations

When working with large log volumes:

```bash
# Limit initial output with tail
kubectl logs myapp-pod --tail=1000 --timestamps

# Use since duration instead of all logs
kubectl logs myapp-pod --since=1h --timestamps

# Stream to file for large outputs
kubectl logs myapp-pod --since=6h --timestamps > app-logs.txt

# Process logs in chunks
kubectl logs myapp-pod --since-time="2026-02-09T10:00:00Z" --timestamps | head -10000 > chunk1.txt
kubectl logs myapp-pod --since-time="2026-02-09T11:00:00Z" --timestamps | head -10000 > chunk2.txt
```

## Troubleshooting Common Scenarios

### Finding When an Error First Occurred

```bash
# Get all logs with timestamps
kubectl logs myapp-pod --timestamps > all-logs.txt

# Find first occurrence of error
grep -i "connection refused" all-logs.txt | head -1

# Get context around first error
ERROR_TIME=$(grep -i "error" all-logs.txt | head -1 | cut -d' ' -f1)
kubectl logs myapp-pod --since-time="$ERROR_TIME" --timestamps | head -50
```

### Correlating Logs with Events

```bash
# Get pod events with timestamps
kubectl get events --field-selector involvedObject.name=myapp-pod --sort-by='.lastTimestamp'

# Get logs around event time
EVENT_TIME="2026-02-09T10:15:30Z"
kubectl logs myapp-pod --since-time="$EVENT_TIME" --timestamps | head -100
```

### Monitoring Deployment Rollouts

```bash
# Watch new pods during rollout
kubectl logs -l app=myapp --follow --since=1m --timestamps --prefix

# Check if new version has errors
NEW_PODS=$(kubectl get pods -l app=myapp,version=v2 -o name)
for pod in $NEW_PODS; do
  kubectl logs $pod --since-time="$(kubectl get $pod -o jsonpath='{.status.startTime}')" --timestamps | grep -i error
done
```

## Integrating with Log Management

Export logs to external systems:

```bash
# Export to JSON format
kubectl logs myapp-pod --since=1h --timestamps | \
  awk '{timestamp=$1; $1=""; print "{\"timestamp\":\""timestamp"\",\"message\":\""$0"\"}"}' > logs.json

# Stream to log aggregator
kubectl logs myapp-pod --follow --timestamps | \
  while read line; do
    curl -X POST https://logs.example.com/ingest -d "$line"
  done

# Export with metadata
for pod in $(kubectl get pods -l app=myapp -o name); do
  kubectl logs $pod --since=1h --timestamps | \
    jq -R -s -c "split(\"\n\") | map(select(length > 0) | {pod: \"$pod\", log: .})"
done
```

## Conclusion

Mastering kubectl logs with timestamps and time-based filters transforms your debugging workflow. By combining these options with Unix text processing tools, you can quickly identify issues, correlate events, and analyze application behavior across your Kubernetes cluster.

The key is knowing which combination of flags to use for each scenario - whether you need real-time monitoring with `--follow`, historical analysis with `--since-time`, or focused investigation with `--tail` and `--timestamps`. These tools form the foundation of effective Kubernetes troubleshooting.
