# How to Test Your OpenTelemetry Pipeline Disaster Recovery Plan with Chaos Engineering

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Chaos Engineering, Disaster Recovery, Reliability

Description: Use chaos engineering techniques to validate your OpenTelemetry pipeline disaster recovery plan before a real outage forces you to find out the hard way.

Disaster recovery plans for observability pipelines rarely get tested. Teams write them, file them away, and hope they work when the time comes. Chaos engineering flips that approach by deliberately injecting failures into your OpenTelemetry pipeline to verify recovery behavior under controlled conditions.

If you have never tested what happens when your collector fleet loses connectivity to the backend, or when a node running your collector dies mid-export, you do not have a disaster recovery plan. You have a document.

## What to Test

A meaningful chaos test for your OpenTelemetry pipeline should cover these scenarios:

1. Backend becomes unreachable (network partition)
2. Collector pod gets killed (process crash)
3. Disk fills up on collectors using persistent queues
4. CPU/memory pressure causes the collector to degrade
5. DNS resolution fails for backend endpoints

Each of these scenarios tells you something different about your pipeline's resilience.

## Setting Up Chaos Experiments with Litmus

Litmus is a Kubernetes-native chaos engineering framework that works well for testing OpenTelemetry Collector deployments. Here is a ChaosEngine resource that kills collector pods randomly:

```yaml
# chaos-pod-kill.yaml
# This Litmus experiment kills one otel-collector pod every 60 seconds
# for a 5-minute window. It validates that the remaining pods absorb the
# traffic and that Kubernetes restarts the killed pod within your RTO target.

apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: otel-collector-pod-kill
  namespace: monitoring
spec:
  appinfo:
    appns: monitoring
    applabel: "app=otel-collector"
    appkind: deployment
  engineState: active
  chaosServiceAccount: litmus-admin
  experiments:
    - name: pod-delete
      spec:
        components:
          env:
            - name: TOTAL_CHAOS_DURATION
              value: "300"        # run for 5 minutes
            - name: CHAOS_INTERVAL
              value: "60"         # kill a pod every 60 seconds
            - name: FORCE
              value: "true"       # force-kill, no graceful shutdown
            - name: PODS_AFFECTED_PERC
              value: "33"         # kill 1 out of 3 pods
```

## Network Partition Testing

Simulating a network partition between your collectors and the backend is the most important test. It validates your queue depth, retry logic, and failover configuration all at once.

Here is a Kubernetes NetworkPolicy that blocks egress from collectors to the backend:

```yaml
# chaos-network-partition.yaml
# This NetworkPolicy blocks all traffic from otel-collector pods to the
# backend on port 4317. Apply it, wait 5 minutes, then remove it.
# Check that queued data is flushed successfully after the partition heals.

apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: block-otel-backend
  namespace: monitoring
spec:
  podSelector:
    matchLabels:
      app: otel-collector
  policyTypes:
    - Egress
  egress:
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
            except:
              - 10.0.5.0/24       # backend subnet to block
      ports:
        - protocol: TCP
          port: 4317
```

Apply the policy, let it run for a defined period, then remove it:

```bash
# Apply the network partition
kubectl apply -f chaos-network-partition.yaml

# Wait 5 minutes while monitoring queue depth
sleep 300

# Remove the partition and watch the queue drain
kubectl delete -f chaos-network-partition.yaml
```

## Measuring the Impact

During each chaos experiment, you need to measure specific outcomes. Here is a script that collects the key metrics from the collector's internal telemetry endpoint:

```python
# measure_chaos_impact.py
# Run this script during chaos experiments to collect pipeline health metrics.
# It polls the collector's Prometheus metrics endpoint and logs queue depth,
# dropped spans, and export errors every 10 seconds.

import requests
import time
import csv
from datetime import datetime

COLLECTOR_METRICS_URL = "http://localhost:8888/metrics"
OUTPUT_FILE = "chaos_results.csv"

METRICS_TO_TRACK = [
    "otelcol_exporter_queue_size",
    "otelcol_exporter_send_failed_spans",
    "otelcol_exporter_send_failed_metric_points",
    "otelcol_processor_dropped_spans",
    "otelcol_receiver_refused_spans",
]

def scrape_metrics():
    resp = requests.get(COLLECTOR_METRICS_URL, timeout=5)
    results = {}
    for line in resp.text.split('\n'):
        if line.startswith('#'):
            continue
        for metric_name in METRICS_TO_TRACK:
            if line.startswith(metric_name):
                parts = line.split(' ')
                if len(parts) >= 2:
                    results[metric_name] = float(parts[-1])
    return results

with open(OUTPUT_FILE, 'w', newline='') as csvfile:
    writer = None
    print(f"Collecting metrics to {OUTPUT_FILE}. Press Ctrl+C to stop.")

    while True:
        try:
            metrics = scrape_metrics()
            metrics['timestamp'] = datetime.now().isoformat()

            if writer is None:
                writer = csv.DictWriter(csvfile, fieldnames=sorted(metrics.keys()))
                writer.writeheader()

            writer.writerow(metrics)
            csvfile.flush()
            print(f"[{metrics['timestamp']}] queue_size={metrics.get('otelcol_exporter_queue_size', 'N/A')}")
            time.sleep(10)
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"Error: {e}")
            time.sleep(10)
```

## Disk Pressure Experiments

If your collectors use persistent queues (and they should), test what happens when disk fills up. This experiment uses a simple approach - fill the disk partition used by the queue:

```bash
# Fill the queue storage directory to 95% capacity.
# This simulates what happens when the backend is down long enough
# for queued data to exhaust available disk space.

QUEUE_DIR="/var/lib/otelcol/queue"
AVAILABLE_KB=$(df --output=avail "$QUEUE_DIR" | tail -1)
FILL_KB=$((AVAILABLE_KB * 95 / 100))

# Create a large file to consume disk space
dd if=/dev/zero of="$QUEUE_DIR/chaos_fill" bs=1024 count=$FILL_KB

# Run your test, then clean up
# rm "$QUEUE_DIR/chaos_fill"
```

Watch the collector logs during this test. A well-configured collector should start dropping data gracefully and emit warnings, not crash.

## Building a Chaos Test Runbook

Document each experiment as a runbook entry. Here is a template:

```yaml
# chaos-runbook.yaml
# Template for documenting chaos experiments against the OTel pipeline.

experiment: backend-network-partition
objective: "Verify that the collector queues data during backend outage and flushes it on recovery"
preconditions:
  - "3 collector pods running in monitoring namespace"
  - "Persistent queue storage enabled with 10GB capacity"
  - "Metrics collection script running"
steps:
  - "Record baseline metrics (queue size, export rate)"
  - "Apply NetworkPolicy to block backend access"
  - "Wait 5 minutes"
  - "Remove NetworkPolicy"
  - "Wait 5 minutes for queue to drain"
  - "Compare post-experiment data in backend against expected count"
success_criteria:
  - "Zero data points dropped during 5-minute partition"
  - "Queue drains completely within 2 minutes of partition healing"
  - "No collector pod restarts during experiment"
  - "Alerts fired within 30 seconds of partition start"
rollback: "Delete NetworkPolicy, restart collector pods if needed"
```

## Running Chaos Tests in CI

Once your experiments are documented, automate them. Run a reduced version of your chaos suite on every change to the collector configuration:

```bash
# ci-chaos-test.sh
# Lightweight chaos test for CI. Deploys the collector with the new config,
# runs a 60-second network partition, and checks for data loss.

kubectl apply -f new-collector-config.yaml
sleep 30  # wait for rollout

# Start sending test telemetry
kubectl run test-sender --image=otel-test-sender --restart=Never

# Apply network partition
kubectl apply -f chaos-network-partition.yaml
sleep 60

# Heal the partition
kubectl delete -f chaos-network-partition.yaml
sleep 60

# Check results
DROPPED=$(kubectl exec deploy/otel-collector -- curl -s localhost:8888/metrics | grep "dropped_spans{" | awk '{print $2}')
if [ "$DROPPED" != "0" ]; then
  echo "FAIL: $DROPPED spans were dropped during chaos test"
  exit 1
fi
echo "PASS: Zero data loss during network partition"
```

The goal is not to make your pipeline invincible. It is to know exactly how it fails, how long recovery takes, and whether your team gets the right alerts at the right time. Run these tests quarterly at minimum, and after every significant configuration change.
