# How to Use Dapr Longhaul Benchmarks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Benchmark, Longhaul, Stability, Testing

Description: Learn how to run Dapr longhaul benchmarks to detect memory leaks, connection exhaustion, and performance degradation over extended periods.

---

## Overview

Short load tests verify peak performance but miss slow-developing problems: memory leaks, connection pool exhaustion, certificate rotation failures, and metric counter overflow. Longhaul benchmarks run continuously for hours or days to catch these issues.

## Setting Up a Longhaul Test Environment

Create a dedicated Kubernetes namespace for longhaul tests:

```bash
kubectl create namespace dapr-longhaul
```

Deploy the Dapr longhaul test apps from the Dapr test infrastructure repository:

```bash
git clone https://github.com/dapr/test-infra.git
cd test-infra

# Deploy publisher
kubectl apply -f longhaul-test/streaming-pubsub-publisher.yml -n dapr-longhaul

# Deploy subscriber
kubectl apply -f longhaul-test/streaming-pubsub-subscriber.yml -n dapr-longhaul
```

## Implementing a Custom Longhaul Test

Create a publisher that sends events continuously:

```python
import time, json, random, logging
from dapr.clients import DaprClient

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_longhaul_publisher():
    iteration = 0
    errors = 0

    with DaprClient() as client:
        while True:
            try:
                event = {
                    "iteration": iteration,
                    "timestamp": time.time(),
                    "payload": "x" * random.randint(100, 10000)
                }
                client.publish_event(
                    pubsub_name="pubsub",
                    topic_name="longhaul",
                    data=json.dumps(event),
                    data_content_type="application/json",
                )
                iteration += 1
                if iteration % 1000 == 0:
                    logger.info(f"Published {iteration} events, errors: {errors}")
            except Exception as e:
                errors += 1
                logger.error(f"Publish error: {e}")
                time.sleep(1)

            time.sleep(0.01)  # 100 events/second

run_longhaul_publisher()
```

## Monitoring During Longhaul Tests

Set up continuous metric collection:

```bash
# Watch memory growth over time
while true; do
    ts="$(date '+%Y-%m-%d %H:%M:%S')"
    kubectl top pods -n dapr-longhaul --containers | \
        awk -v ts="$ts" '/daprd/ {print ts, $0}' >> memory-log.txt
    sleep 60
done
```

## Detecting Memory Leaks

Analyze memory trends from collected metrics:

```python
import pandas as pd

df = pd.read_csv('memory-log.txt', sep=r'\s+',
                 names=['date', 'time', 'pod', 'container', 'cpu', 'memory'])
df['mem_mb'] = df['memory'].str.replace('Mi', '').astype(float)
df['timestamp'] = pd.to_datetime(df['date'] + ' ' + df['time'])
df = df.sort_values('timestamp')
df['hour_bucket'] = (df['timestamp'] - df['timestamp'].min()).dt.total_seconds() // 3600

# Check for monotonically increasing memory
growth = df.groupby('hour_bucket')['mem_mb'].mean().diff().dropna()
if (growth > 0).all():
    print("WARNING: Memory is growing continuously - possible leak")
```

## Connection Exhaustion Detection

Monitor connection counts during longhaul tests:

```bash
# Check open connections from sidecar
kubectl exec -it <pod> -c daprd -- \
  cat /proc/net/tcp | wc -l

# Alert if connections exceed threshold
kubectl exec -it <pod> -c daprd -- \
  ss -s | grep "TCP:"
```

## Longhaul Success Criteria

Define clear success criteria for your longhaul test:

```yaml
# success-criteria.yaml
duration: 72h
thresholds:
  errorRate: "< 0.1%"
  p99Latency: "< 500ms"
  memoryGrowth: "< 10MB per hour"
  connectionCount: "stable (no monotonic growth)"
  certificateRenewal: "successful (check every 24h)"
```

## Summary

Dapr longhaul benchmarks run for extended periods (24-72 hours) to surface slow-developing reliability issues like memory leaks, connection exhaustion, and certificate rotation failures that short load tests miss. Monitor memory growth trends, connection counts, and error rates continuously, and define quantitative success criteria before starting the test to objectively evaluate results.
