# How to Monitor Pod Events with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Monitoring, Event, Pod, Kubernetes

Description: Learn how to monitor pod events with Podman to track pod lifecycle changes and manage multi-container deployments effectively.

---

> Pod events give you visibility into the orchestration layer - understanding how your pod groups are managed is essential for multi-container applications.

Podman pods group multiple containers that share namespaces and network configurations, similar to Kubernetes pods. Monitoring pod events gives you visibility into pod creation, startup, shutdown, and removal. This is critical when running multi-container applications where containers within a pod depend on each other. This guide covers how to monitor pod events effectively.

---

## Understanding Pod Events

Podman pods emit their own set of events separate from container events.

```bash
# Pod events include:

# create  - Pod was created
# start   - Pod was started (infra container started)
# stop    - Pod was stopped
# kill    - Pod received a kill signal
# pause   - Pod was paused
# unpause - Pod was unpaused
# remove  - Pod was removed

# Filter for pod events only
podman events --filter type=pod
```

## Creating Pods and Observing Events

Set up a pod and watch the events it generates.

```bash
# Start monitoring pod events in the background
podman events --filter type=pod \
    --format '{{.Time}} [POD] {{.Status}} {{.Name}}' &
WATCHER_PID=$!
sleep 1

# Create a pod
podman pod create --name web-pod -p 8080:80

# Add containers to the pod
podman run -d --pod web-pod --name web-server nginx:latest
podman run -d --pod web-pod --name web-sidecar alpine sleep 600

# Stop the watcher
sleep 2
kill $WATCHER_PID 2>/dev/null
```

## Monitoring Pod Lifecycle Events

Track the full lifecycle of a pod from creation to removal.

```bash
#!/bin/bash
# pod-lifecycle.sh - Monitor pod lifecycle events

echo "Starting pod lifecycle monitor..."

podman events --filter type=pod --format json | \
while IFS= read -r event; do
    status=$(echo "$event" | jq -r '.Status')
    name=$(echo "$event" | jq -r '.Name // "unknown"')
    timestamp=$(echo "$event" | jq -r '.Time')

    case "$status" in
        create)
            echo "[${timestamp}] Pod CREATED: ${name}"
            ;;
        start)
            echo "[${timestamp}] Pod STARTED: ${name}"
            ;;
        stop)
            echo "[${timestamp}] Pod STOPPED: ${name}"
            ;;
        remove)
            echo "[${timestamp}] Pod REMOVED: ${name}"
            ;;
        kill)
            echo "[${timestamp}] Pod KILLED: ${name}"
            ;;
        *)
            echo "[${timestamp}] Pod ${status}: ${name}"
            ;;
    esac
done
```

## Monitoring Both Pod and Container Events Together

See the relationship between pod events and their container events.

```bash
# Monitor pod and container events simultaneously
podman events \
    --filter type=pod \
    --filter type=container \
    --format '[{{.Type}}] {{.Time}} {{.Status}} {{.Name}}'
```

This shows how pod operations trigger container operations:

```bash
# Demonstrate correlated events
podman pod create --name lifecycle-pod
podman run -d --pod lifecycle-pod --name lc-container alpine sleep 300

# Stopping a pod stops all its containers
podman pod stop lifecycle-pod

# Starting a pod starts all its containers
podman pod start lifecycle-pod

# View the correlated events
podman events --since 2m \
    --format '[{{.Type}}] {{.Time}} {{.Status}} {{.Name}}'
```

## Filtering Pod Events by Name

Monitor events for a specific pod.

```bash
# Watch events for a specific pod
podman events --filter type=pod --filter pod=web-pod --format json

# Alternatively, filter by pod name using grep
podman events --filter type=pod \
    --format '{{.Time}} {{.Status}} {{.Name}}' | grep "web-pod"
```

## Building a Pod Health Monitor

```bash
#!/bin/bash
# pod-health-monitor.sh - Monitor pod health and container states

echo "=== Pod Health Monitor ==="

while true; do
    clear
    echo "Pod Health Monitor - $(date)"
    echo ""

    # List all pods with their status
    printf "%-20s %-10s %-8s %-10s\n" "POD" "STATUS" "CONTAINERS" "RUNNING"
    printf "%-20s %-10s %-8s %-10s\n" "---" "------" "----------" "-------"

    podman pod ps --format '{{.Name}}\t{{.Status}}\t{{.NumberOfContainers}}\t{{.ContainerStatuses}}' 2>/dev/null | \
    while IFS=$'\t' read -r name status total container_statuses; do
        running=$(printf "%s" "$container_statuses" | tr ',' '\n' | grep -c '^running$')
        printf "%-20s %-10s %-8s %-10s\n" "$name" "$status" "$total" "$running"
    done

    echo ""
    echo "Recent pod events:"
    podman events --since 5m --filter type=pod \
        --format '  {{.Time}} {{.Status}} {{.Name}}' 2>/dev/null | tail -5

    echo ""
    echo "Refreshing every 10 seconds..."
    sleep 10
done
```

## Auditing Pod Operations

Track all pod operations for audit purposes.

```bash
#!/bin/bash
# pod-audit.sh - Audit pod operations

AUDIT_FILE="/tmp/pod-audit.jsonl"

echo "Auditing pod operations to: ${AUDIT_FILE}"

podman events --filter type=pod --format json | \
while IFS= read -r event; do
    # Enrich with additional context
    name=$(echo "$event" | jq -r '.Name // "unknown"')
    status=$(echo "$event" | jq -r '.Status')
    timestamp=$(echo "$event" | jq -r '.Time')

    # Get pod details if pod still exists
    pod_info=$(podman pod inspect "$name" 2>/dev/null | \
        jq '.[0] | {containers: (.Containers | length), infra: .InfraContainerID}' 2>/dev/null)

    # Build enriched audit entry
    audit_entry=$(echo "$event" | jq --argjson info "${pod_info:-null}" \
        '. + {pod_details: $info}')

    echo "$audit_entry" >> "$AUDIT_FILE"
    echo "[AUDIT] ${timestamp} | ${status} | ${name}"
done
```

## Detecting Pod Failures

Watch for pods that fail or have containers die unexpectedly.

```bash
#!/bin/bash
# pod-failure-detector.sh - Detect pod failures

echo "Monitoring for pod failures..."

# Watch for died events in pod containers
podman events --filter event=died --format json | \
while IFS= read -r event; do
    name=$(echo "$event" | jq -r '.Name // "unknown"')
    exit_code=$(echo "$event" | jq -r '.ContainerExitCode // "unknown"')

    # Check if this container belongs to a pod
    pod=$(podman inspect --format '{{.Pod}}' "$name" 2>/dev/null)

    if [ -n "$pod" ] && [ "$pod" != "" ]; then
        pod_name=$(podman pod inspect "$pod" --format '{{.Name}}' 2>/dev/null)
        echo "ALERT: Container '${name}' in pod '${pod_name}' died (exit: ${exit_code})"

        # Show pod status
        podman pod ps --filter "id=${pod}" --format \
            "Pod: {{.Name}} Status: {{.Status}}" 2>/dev/null
    fi
done
```

## Cleanup

```bash
# Remove test pods and containers
podman pod rm -f web-pod lifecycle-pod 2>/dev/null

# Clean up audit files
rm -f /tmp/pod-audit.jsonl
```

## Summary

Monitoring pod events with Podman gives you visibility into the orchestration layer of your multi-container applications. Pod events track the lifecycle of pod groups, complementing individual container events. By monitoring pod creation, startup, shutdown, and removal, and correlating these with container events within each pod, you can maintain full observability over your pod-based deployments. Combined with health monitoring and failure detection, pod event monitoring ensures you are always aware of the state of your multi-container workloads.
