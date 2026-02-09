# How to Fix Incorrect Span Timestamps Caused by Clock Skew Between Containers in a Kubernetes Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Timestamps, Clock Skew, Kubernetes

Description: Fix incorrect span timestamps and trace visualization issues caused by clock skew between containers in a Kubernetes cluster.

Your traces look wrong. Child spans appear to start before their parent spans, span durations are negative, or the waterfall visualization in your tracing UI is completely jumbled. The most likely cause is clock skew between the machines (or containers) generating the spans.

## Understanding Clock Skew in Traces

In a distributed trace, each service generates its own spans with timestamps from its local clock. If Service A's clock is 500ms ahead of Service B's clock, a span from Service B might appear to start before the parent span from Service A, even though it actually started after.

```
Service A (clock: 10:00:00.000) creates parent span
  -> calls Service B
Service B (clock: 09:59:59.600) creates child span
  -> child span timestamp is BEFORE parent (400ms earlier)
```

The trace visualizer shows this as a child starting before its parent, which makes no sense.

## Diagnosing Clock Skew

```bash
# Check the time on different nodes
for node in $(kubectl get nodes -o name); do
  echo "$node: $(kubectl debug $node -it --image=busybox -- date +%s%N 2>/dev/null | tail -1)"
done

# Or check time from inside pods
kubectl exec -it pod-on-node-1 -- date +%s%N
kubectl exec -it pod-on-node-2 -- date +%s%N
# Compare the outputs - they should be within a few milliseconds
```

Check NTP synchronization:

```bash
# On a node, check chrony or ntpd status
kubectl debug node/my-node -it --image=ubuntu -- bash -c "apt-get update && apt-get install -y chrony && chronyc tracking"

# Or check timedatectl
kubectl debug node/my-node -it --image=busybox -- sh -c "cat /proc/driver/rtc 2>/dev/null; date"
```

## Fix 1: Ensure NTP Is Running on All Nodes

The most fundamental fix is to make sure all nodes have proper time synchronization:

For cloud providers:
- **AWS**: EC2 instances use the Amazon Time Sync Service. Make sure `chrony` is configured to use `169.254.169.123`.
- **GCP**: GKE nodes sync time automatically via NTP.
- **Azure**: AKS nodes use Hyper-V time synchronization.

For on-premises clusters, verify NTP configuration:

```bash
# Check chrony status on each node
chronyc tracking

# Output should show:
# Reference ID    : A9FEA97B (time.cloudflare.com)
# Stratum         : 3
# Last offset     : +0.000123456 seconds  # Should be small
# RMS offset      : 0.000234567 seconds
# System time     : 0.000001234 seconds slow of NTP time
```

If the offset is more than a few milliseconds, NTP is not working correctly.

## Fix 2: Use Clock Correction in the Collector

The OpenTelemetry Collector does not have a built-in clock correction feature, but you can implement it using a custom processor or by normalizing timestamps in your backend.

Some backends (like Jaeger) have clock skew adjustment built in:

```yaml
# Jaeger backend clock skew adjustment
# This is configured on the Jaeger side, not the Collector
# Jaeger UI automatically adjusts for detected clock skew
```

## Fix 3: Deploy a Time-Sync DaemonSet

For environments where NTP is unreliable, deploy a DaemonSet that monitors and reports time drift:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: time-sync-monitor
spec:
  template:
    spec:
      hostPID: true
      containers:
        - name: time-check
          image: busybox
          command:
            - sh
            - -c
            - |
              while true; do
                OFFSET=$(ntpdate -q pool.ntp.org 2>/dev/null | grep offset | awk '{print $NF}')
                if [ -n "$OFFSET" ]; then
                  echo "Node $(hostname): NTP offset = ${OFFSET}s"
                fi
                sleep 300
              done
          securityContext:
            privileged: true
```

## Fix 4: Use Monotonic Clocks for Duration Calculation

Ensure your application uses monotonic clocks for calculating span durations, not wall clocks. The OpenTelemetry SDKs do this by default, but if you are setting timestamps manually:

```go
// Go - use time.Now() which includes both wall and monotonic readings
start := time.Now()
// ... operation ...
elapsed := time.Since(start)  // Uses monotonic clock, not affected by NTP adjustments

// Do NOT do this:
start := time.Now().UnixNano()
// ... operation ...
end := time.Now().UnixNano()
duration := end - start  // Can be wrong if NTP adjusts during the operation
```

```python
# Python - the SDK handles this correctly, but if you set timestamps manually:
import time

# Use monotonic clock for durations
start = time.monotonic_ns()
# ... operation ...
duration = time.monotonic_ns() - start

# For absolute timestamps (span start time), use time.time_ns()
# and make sure NTP is synced
```

## Fix 5: Single-Point Timestamp Assignment

For critical traces, consider having a single service assign timestamps:

```yaml
# Use the Collector as the single timestamp authority
# The transform processor can override timestamps
processors:
  transform:
    trace_statements:
      - context: span
        statements:
          # Only set timestamp if it seems unreasonable
          - set(start_time, Now()) where Duration(start_time, Now()) > 60000000000
```

This is a workaround, not a solution. The proper fix is always to fix NTP synchronization.

## Monitoring Clock Skew

Add a Prometheus alert for clock drift:

```yaml
- alert: NodeClockSkew
  expr: abs(node_timex_offset_seconds) > 0.05  # 50ms
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "Node {{ $labels.instance }} has clock skew of {{ $value }}s"
```

Clock skew is a fundamental distributed systems problem. The best fix is prevention: make sure NTP is running and synchronized across all nodes. If you see clock skew in your traces, fix the time synchronization before adding workarounds.
