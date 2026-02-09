# How to Inspect Pod Phase Transitions Using kubectl and the Kubernetes API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Debugging, API

Description: Learn how to track and analyze pod phase transitions in Kubernetes using kubectl commands and API calls to debug scheduling issues, startup problems, and lifecycle events.

---

Pod phases represent the high-level state of a pod in its lifecycle: Pending, Running, Succeeded, Failed, and Unknown. Tracking transitions between these phases helps you diagnose deployment issues, understand application startup behavior, and identify problems with resource availability or configuration. Kubernetes provides multiple ways to inspect these transitions through kubectl and direct API access.

Understanding pod phase transitions is essential for troubleshooting and building reliable automation around pod lifecycle management.

## Understanding Pod Phases

The five pod phases are:

- **Pending**: Pod accepted but not running (waiting for scheduling or image pull)
- **Running**: Pod bound to node, at least one container running
- **Succeeded**: All containers terminated successfully (exit 0)
- **Failed**: All containers terminated, at least one failed (non-zero exit)
- **Unknown**: Pod state cannot be determined (usually node communication failure)

View current pod phase:

```bash
# Quick status view
kubectl get pods

# Show phase explicitly
kubectl get pods -o custom-columns=NAME:.metadata.name,PHASE:.status.phase,NODE:.spec.nodeName

# JSON output for programmatic access
kubectl get pod <pod-name> -o jsonpath='{.status.phase}'
```

## Tracking Phase Changes with Events

Events provide a timeline of pod lifecycle changes:

```bash
# View events for a specific pod
kubectl describe pod <pod-name> | grep -A 20 Events

# Get events in a more parseable format
kubectl get events --field-selector involvedObject.name=<pod-name> \
  --sort-by='.lastTimestamp'

# Watch events in real-time
kubectl get events --watch --field-selector involvedObject.name=<pod-name>
```

Extract phase transition events:

```bash
# Show scheduling and startup events
kubectl get events --field-selector involvedObject.name=<pod-name> -o json | \
  jq -r '.items[] | select(.reason | test("Scheduled|Pulling|Pulled|Created|Started")) |
  "\(.firstTimestamp) \(.reason): \(.message)"'
```

## Using kubectl wait for Phase Transitions

Wait for specific phases programmatically:

```bash
# Wait for pod to be running
kubectl wait --for=condition=ready pod/<pod-name> --timeout=60s

# Wait for job pods to complete
kubectl wait --for=condition=complete job/<job-name> --timeout=300s

# Wait for pod deletion
kubectl wait --for=delete pod/<pod-name> --timeout=30s
```

Watch phase transitions in real-time:

```bash
# Watch pod status changes
kubectl get pod <pod-name> -w -o custom-columns=\
PHASE:.status.phase,\
CONDITIONS:.status.conditions[*].type,\
REASON:.status.reason

# More detailed watch with timestamps
kubectl get pod <pod-name> -w -o json | \
  jq --unbuffered -r '[.metadata.name, .status.phase, .status.conditions[]? | select(.type=="Ready") | .status] | @tsv'
```

## Using the Kubernetes API Directly

Access pod status via the API:

```python
#!/usr/bin/env python3
from kubernetes import client, config, watch
from datetime import datetime

config.load_kube_config()
v1 = client.CoreV1Api()

def track_pod_phases(namespace, pod_name):
    """Track phase transitions for a specific pod."""
    print(f"Tracking pod: {namespace}/{pod_name}")

    w = watch.Watch()
    for event in w.stream(v1.list_namespaced_pod, namespace=namespace,
                          field_selector=f"metadata.name={pod_name}",
                          timeout_seconds=300):
        pod = event['object']
        event_type = event['type']

        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        phase = pod.status.phase
        reason = pod.status.reason or "N/A"

        print(f"[{timestamp}] {event_type}: Phase={phase}, Reason={reason}")

        # Print container statuses
        if pod.status.container_statuses:
            for cs in pod.status.container_statuses:
                state = "Unknown"
                if cs.state.running:
                    state = "Running"
                elif cs.state.waiting:
                    state = f"Waiting: {cs.state.waiting.reason}"
                elif cs.state.terminated:
                    state = f"Terminated: {cs.state.terminated.reason} (exit {cs.state.terminated.exit_code})"

                print(f"  Container {cs.name}: {state}")

        # Stop watching if pod is in terminal phase
        if phase in ["Succeeded", "Failed"]:
            print(f"Pod reached terminal phase: {phase}")
            break

if __name__ == "__main__":
    import sys
    if len(sys.argv) != 3:
        print("Usage: track_pod.py <namespace> <pod-name>")
        sys.exit(1)

    track_pod_phases(sys.argv[1], sys.argv[2])
```

## Monitoring Multiple Pods

Track phase transitions across multiple pods:

```python
#!/usr/bin/env python3
from kubernetes import client, config, watch
from collections import defaultdict
import time

config.load_kube_config()
v1 = client.CoreV1Api()

phase_transitions = defaultdict(list)

def monitor_deployment_phases(namespace, deployment_name):
    """Monitor phase transitions for all pods in a deployment."""
    label_selector = f"app={deployment_name}"

    w = watch.Watch()
    for event in w.stream(v1.list_namespaced_pod, namespace=namespace,
                          label_selector=label_selector):
        pod = event['object']
        pod_name = pod.metadata.name
        phase = pod.status.phase
        event_type = event['type']

        # Record transition
        key = f"{namespace}/{pod_name}"
        current_time = time.time()

        if not phase_transitions[key] or phase_transitions[key][-1][0] != phase:
            phase_transitions[key].append((phase, current_time))
            print(f"{event_type}: {pod_name} -> {phase}")

            # Calculate time in previous phase
            if len(phase_transitions[key]) > 1:
                prev_phase, prev_time = phase_transitions[key][-2]
                duration = current_time - prev_time
                print(f"  Time in {prev_phase}: {duration:.2f}s")

if __name__ == "__main__":
    monitor_deployment_phases("default", "my-app")
```

## Creating Phase Transition Reports

Generate detailed transition reports:

```bash
#!/bin/bash
# pod-phase-report.sh

NAMESPACE=${1:-default}
POD_NAME=$2

if [ -z "$POD_NAME" ]; then
    echo "Usage: $0 <namespace> <pod-name>"
    exit 1
fi

echo "=== Pod Phase Transition Report ==="
echo "Pod: $NAMESPACE/$POD_NAME"
echo ""

# Get pod creation time
CREATED=$(kubectl get pod $POD_NAME -n $NAMESPACE -o jsonpath='{.metadata.creationTimestamp}')
echo "Created: $CREATED"

# Current phase
PHASE=$(kubectl get pod $POD_NAME -n $NAMESPACE -o jsonpath='{.status.phase}')
echo "Current Phase: $PHASE"
echo ""

# Show all conditions with transition times
echo "=== Conditions ==="
kubectl get pod $POD_NAME -n $NAMESPACE -o json | \
  jq -r '.status.conditions[] | "\(.type): \(.status) (Last Transition: \(.lastTransitionTime), Reason: \(.reason))"'
echo ""

# Show timeline of events
echo "=== Event Timeline ==="
kubectl get events -n $NAMESPACE --field-selector involvedObject.name=$POD_NAME \
  --sort-by='.lastTimestamp' -o custom-columns=\
TIME:.lastTimestamp,\
REASON:.reason,\
MESSAGE:.message

# Show container state transitions
echo ""
echo "=== Container States ==="
kubectl get pod $POD_NAME -n $NAMESPACE -o json | \
  jq -r '.status.containerStatuses[]? | "\(.name): Ready=\(.ready), RestartCount=\(.restartCount)"'
```

## Debugging Stuck Phase Transitions

Find pods stuck in specific phases:

```bash
# Pods stuck in Pending
kubectl get pods --all-namespaces --field-selector status.phase=Pending \
  -o custom-columns=\
NAMESPACE:.metadata.namespace,\
NAME:.metadata.name,\
AGE:.metadata.creationTimestamp

# Analyze why pods are pending
kubectl get pods --all-namespaces --field-selector status.phase=Pending -o json | \
  jq -r '.items[] | "\(.metadata.namespace)/\(.metadata.name): \(.status.conditions[] | select(.type=="PodScheduled") | .message)"'
```

Track time spent in each phase:

```python
#!/usr/bin/env python3
from kubernetes import client, config
from datetime import datetime

config.load_kube_config()
v1 = client.CoreV1Api()

def analyze_pod_timing(namespace, pod_name):
    """Analyze time spent in each phase."""
    pod = v1.read_namespaced_pod(pod_name, namespace)

    creation_time = pod.metadata.creation_timestamp
    current_time = datetime.now(creation_time.tzinfo)

    print(f"Pod: {namespace}/{pod_name}")
    print(f"Created: {creation_time}")
    print(f"Current Phase: {pod.status.phase}")
    print(f"Total Age: {(current_time - creation_time).total_seconds():.2f}s")
    print("\n=== Phase Timing Analysis ===")

    # Analyze conditions to estimate phase durations
    if pod.status.conditions:
        for condition in sorted(pod.status.conditions, key=lambda c: c.last_transition_time):
            print(f"{condition.type}:")
            print(f"  Status: {condition.status}")
            print(f"  Last Transition: {condition.last_transition_time}")
            print(f"  Reason: {condition.reason}")

    # Container start times
    if pod.status.container_statuses:
        print("\n=== Container Timing ===")
        for cs in pod.status.container_statuses:
            print(f"{cs.name}:")
            if cs.state.running and cs.state.running.started_at:
                start_time = cs.state.running.started_at
                running_duration = (current_time - start_time).total_seconds()
                print(f"  Started: {start_time}")
                print(f"  Running for: {running_duration:.2f}s")
            elif cs.state.waiting:
                print(f"  Waiting: {cs.state.waiting.reason}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) != 3:
        print("Usage: analyze_timing.py <namespace> <pod-name>")
        sys.exit(1)

    analyze_pod_timing(sys.argv[1], sys.argv[2])
```

## Alerting on Phase Transitions

Set up alerts for problematic transitions:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: phase-alerts
data:
  alerts.yaml: |
    groups:
    - name: pod-phases
      rules:
      - alert: PodsPendingTooLong
        expr: kube_pod_status_phase{phase="Pending"} == 1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Pod {{ $labels.namespace }}/{{ $labels.pod }} pending >10min"

      - alert: PodCrashLooping
        expr: rate(kube_pod_container_status_restarts_total[15m]) > 0
        labels:
          severity: critical
        annotations:
          summary: "Pod {{ $labels.namespace }}/{{ $labels.pod }} crash looping"

      - alert: PodFailedPhase
        expr: kube_pod_status_phase{phase="Failed"} == 1
        labels:
          severity: warning
        annotations:
          summary: "Pod {{ $labels.namespace }}/{{ $labels.pod }} in Failed phase"
```

## Best Practices

Always check pod conditions in addition to phase. Conditions provide more detailed state information.

Use watches for real-time monitoring. Polling is inefficient for tracking transitions.

Correlate phase changes with events. Events explain why transitions happened.

Monitor time spent in each phase. Long Pending times indicate scheduling or resource issues.

Log phase transitions in your applications. This helps correlate application behavior with lifecycle changes.

Set appropriate timeouts when waiting for phases. Prevent indefinite hangs in automation.

Clean up terminal state pods. Failed and Succeeded pods consume cluster resources.

Track patterns across multiple pods. Systemic issues often affect many pods simultaneously.

Understanding pod phase transitions is fundamental to operating Kubernetes effectively, enabling you to diagnose issues quickly and build robust automation around pod lifecycle management.
