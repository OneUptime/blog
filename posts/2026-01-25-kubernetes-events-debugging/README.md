# How to Use Kubernetes Events for Debugging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Events, Debugging, Troubleshooting, kubectl, DevOps

Description: Learn how to use Kubernetes events effectively for debugging cluster issues. This guide covers viewing events, filtering by resource, understanding event types, and setting up event-based alerting.

---

Kubernetes events are the first place to look when something goes wrong. They provide a timeline of what happened to your resources: scheduling decisions, image pulls, health check failures, and more. Learning to read and filter events efficiently is essential for quick troubleshooting.

## Understanding Kubernetes Events

Events are Kubernetes objects that describe state changes and errors:

```yaml
apiVersion: v1
kind: Event
metadata:
  name: myapp-pod.abc123
  namespace: production
type: Warning
reason: FailedScheduling
message: "0/3 nodes are available: insufficient memory"
involvedObject:
  kind: Pod
  name: myapp-pod
  namespace: production
firstTimestamp: "2026-01-25T10:00:00Z"
lastTimestamp: "2026-01-25T10:05:00Z"
count: 5
```

Key fields:
- **type**: Normal or Warning
- **reason**: Short machine-readable reason (e.g., FailedScheduling, Pulled, Unhealthy)
- **message**: Human-readable description
- **involvedObject**: The resource this event is about
- **count**: How many times this event occurred

## Viewing Events

### All Events in a Namespace

```bash
# Events in default namespace
kubectl get events

# Events in specific namespace
kubectl get events -n production

# All events across all namespaces
kubectl get events -A
```

### Sorted by Time

```bash
# Most recent events last
kubectl get events --sort-by='.lastTimestamp'

# Most recent events first
kubectl get events --sort-by='.metadata.creationTimestamp' | tac
```

### Watch Events in Real Time

```bash
# Watch all events
kubectl get events -w

# Watch events in production
kubectl get events -n production -w
```

## Filtering Events

### By Resource Type

```bash
# Events for pods only
kubectl get events --field-selector involvedObject.kind=Pod

# Events for deployments
kubectl get events --field-selector involvedObject.kind=Deployment

# Events for nodes
kubectl get events --field-selector involvedObject.kind=Node
```

### By Specific Resource

```bash
# Events for a specific pod
kubectl get events --field-selector involvedObject.name=myapp-pod

# Events for a specific deployment
kubectl get events --field-selector involvedObject.name=myapp,involvedObject.kind=Deployment
```

### By Event Type

```bash
# Warning events only
kubectl get events --field-selector type=Warning

# Normal events only
kubectl get events --field-selector type=Normal
```

### By Reason

```bash
# Failed scheduling events
kubectl get events --field-selector reason=FailedScheduling

# Image pull failures
kubectl get events --field-selector reason=Failed

# Successful pulls
kubectl get events --field-selector reason=Pulled
```

### Combining Filters

```bash
# Warning events for pods in production
kubectl get events -n production \
  --field-selector type=Warning,involvedObject.kind=Pod

# Failed scheduling in the last hour
kubectl get events --field-selector reason=FailedScheduling \
  --sort-by='.lastTimestamp' | tail -20
```

## Using kubectl describe

The `describe` command includes events for a specific resource:

```bash
# Pod events
kubectl describe pod myapp-pod -n production

# Look at the Events section at the bottom:
# Events:
#   Type    Reason     Age   From               Message
#   ----    ------     ----  ----               -------
#   Normal  Scheduled  5m    default-scheduler  Successfully assigned...
#   Normal  Pulling    5m    kubelet            Pulling image...
#   Normal  Pulled     4m    kubelet            Successfully pulled...
#   Normal  Created    4m    kubelet            Created container...
#   Normal  Started    4m    kubelet            Started container...
```

```bash
# Node events
kubectl describe node node-1

# Deployment events
kubectl describe deployment myapp -n production
```

## Common Event Patterns

### Scheduling Issues

```
Type     Reason            Message
Warning  FailedScheduling  0/3 nodes are available: insufficient memory
Warning  FailedScheduling  0/3 nodes are available: 3 node(s) didn't match node selector
Warning  FailedScheduling  0/3 nodes are available: 3 node(s) had taint that pod didn't tolerate
```

### Image Pull Issues

```
Type     Reason         Message
Warning  Failed         Failed to pull image "myregistry.io/myapp:v1": rpc error: code = NotFound
Normal   BackOff        Back-off pulling image "myregistry.io/myapp:v1"
Warning  ErrImagePull   Error: ImagePullBackOff
```

### Health Check Failures

```
Type     Reason     Message
Warning  Unhealthy  Readiness probe failed: HTTP probe failed with statuscode: 503
Warning  Unhealthy  Liveness probe failed: connection refused
Normal   Killing    Container myapp failed liveness probe, will be restarted
```

### Resource Issues

```
Type     Reason    Message
Warning  Evicted   The node was low on resource: memory
Warning  OOMKilled Container myapp was OOMKilled
```

## Event-Based Debugging Workflow

### Step 1: Check Pod Events

```bash
# Get events for a problematic pod
kubectl describe pod <pod-name> -n <namespace> | grep -A 50 "Events:"
```

### Step 2: Check Related Resources

```bash
# If pod events mention PVC issues
kubectl describe pvc <pvc-name> -n <namespace>

# If scheduling issues mention nodes
kubectl describe node <node-name>
```

### Step 3: Look at Cluster-Wide Events

```bash
# Recent warnings across the cluster
kubectl get events -A --field-selector type=Warning --sort-by='.lastTimestamp' | tail -30
```

### Step 4: Check Specific Time Window

```bash
# Events in the last 5 minutes
kubectl get events -A --sort-by='.lastTimestamp' | \
  awk -v cutoff="$(date -d '5 minutes ago' -Iseconds)" '$1 > cutoff'
```

## Event Retention

Events are stored in etcd and have a default TTL of 1 hour. To change this:

```yaml
# kube-apiserver configuration
--event-ttl=6h
```

For longer retention, export events to external storage.

## Exporting Events

### To JSON

```bash
# Export all events to JSON
kubectl get events -A -o json > events.json

# Export with timestamp filter
kubectl get events -A -o json --field-selector type=Warning > warnings.json
```

### Continuous Export Script

```bash
#!/bin/bash
# export-events.sh

OUTPUT_DIR=${1:-/var/log/k8s-events}
mkdir -p $OUTPUT_DIR

while true; do
    TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    kubectl get events -A -o json > "$OUTPUT_DIR/events-$TIMESTAMP.json"
    sleep 300  # Every 5 minutes
done
```

## Event-Based Alerting

### Using kube-state-metrics

```yaml
# Prometheus alert for failed scheduling
groups:
  - name: kubernetes-events
    rules:
      - alert: PodFailedScheduling
        expr: |
          increase(kube_pod_status_scheduled_time{condition="false"}[5m]) > 0
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Pod scheduling failed"
```

### Using Event Exporter

Deploy kubernetes-event-exporter to send events to external systems:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: event-exporter
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: event-exporter
  template:
    metadata:
      labels:
        app: event-exporter
    spec:
      serviceAccountName: event-exporter
      containers:
        - name: event-exporter
          image: ghcr.io/resmoio/kubernetes-event-exporter:latest
          args:
            - -conf=/data/config.yaml
          volumeMounts:
            - name: config
              mountPath: /data
      volumes:
        - name: config
          configMap:
            name: event-exporter-config
```

Configuration:

```yaml
# event-exporter-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: event-exporter-config
  namespace: monitoring
data:
  config.yaml: |
    logLevel: info
    logFormat: json
    route:
      routes:
        - match:
            - receiver: "slack"
          drop:
            - type: "Normal"
    receivers:
      - name: "slack"
        slack:
          token: "${SLACK_TOKEN}"
          channel: "#kubernetes-alerts"
          message: |
            {{ .InvolvedObject.Kind }}/{{ .InvolvedObject.Name }}
            Reason: {{ .Reason }}
            Message: {{ .Message }}
```

## Custom Event Queries

### Find OOMKilled Pods

```bash
kubectl get events -A --field-selector reason=OOMKilling --sort-by='.lastTimestamp'
```

### Find Evicted Pods

```bash
kubectl get events -A --field-selector reason=Evicted --sort-by='.lastTimestamp'
```

### Find Image Pull Failures

```bash
kubectl get events -A --field-selector reason=Failed | grep -i "pull"
```

### Find Unhealthy Probes

```bash
kubectl get events -A --field-selector reason=Unhealthy --sort-by='.lastTimestamp' | tail -20
```

## Debug Script

```bash
#!/bin/bash
# k8s-events-debug.sh

echo "=== Recent Warning Events (Last 20) ==="
kubectl get events -A --field-selector type=Warning --sort-by='.lastTimestamp' | tail -20

echo -e "\n=== Failed Scheduling Events ==="
kubectl get events -A --field-selector reason=FailedScheduling --sort-by='.lastTimestamp' | tail -10

echo -e "\n=== OOMKilled Events ==="
kubectl get events -A --field-selector reason=OOMKilling | tail -10

echo -e "\n=== Image Pull Failures ==="
kubectl get events -A | grep -i "pull.*fail" | tail -10

echo -e "\n=== Unhealthy Pods ==="
kubectl get events -A --field-selector reason=Unhealthy --sort-by='.lastTimestamp' | tail -10

echo -e "\n=== Node Events ==="
kubectl get events -A --field-selector involvedObject.kind=Node --sort-by='.lastTimestamp' | tail -10
```

## Best Practices

1. **Check events first** when debugging pod issues
2. **Filter by type=Warning** to focus on problems
3. **Sort by timestamp** to understand the sequence of events
4. **Export events** to external storage for post-incident analysis
5. **Set up alerting** for critical event patterns
6. **Increase TTL** if you need longer event retention

```bash
# Quick debug alias
alias kevents='kubectl get events --sort-by=".lastTimestamp" -A'
alias kwarnings='kubectl get events --field-selector type=Warning --sort-by=".lastTimestamp" -A'
```

---

Kubernetes events tell the story of what happened in your cluster. They are the first diagnostic tool to reach for when something goes wrong. Learn to filter them effectively, and debugging becomes much faster.
