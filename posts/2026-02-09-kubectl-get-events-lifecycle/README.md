# How to Use kubectl get events to Track Pod Lifecycle Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Events, Debugging, kubectl, Troubleshooting

Description: Learn how to use kubectl get events to track Kubernetes pod lifecycle, diagnose issues, and understand cluster activity through event analysis.

---

Kubernetes events provide a time-ordered log of state changes and actions taken by the system. They are crucial for understanding what happened to your pods, why they failed, or how they transitioned through different states.

## Understanding Kubernetes Events

Events are stored as objects in the Kubernetes API and expire after one hour by default. They capture information about resource state changes, errors, and significant actions.

Events have several important fields:
- Type: Normal or Warning
- Reason: Machine-readable cause
- Message: Human-readable description
- Count: How many times the event occurred
- First/Last Seen: Timestamps
- Object: The resource the event relates to

## Basic Event Queries

View all events:

```bash
# Get all events in current namespace
kubectl get events

# Get events from all namespaces
kubectl get events --all-namespaces

# Get events with timestamps
kubectl get events --sort-by='.lastTimestamp'
```

Standard output shows:

```
LAST SEEN   TYPE      REASON              OBJECT                MESSAGE
2m          Normal    Scheduled           pod/myapp-xyz         Successfully assigned default/myapp-xyz to node-1
1m          Normal    Pulling             pod/myapp-xyz         Pulling image "nginx:latest"
1m          Normal    Pulled              pod/myapp-xyz         Successfully pulled image
30s         Warning   BackOff             pod/myapp-xyz         Back-off restarting failed container
```

## Filtering Events by Resource

Track events for specific pods:

```bash
# Events for a specific pod
kubectl get events --field-selector involvedObject.name=myapp-7d8f9b6c5d-k4m2n

# Events for a deployment
kubectl get events --field-selector involvedObject.name=myapp

# Events for a node
kubectl get events --field-selector involvedObject.name=worker-node-1
```

Filter by resource kind:

```bash
# Pod events only
kubectl get events --field-selector involvedObject.kind=Pod

# Deployment events
kubectl get events --field-selector involvedObject.kind=Deployment

# Service events
kubectl get events --field-selector involvedObject.kind=Service
```

Combine filters:

```bash
# Pod events for specific namespace
kubectl get events -n production --field-selector involvedObject.kind=Pod

# Specific pod in specific namespace
kubectl get events -n production --field-selector involvedObject.name=myapp-pod,involvedObject.kind=Pod
```

## Filtering by Event Type

View only warnings or errors:

```bash
# Warning events only
kubectl get events --field-selector type=Warning

# Normal events
kubectl get events --field-selector type=Normal

# Warnings for a specific pod
kubectl get events --field-selector type=Warning,involvedObject.name=myapp-pod
```

This is particularly useful for finding issues:

```bash
# All warnings in production namespace
kubectl get events -n production --field-selector type=Warning --sort-by='.lastTimestamp'

# Count warnings per pod
kubectl get events --field-selector type=Warning -o json | \
  jq -r '.items[].involvedObject.name' | sort | uniq -c | sort -nr
```

## Sorting and Time-Based Filtering

Sort events chronologically:

```bash
# Sort by last timestamp (most recent last)
kubectl get events --sort-by='.lastTimestamp'

# Sort by first occurrence
kubectl get events --sort-by='.firstTimestamp'

# Most recent events first
kubectl get events --sort-by='.lastTimestamp' | tail -n 20 | tac
```

No built-in time range filter exists, but you can use jq:

```bash
# Events in last 10 minutes
TEN_MIN_AGO=$(date -u -d '10 minutes ago' +%Y-%m-%dT%H:%M:%SZ)
kubectl get events -o json | \
  jq -r ".items[] | select(.lastTimestamp > \"$TEN_MIN_AGO\") | [.lastTimestamp, .type, .reason, .involvedObject.name, .message] | @tsv"

# Events since specific time
kubectl get events -o json | \
  jq -r ".items[] | select(.lastTimestamp > \"2026-02-09T10:00:00Z\") | [.lastTimestamp, .type, .message] | @tsv"
```

## Tracking Pod Lifecycle

Monitor pod creation and startup:

```bash
# Watch events in real-time
kubectl get events --watch

# Watch for specific pod
kubectl get events --watch --field-selector involvedObject.name=myapp-pod
```

Typical pod lifecycle events:

```bash
# 1. Scheduling
Scheduled - Pod assigned to node

# 2. Image handling
Pulling - Image being pulled
Pulled - Image successfully pulled
Failed - Image pull failed
BackOff - Image pull backoff

# 3. Container lifecycle
Created - Container created
Started - Container started
Killing - Container being killed

# 4. Health checks
Unhealthy - Probe failed

# 5. Errors
FailedScheduling - Cannot schedule pod
FailedMount - Volume mount failed
```

Create a function to show pod event timeline:

```bash
pod-events() {
  POD=$1
  kubectl get events --field-selector involvedObject.name=$POD --sort-by='.firstTimestamp' -o custom-columns=TIME:.firstTimestamp,TYPE:.type,REASON:.reason,MESSAGE:.message
}

# Usage
pod-events myapp-7d8f9b6c5d-k4m2n
```

## Debugging with Events

### Finding Why Pods Aren't Starting

```bash
# Get all pod events with warnings
kubectl get events --field-selector involvedObject.kind=Pod,type=Warning

# Common issues to look for:
# - FailedScheduling: Resource constraints, taints, node selector
# - Failed: Image pull issues
# - FailedMount: Volume problems
# - BackOff: Container crashing
```

Script to analyze pod issues:

```bash
#!/bin/bash
# check-pod-events.sh

POD=$1

if [ -z "$POD" ]; then
  echo "Usage: $0 <pod-name>"
  exit 1
fi

echo "=== Events for $POD ==="
EVENTS=$(kubectl get events --field-selector involvedObject.name=$POD --sort-by='.lastTimestamp' -o json)

# Check for scheduling issues
if echo "$EVENTS" | jq -e '.items[] | select(.reason=="FailedScheduling")' > /dev/null; then
  echo "ISSUE: Scheduling failed"
  echo "$EVENTS" | jq -r '.items[] | select(.reason=="FailedScheduling") | .message'
fi

# Check for image pull issues
if echo "$EVENTS" | jq -e '.items[] | select(.reason=="Failed" or .reason=="BackOff")' > /dev/null; then
  echo "ISSUE: Image pull problem"
  echo "$EVENTS" | jq -r '.items[] | select(.reason=="Failed" or .reason=="BackOff") | .message' | head -3
fi

# Check for volume issues
if echo "$EVENTS" | jq -e '.items[] | select(.reason=="FailedMount")' > /dev/null; then
  echo "ISSUE: Volume mount failed"
  echo "$EVENTS" | jq -r '.items[] | select(.reason=="FailedMount") | .message'
fi

# Check for probe failures
if echo "$EVENTS" | jq -e '.items[] | select(.reason=="Unhealthy")' > /dev/null; then
  echo "ISSUE: Health probe failing"
  echo "$EVENTS" | jq -r '.items[] | select(.reason=="Unhealthy") | .message' | tail -3
fi
```

### Investigating Frequent Restarts

```bash
# Find pods with Back-off events
kubectl get events --field-selector reason=BackOff --all-namespaces

# Count restarts per pod
kubectl get events --field-selector reason=BackOff -o json | \
  jq -r '.items[] | "\(.involvedObject.name) \(.count)"' | \
  awk '{sum[$1]+=$2} END {for (pod in sum) print sum[pod], pod}' | \
  sort -rn

# Timeline of restarts for specific pod
kubectl get events --field-selector involvedObject.name=myapp-pod,reason=BackOff --sort-by='.firstTimestamp'
```

### Tracking Deployment Rollouts

```bash
# Events during deployment
DEPLOY_TIME=$(kubectl get deployment myapp -o jsonpath='{.metadata.creationTimestamp}')
kubectl get events --field-selector involvedObject.kind=Pod --sort-by='.lastTimestamp' | \
  awk -v dt="$DEPLOY_TIME" '$1 >= dt'

# Watch deployment events
kubectl get events --watch --field-selector involvedObject.kind=ReplicaSet

# Check for issues during rollout
kubectl get events --field-selector type=Warning --sort-by='.lastTimestamp' | tail -20
```

## Advanced Event Analysis

### Finding Patterns

Identify most common issues:

```bash
# Most common warnings
kubectl get events --field-selector type=Warning -o json | \
  jq -r '.items[].reason' | sort | uniq -c | sort -nr

# Most common error messages
kubectl get events --field-selector type=Warning -o json | \
  jq -r '.items[].message' | sort | uniq -c | sort -nr | head -10

# Pods with most events
kubectl get events -o json | \
  jq -r '.items[].involvedObject.name' | sort | uniq -c | sort -nr | head -10
```

### Creating Event Summaries

```bash
# Event summary script
cat > event-summary.sh <<'EOF'
#!/bin/bash

echo "=== Kubernetes Event Summary ==="
echo "Namespace: ${1:-default}"

NAMESPACE_FLAG=""
if [ "$1" != "all" ]; then
  NAMESPACE_FLAG="-n ${1:-default}"
fi

echo ""
echo "Total Events:"
kubectl get events $NAMESPACE_FLAG --no-headers | wc -l

echo ""
echo "Events by Type:"
kubectl get events $NAMESPACE_FLAG -o json | jq -r '.items[].type' | sort | uniq -c

echo ""
echo "Top 10 Reasons:"
kubectl get events $NAMESPACE_FLAG -o json | jq -r '.items[].reason' | sort | uniq -c | sort -nr | head -10

echo ""
echo "Recent Warnings:"
kubectl get events $NAMESPACE_FLAG --field-selector type=Warning --sort-by='.lastTimestamp' | tail -5
EOF

chmod +x event-summary.sh
./event-summary.sh production
```

## Monitoring Event Stream

Watch for new events:

```bash
# Watch all events
kubectl get events --watch

# Watch warnings only
kubectl get events --watch --field-selector type=Warning

# Watch specific namespace
kubectl get events -n production --watch

# Format output
kubectl get events --watch -o custom-columns=TIME:.lastTimestamp,TYPE:.type,REASON:.reason,OBJECT:.involvedObject.name,MESSAGE:.message
```

Stream events to log file:

```bash
# Log events continuously
kubectl get events --watch --all-namespaces >> events.log &

# Log warnings only
kubectl get events --watch --field-selector type=Warning >> warnings.log &

# Stop logging
pkill -f "kubectl get events --watch"
```

## Exporting Events

Export for external analysis:

```bash
# Export to JSON
kubectl get events -o json > events.json

# Export to YAML
kubectl get events -o yaml > events.yaml

# Export to CSV
kubectl get events -o json | \
  jq -r '.items[] | [.lastTimestamp, .type, .reason, .involvedObject.kind, .involvedObject.name, .message] | @csv' > events.csv

# Export warnings only
kubectl get events --field-selector type=Warning -o json | \
  jq -r '.items[] | [.lastTimestamp, .reason, .involvedObject.name, .message] | @csv' > warnings.csv
```

## Event Retention and Cleanup

Events expire after one hour by default. To extend or reduce:

```bash
# Check current event retention (from API server flags)
kubectl get pod -n kube-system kube-apiserver-<node> -o yaml | grep event-ttl

# Events are automatically cleaned up
# To manually delete old events (though they expire anyway)
kubectl get events -o json | \
  jq -r ".items[] | select(.lastTimestamp < \"$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ)\") | .metadata.name" | \
  xargs -I {} kubectl delete event {}
```

## Integrating with Monitoring

Create alerts based on events:

```bash
#!/bin/bash
# event-monitor.sh

while true; do
  # Check for critical events
  CRITICAL=$(kubectl get events --field-selector type=Warning -o json | \
    jq -r '.items[] | select(.reason=="FailedScheduling" or .reason=="FailedMount")' | \
    jq -s 'length')

  if [ "$CRITICAL" -gt 0 ]; then
    echo "ALERT: $CRITICAL critical events found"
    kubectl get events --field-selector type=Warning --sort-by='.lastTimestamp' | tail -5
  fi

  sleep 60
done
```

## Conclusion

kubectl get events is an essential command for troubleshooting Kubernetes issues. Events provide a chronological view of cluster activity, revealing why pods fail, how resources transition through states, and what actions the system took.

By mastering event filtering, sorting, and analysis, you can quickly diagnose problems, understand pod lifecycles, and monitor cluster health. Combine events with logs and resource descriptions for comprehensive Kubernetes debugging.
