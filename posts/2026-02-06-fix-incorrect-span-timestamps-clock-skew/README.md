# How to Fix Incorrect Span Timestamps Caused by Clock Skew Between Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Timestamp, Clock Skew, Kubernetes

Description: Fix incorrect span timestamps and trace visualization issues caused by clock skew between containers in a Kubernetes cluster.

Your traces look wrong. Child spans appear to start before their parent spans, span durations are negative, or the waterfall visualization in your tracing UI is completely jumbled. The most likely cause is clock skew between the nodes or machines generating the spans.

## Understanding Clock Skew in Traces

In a distributed trace, each service generates its own spans with timestamps from its local clock. If Service A's clock is 500ms ahead of Service B's clock, a span from Service B might appear to start before the parent span from Service A, even though it actually started after.

```text
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
  echo "$node: $(kubectl debug "$node" -it --image=ubuntu --profile=sysadmin -- chroot /host date +%s%3N 2>/dev/null | tail -1)"
done

# Or check time from inside pods
kubectl exec -it pod-on-node-1 -- date +%s%3N
kubectl exec -it pod-on-node-2 -- date +%s%3N
# Compare the outputs - they should be within a few milliseconds
```

Check NTP synchronization:

```bash
# On a node, check chrony status if chrony is installed on the host
kubectl debug node/my-node -it --image=ubuntu --profile=sysadmin -- chroot /host chronyc tracking

# Or inspect the host clock from a debug container
kubectl debug node/my-node -it --image=ubuntu --profile=sysadmin -- chroot /host date -u
```

## Fix 1: Ensure NTP Is Running on All Nodes

The most fundamental fix is to make sure all nodes have proper time synchronization:

For cloud providers:
- **AWS**: EC2 instances can use the Amazon Time Sync Service. Make sure `chrony` is configured to use `169.254.169.123`.
- **GCP**: GKE node images use Google-provided time synchronization; Container-Optimized OS and Ubuntu nodes use the host RTC as a backup if the internal NTP server is unavailable.
- **Azure**: AKS nodes run on Azure VMs. Linux VMs still need a time sync service such as `chronyd` or `ntpd`; newer Linux images can use the Azure host PTP clock through `/dev/ptp_hyperv`.

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

Some backends (like Jaeger) can apply clock skew adjustment in the query layer:

```yaml
# Jaeger backend clock skew adjustment
# This is configured on the Jaeger query side, not the Collector.
# Recent Jaeger releases default --query.max-clock-skew-adjustment to 0s,
# which disables adjustment; set a non-zero duration to enable it.
```

## Fix 3: Deploy a Time-Sync DaemonSet

For environments where NTP is unreliable, deploy a DaemonSet that monitors and reports time drift:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: time-sync-monitor
spec:
  selector:
    matchLabels:
      app: time-sync-monitor
  template:
    metadata:
      labels:
        app: time-sync-monitor
    spec:
      hostNetwork: true
      hostPID: true
      containers:
        - name: node-exporter
          image: quay.io/prometheus/node-exporter:latest
          args:
            - --path.rootfs=/host
            - --collector.timex
          ports:
            - name: metrics
              containerPort: 9100
          volumeMounts:
            - name: host
              mountPath: /host
              readOnly: true
      volumes:
        - name: host
          hostPath:
            path: /
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

For critical traces, consider rejecting or quarantining spans with obviously invalid timestamps at the Collector. The Collector can rewrite timestamp fields, but it cannot reconstruct the true operation time for clock-skewed spans:

```yaml
# The transform processor can override obviously invalid timestamps.
processors:
  transform:
    trace_statements:
      - context: span
        statements:
          # Only replace timestamps that are clearly invalid.
          - set(span.start_time, Now()) where UnixNano(span.start_time) <= 0
          - set(span.end_time, Now()) where UnixNano(span.end_time) < UnixNano(span.start_time)
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
