# How to Use kubectl events to View Cluster Events with Filtering and Sorting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, kubectl, Troubleshooting

Description: Master kubectl events to view, filter, and sort Kubernetes cluster events for faster troubleshooting of pod failures, scheduling issues, and system problems.

---

Kubernetes events track cluster activities: pod starts, failures, scheduling decisions, and controller actions. The kubectl events command provides quick event viewing, while kubectl get events adds field selectors and sorting to find relevant events quickly without parsing verbose describe output.

## Understanding Kubernetes Events

Events are time-limited records of cluster activities:

```bash
# View all events in current namespace

kubectl events

# Events expire after 1 hour by default unless the API server --event-ttl is changed
```

Events contain type, reason, a message or note, and object reference information.

## Basic Event Viewing

List events with standard options:

```bash
# View events in current namespace
kubectl events

# View events across all namespaces
kubectl events --all-namespaces

# Short form
kubectl events -A

# View events in specific namespace
kubectl events -n production
```

This shows recent cluster activity.

## Sorting Events by Time

Order events chronologically:

```bash
# Sort by event timestamp
kubectl get events --sort-by='.lastTimestamp'

# Sort by first recorded timestamp
kubectl get events --sort-by='.firstTimestamp'

# View most recent events
kubectl get events --sort-by='.lastTimestamp' | tail -20

# Watch events as they occur
kubectl events --watch
```

Sorting reveals event sequences and timing.

## Filtering by Event Type

Focus on warning events:

```bash
# Show only Warning events
kubectl events --types=Warning

# Show only Normal events
kubectl events --types=Normal

# Show multiple types
kubectl events --types=Warning,Normal

# Across all namespaces
kubectl events --all-namespaces --types=Warning
```

Warnings indicate problems needing attention.

## Filtering by Involved Object

View events for specific resources:

```bash
# Events for a specific pod
kubectl events --for pod/webapp-pod

# Events for a deployment
kubectl events --for deployment/webapp-deployment

# Events for a node
kubectl events --for node/worker-1

# Events for a specific kind
kubectl get events --field-selector involvedObject.kind=Pod

# Combine filters
kubectl get events --field-selector involvedObject.name=webapp,involvedObject.kind=Pod
```

This isolates events related to specific resources.

## Filtering by Reason

Find events with specific reasons:

```bash
# Failed scheduling events
kubectl get events --field-selector reason=FailedScheduling

# Image pull errors
kubectl get events --field-selector reason=Failed

# Pod killed events
kubectl get events --field-selector reason=Killing

# Successful scheduling
kubectl get events --field-selector reason=Scheduled
```

Reason filtering identifies common failure patterns.

## Filtering by Namespace

View events from specific namespaces:

```bash
# Events in production namespace
kubectl events -n production

# Events in kube-system
kubectl events -n kube-system

# All namespaces sorted by namespace
kubectl get events -A --sort-by='.metadata.namespace'
```

Namespace filtering scopes troubleshooting.

## Combining Multiple Filters

Use multiple field selectors:

```bash
# Warning events for specific pod
kubectl events \
  --for pod/webapp \
  --types=Warning

# Events for pods that failed scheduling
kubectl get events \
  --field-selector involvedObject.kind=Pod,reason=FailedScheduling

# Warning events in specific namespace
kubectl events -n production --types=Warning
```

Multiple filters narrow results precisely.

## Watching Events in Real-Time

Monitor events as they occur:

```bash
# Watch all events
kubectl events --watch

# Watch with types filter
kubectl events --watch --types=Warning

# Watch for specific object
kubectl events --watch --for pod/webapp

# Watch across all namespaces
kubectl events --watch --all-namespaces
```

Real-time watching reveals ongoing issues immediately.

## Event Output Formats

Change output format for different uses:

```bash
# Default table format
kubectl events

# Wide output with more columns
kubectl get events -o wide

# YAML output
kubectl events -o yaml

# JSON output
kubectl events -o json

# Custom columns
kubectl get events -o custom-columns=LAST-SEEN:.lastTimestamp,TYPE:.type,REASON:.reason,MESSAGE:.message
```

Different formats suit different analysis needs.

## Limiting Event Output

Control result count:

```bash
# Show first 10 events
kubectl events | head -10

# Show most recent 20 events by time
kubectl get events --sort-by='.lastTimestamp' | tail -20
```

Limits prevent overwhelming output.

## Finding Image Pull Failures

Debug container image issues:

```bash
# Image pull errors
kubectl get events --field-selector reason=Failed,type=Warning

# Back-off pulling image events
kubectl get events --field-selector reason=BackOff

# Specific pod image issues
kubectl get events --field-selector involvedObject.name=webapp,reason=Failed
```

Image events reveal registry or credential problems.

## Identifying Resource Pressure

Find nodes under resource pressure:

```bash
# Memory pressure events
kubectl get events --field-selector reason=NodeHasMemoryPressure

# Disk pressure events
kubectl get events --field-selector reason=NodeHasDiskPressure

# PID pressure events
kubectl get events --field-selector reason=NodeHasPIDPressure

# All pressure events
kubectl get events --all-namespaces | grep Pressure
```

Pressure events indicate resource exhaustion.

## Debugging Pod Evictions

Find why pods were evicted:

```bash
# Eviction events
kubectl get events --field-selector reason=Evicted

# With message details
kubectl get events --field-selector reason=Evicted -o wide

# Recent evictions
kubectl get events --sort-by='.lastTimestamp' --field-selector reason=Evicted | tail -10
```

Evictions indicate resource or policy issues.

## Monitoring Scheduling Failures

Identify pods that can't schedule:

```bash
# Failed scheduling events
kubectl get events --field-selector reason=FailedScheduling

# Show which pods and why
kubectl get events --field-selector reason=FailedScheduling -o wide

# Recent scheduling failures
kubectl get events --sort-by='.lastTimestamp' --field-selector reason=FailedScheduling
```

Scheduling failures reveal resource or taint issues.

## Finding Liveness Probe Failures

Debug health check issues:

```bash
# Liveness probe failures
kubectl events | grep -i "liveness probe failed"

# Unhealthy events
kubectl get events --field-selector reason=Unhealthy

# For specific pod
kubectl events --for pod/webapp | grep -i liveness
```

Probe failures indicate application health problems.

## Tracking Configuration Updates

See events involving configuration resources:

```bash
# ConfigMap update events
kubectl get events --field-selector involvedObject.kind=ConfigMap

# Secret update events
kubectl get events --field-selector involvedObject.kind=Secret

# Deployment scaling events
kubectl get events --field-selector involvedObject.kind=Deployment,reason=ScalingReplicaSet
```

These filters show events related to configuration resources when controllers emit them.

## Analyzing Event Patterns

Identify recurring issues:

```bash
#!/bin/bash
# analyze-events.sh

echo "Most common event reasons:"
kubectl get events --all-namespaces -o json | \
  jq -r '.items[].reason' | \
  sort | uniq -c | sort -rn | head -10

echo -e "\nMost affected resources:"
kubectl get events --all-namespaces -o json | \
  jq -r '.items[].involvedObject.name' | \
  sort | uniq -c | sort -rn | head -10

echo -e "\nEvent type distribution:"
kubectl get events --all-namespaces -o json | \
  jq -r '.items[].type' | \
  sort | uniq -c
```

Pattern analysis reveals systemic issues.

## Creating Event Alerts

Monitor events for alerting:

```bash
#!/bin/bash
# event-monitor.sh

# Check for critical events
CRITICAL_EVENTS=$(kubectl get events --field-selector type=Warning --all-namespaces -o json | \
  jq -r '.items[] | select(.reason == "FailedScheduling" or .reason == "Evicted" or .reason == "Failed") | .message' | \
  wc -l)

if [ $CRITICAL_EVENTS -gt 0 ]; then
    echo "ALERT: $CRITICAL_EVENTS critical events detected"
    kubectl get events --field-selector type=Warning --all-namespaces --sort-by='.lastTimestamp' | tail -20
    # Send to monitoring system
fi
```

Automated monitoring catches problems early.

## Event Retention and History

Events have limited retention:

```bash
# Events typically expire after 1 hour unless the API server --event-ttl is changed
# To preserve events, export periodically

# Export events to file
kubectl events --all-namespaces -o json > events-$(date +%Y%m%d-%H%M%S).json

# Or use event logging solutions
# - Event router to send events to logging system
# - Prometheus event exporter
# - Cloud provider event logging
```

Export events for long-term analysis.

## Comparing Events Across Namespaces

Identify namespace-specific issues:

```bash
#!/bin/bash
# compare-namespace-events.sh

NAMESPACES="production staging development"

for ns in $NAMESPACES; do
    echo "=== $ns ==="
    WARNING_COUNT=$(kubectl get events -n $ns --field-selector type=Warning -o json | jq '.items | length')
    echo "Warning events: $WARNING_COUNT"

    FAILED_SCHEDULING=$(kubectl get events -n $ns --field-selector reason=FailedScheduling -o json | jq '.items | length')
    echo "Failed scheduling: $FAILED_SCHEDULING"

    echo ""
done
```

Comparison reveals environment differences.

## Event-Based Troubleshooting Workflow

Systematic event investigation:

```bash
#!/bin/bash
# troubleshoot-events.sh

POD_NAME=$1

echo "Events for pod: $POD_NAME"
echo "=================="

# Get all events for pod
kubectl get events --field-selector involvedObject.name=$POD_NAME --sort-by='.lastTimestamp'

echo -e "\n=== Warning Events ==="
kubectl get events --field-selector involvedObject.name=$POD_NAME,type=Warning

echo -e "\n=== Recent Events (last 5) ==="
kubectl get events --field-selector involvedObject.name=$POD_NAME --sort-by='.lastTimestamp' | tail -5

# Check if pod still exists
if kubectl get pod $POD_NAME &>/dev/null; then
    echo -e "\n=== Current Pod Status ==="
    kubectl get pod $POD_NAME -o wide
fi
```

Structured workflows speed troubleshooting.

## Filtering Out Noise

Exclude common benign events:

```bash
# Exclude normal events
kubectl events --types=Warning

# Filter out specific reasons
kubectl get events --all-namespaces -o json | \
  jq -r '.items[] | select(.reason != "Scheduled" and .reason != "Started") | "\(.lastTimestamp) \(.involvedObject.namespace)/\(.involvedObject.name) \(.reason): \(.message)"'

# Focus on errors only
kubectl events | grep -i "error\|failed\|unhealthy"
```

Noise reduction highlights real problems.

## Event Integration with Monitoring

Send events to monitoring systems:

```bash
#!/bin/bash
# export-events-to-monitoring.sh

# Get critical events
EVENTS=$(kubectl get events --field-selector type=Warning --all-namespaces -o json)

# Send to monitoring endpoint
curl -X POST https://monitoring.example.com/events \
  -H "Content-Type: application/json" \
  -d "$EVENTS"

# Or parse and send individual events
echo "$EVENTS" | jq -c '.items[]' | while IFS= read -r event; do
    # Process each event
    SEVERITY=$(echo "$event" | jq -r '.type')
    MESSAGE=$(echo "$event" | jq -r '.message')
    # Send to monitoring...
done
```

Integration enables centralized event analysis.

## Best Practices for Event Usage

Effective event analysis:

1. Sort by timestamp to understand event sequences
2. Filter by type to focus on warnings
3. Use field selectors for specific resources
4. Watch events during deployments
5. Export events for historical analysis
6. Create alerts for critical event patterns
7. Combine with describe and logs for complete picture

kubectl events transforms cluster troubleshooting from reactive to proactive. Filter events by resource with kubectl events, and use kubectl get events to filter by fields such as type and reason. Sort by time to understand failure sequences, and watch in real-time during deployments. Master events alongside logs and describe for comprehensive debugging. For more debugging techniques, see https://oneuptime.com/blog/post/2026-01-22-kubectl-logs-debug-containers/view.
