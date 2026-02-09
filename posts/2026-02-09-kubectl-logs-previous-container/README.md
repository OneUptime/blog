# How to Use kubectl logs with Previous Container Logs After Crashes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Debugging, Logging

Description: Learn how to retrieve logs from crashed containers using kubectl logs with the previous flag to diagnose CrashLoopBackOff and other container restart issues.

---

When containers crash, their logs often disappear when the new container starts. Without access to logs from the crashed container, diagnosing the failure becomes difficult. Kubernetes retains logs from the previous container instance, and kubectl logs provides the --previous flag to retrieve them. This is critical for debugging CrashLoopBackOff, understanding intermittent failures, and investigating production incidents.

The previous container logs show what happened immediately before the crash, including stack traces, error messages, and the events leading to failure.

## Basic Previous Logs Usage

Retrieve logs from the previous container:

```bash
# Get logs from previous container instance
kubectl logs pod-name --previous

# Short form
kubectl logs pod-name -p

# With namespace
kubectl logs -n production pod-name --previous

# For specific container in multi-container pod
kubectl logs pod-name -c container-name --previous

# Follow previous logs (if container still exists)
kubectl logs pod-name --previous --tail=100
```

## Checking Container Restart Status

Identify pods that have restarted:

```bash
# Show pods with restart count
kubectl get pods

# Show pods with restarts > 0
kubectl get pods --field-selector=status.containerStatuses[*].restartCount!=0

# Detailed restart information
kubectl describe pod failing-pod | grep -A 5 "State:\|Last State:"

# See restart count and last termination
kubectl get pod failing-pod -o jsonpath='{range .status.containerStatuses[*]}{.name}{"\t"}{.restartCount}{"\t"}{.lastState.terminated.reason}{"\n"}{end}'
```

## Handling CrashLoopBackOff

Debug containers in CrashLoopBackOff:

```bash
# Check pod status
kubectl get pod crashloop-pod

# Get previous logs
kubectl logs crashloop-pod --previous

# Get recent logs before crash
kubectl logs crashloop-pod --previous --tail=50

# Get all previous logs with timestamps
kubectl logs crashloop-pod --previous --timestamps

# Check why it crashed
kubectl describe pod crashloop-pod | grep -A 10 "Last State:"

# See exit code and reason
kubectl get pod crashloop-pod -o jsonpath='{.status.containerStatuses[0].lastState.terminated}'
```

## Comparing Current and Previous Logs

Compare logs between container instances:

```bash
# Save current logs
kubectl logs pod-name > current.log

# Save previous logs
kubectl logs pod-name --previous > previous.log

# Compare
diff previous.log current.log

# Show what changed
diff -u previous.log current.log | less

# Find errors in previous logs
kubectl logs pod-name --previous | grep -i error

# Compare error counts
echo "Previous errors: $(kubectl logs pod-name --previous | grep -i error | wc -l)"
echo "Current errors: $(kubectl logs pod-name | grep -i error | wc -l)"
```

## Time-Based Log Retrieval

Get logs from specific time periods:

```bash
# Logs since last hour
kubectl logs pod-name --previous --since=1h

# Logs since specific time
kubectl logs pod-name --previous --since-time=2024-02-09T10:00:00Z

# Recent logs with timestamps
kubectl logs pod-name --previous --timestamps --tail=100

# Logs in specific time range
kubectl logs pod-name --previous --since-time=2024-02-09T10:00:00Z --timestamps | \
  awk '$1 < "2024-02-09T11:00:00Z"'
```

## Multi-Container Pod Logs

Handle previous logs in pods with multiple containers:

```bash
# List containers in pod
kubectl get pod multi-container-pod -o jsonpath='{.spec.containers[*].name}'

# Get previous logs for each container
for container in $(kubectl get pod multi-container-pod -o jsonpath='{.spec.containers[*].name}'); do
  echo "=== Previous logs for container: $container ==="
  kubectl logs multi-container-pod -c $container --previous
done

# Check which container crashed
kubectl get pod multi-container-pod -o jsonpath='{range .status.containerStatuses[*]}{.name}{"\t"}{.restartCount}{"\t"}{.lastState.terminated.reason}{"\n"}{end}'

# Get logs from crashed sidecar
kubectl logs multi-container-pod -c sidecar --previous
```

## Automated Crash Investigation Script

Create a script to automatically investigate crashes:

```bash
#!/bin/bash
# Save as investigate-crash.sh

POD_NAME=$1
NAMESPACE=${2:-default}

if [ -z "$POD_NAME" ]; then
    echo "Usage: $0 <pod-name> [namespace]"
    exit 1
fi

echo "=== Crash Investigation for $POD_NAME in namespace $NAMESPACE ==="
echo

# Check pod status
echo "Pod Status:"
kubectl get pod -n "$NAMESPACE" "$POD_NAME" -o wide
echo

# Check restart count
RESTART_COUNT=$(kubectl get pod -n "$NAMESPACE" "$POD_NAME" -o jsonpath='{.status.containerStatuses[0].restartCount}')
echo "Restart Count: $RESTART_COUNT"
echo

if [ "$RESTART_COUNT" -eq "0" ]; then
    echo "Pod has not restarted. No previous logs available."
    exit 0
fi

# Get last termination info
echo "Last Termination Info:"
kubectl get pod -n "$NAMESPACE" "$POD_NAME" -o jsonpath='{.status.containerStatuses[0].lastState.terminated}' | jq .
echo

# Get previous logs
echo "=== Previous Container Logs (last 100 lines) ==="
kubectl logs -n "$NAMESPACE" "$POD_NAME" --previous --tail=100
echo

# Search for common error patterns
echo "=== Error Analysis ==="
echo "Fatal errors:"
kubectl logs -n "$NAMESPACE" "$POD_NAME" --previous | grep -i "fatal" | head -5

echo
echo "Stack traces:"
kubectl logs -n "$NAMESPACE" "$POD_NAME" --previous | grep -A 10 -i "stack trace\|backtrace"

echo
echo "OOM errors:"
kubectl logs -n "$NAMESPACE" "$POD_NAME" --previous | grep -i "out of memory\|oom"

echo
echo "Panic errors:"
kubectl logs -n "$NAMESPACE" "$POD_NAME" --previous | grep -i "panic"

# Get pod events
echo
echo "=== Recent Pod Events ==="
kubectl get events -n "$NAMESPACE" --field-selector involvedObject.name="$POD_NAME" --sort-by='.lastTimestamp' | tail -10

# Save detailed logs
OUTPUT_FILE="/tmp/${POD_NAME}-crash-$(date +%Y%m%d-%H%M%S).log"
kubectl logs -n "$NAMESPACE" "$POD_NAME" --previous > "$OUTPUT_FILE"
echo
echo "Full previous logs saved to: $OUTPUT_FILE"
```

## Handling Init Container Failures

Debug init containers that fail:

```bash
# List init containers
kubectl get pod my-pod -o jsonpath='{.spec.initContainers[*].name}'

# Get logs from failed init container
kubectl logs my-pod -c init-container --previous

# Check init container status
kubectl get pod my-pod -o jsonpath='{.status.initContainerStatuses[*].lastState.terminated}'

# See all init container states
kubectl describe pod my-pod | grep -A 20 "Init Containers:"
```

## Exporting Previous Logs

Save previous logs for analysis:

```bash
# Export with metadata
kubectl logs pod-name --previous --timestamps > pod-crash.log

# Export from all containers
for container in $(kubectl get pod my-pod -o jsonpath='{.spec.containers[*].name}'); do
  kubectl logs my-pod -c $container --previous > "${container}-previous.log" 2>/dev/null || echo "No previous logs for $container"
done

# Create comprehensive crash report
cat > crash-report.txt <<EOF
Crash Report for: $POD_NAME
Generated: $(date)

Pod Status:
$(kubectl get pod $POD_NAME -o yaml)

Previous Logs:
$(kubectl logs $POD_NAME --previous)

Events:
$(kubectl get events --field-selector involvedObject.name=$POD_NAME)
EOF
```

## Monitoring for Crashes

Set up monitoring for container restarts:

```bash
#!/bin/bash
# Save as monitor-crashes.sh

NAMESPACE=${1:-default}
CHECK_INTERVAL=60

echo "Monitoring for crashes in namespace: $NAMESPACE"

while true; do
    # Find pods with recent restarts
    kubectl get pods -n "$NAMESPACE" -o json | \
      jq -r '.items[] | select(.status.containerStatuses[]?.restartCount > 0) | .metadata.name' | \
      while read pod; do
        RESTART_COUNT=$(kubectl get pod -n "$NAMESPACE" "$pod" -o jsonpath='{.status.containerStatuses[0].restartCount}')

        # Check if this is a new restart
        if [ ! -f "/tmp/restart-${pod}.count" ] || [ "$RESTART_COUNT" -gt "$(cat /tmp/restart-${pod}.count)" ]; then
            echo "$(date): CRASH DETECTED - Pod: $pod, Restart Count: $RESTART_COUNT"

            # Save previous logs
            kubectl logs -n "$NAMESPACE" "$pod" --previous > "/tmp/crash-${pod}-$(date +%s).log" 2>&1

            # Update restart count
            echo "$RESTART_COUNT" > "/tmp/restart-${pod}.count"

            # Send alert (customize this)
            echo "Alert: Pod $pod crashed! Check /tmp/crash-${pod}-*.log"
        fi
      done

    sleep "$CHECK_INTERVAL"
done
```

## Analyzing Common Crash Patterns

Identify common failure patterns:

```bash
# Out of Memory (OOM) crashes
kubectl logs pod-name --previous | grep -i "out of memory\|oom killed"
kubectl describe pod pod-name | grep -A 5 "OOMKilled"

# Segmentation faults
kubectl logs pod-name --previous | grep -i "segmentation fault\|sigsegv"

# Unhandled exceptions
kubectl logs pod-name --previous | grep -A 20 -i "unhandled exception\|uncaught exception"

# Application-specific errors
kubectl logs pod-name --previous | grep -E "ERROR|FATAL|CRITICAL" | tail -20

# Connection failures
kubectl logs pod-name --previous | grep -i "connection refused\|connection timeout\|connection reset"
```

## Best Practices

Always check previous logs when investigating CrashLoopBackOff. Save previous logs before they're overwritten by new restarts. Include timestamps in log exports for correlation. Check both application logs and system events. Monitor restart counts to detect recurring issues. Set up alerts for pods with high restart counts. Document crash patterns for future reference.

Previous container logs are often the only evidence of what caused a crash, making the --previous flag one of the most valuable kubectl logs options for troubleshooting production issues.
