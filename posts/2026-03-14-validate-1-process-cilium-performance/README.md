# Validating Single-Process Performance in Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, Performance, Single-Process, Validation

Description: A validation framework for single-process workload performance in Cilium, ensuring CPU isolation, datapath efficiency, and consistent throughput.

---

## Introduction

Validating single-process performance in Cilium requires confirming that CPU isolation is working correctly, that the eBPF datapath adds minimal overhead, and that throughput is consistent across time. Unlike multi-stream validation where you test scaling, single-process validation focuses on per-core efficiency and the absence of contention.

The validation must cover three dimensions: throughput (bits per second on a single flow), latency (per-packet processing time), and stability (consistency across multiple runs and over time). Any failure in one dimension indicates a specific class of problem.

This guide provides a complete validation framework including automated tests, acceptance criteria, and CI/CD integration.

## Prerequisites

- Kubernetes cluster with Cilium v1.14+ and CPU Manager enabled
- `iperf3` and `netperf` container images
- Prometheus for metrics collection
- CI/CD pipeline access

## Throughput Validation

```bash
#!/bin/bash
# validate-single-process-throughput.sh

SERVER_IP=$(kubectl get pod iperf-server -o jsonpath='{.status.podIP}')
MIN_BPS=8000000000  # 8 Gbps minimum for 10G NIC
NUM_RUNS=10
RESULTS=()

for i in $(seq 1 $NUM_RUNS); do
  BPS=$(kubectl exec single-process-client -- \
    iperf3 -c $SERVER_IP -t 20 -P 1 -J | \
    jq '.end.sum_sent.bits_per_second')
  RESULTS+=($BPS)
  echo "Run $i: $(echo "scale=2; $BPS / 1000000000" | bc) Gbps"
  sleep 5
done

MEAN=$(echo "${RESULTS[@]}" | tr ' ' '\n' | awk '{s+=$1} END {printf "%.0f", s/NR}')
MIN=$(echo "${RESULTS[@]}" | tr ' ' '\n' | sort -n | head -1)

echo "Mean: $(echo "scale=2; $MEAN / 1000000000" | bc) Gbps"
echo "Min: $(echo "scale=2; $MIN / 1000000000" | bc) Gbps"

if (( $(echo "$MIN < $MIN_BPS" | bc -l) )); then
  echo "FAIL: Minimum throughput below $MIN_BPS"
  exit 1
fi
echo "PASS: All runs above minimum threshold"
```

## CPU Isolation Validation

```bash
#!/bin/bash
# validate-cpu-isolation.sh

# Check pod has exclusive CPUs
CPUSET=$(kubectl exec single-process-app -- cat /sys/fs/cgroup/cpuset/cpuset.cpus)
echo "Pod CPUs: $CPUSET"

# Verify no throttling during benchmark
BEFORE_THROTTLE=$(kubectl exec single-process-app -- \
  cat /sys/fs/cgroup/cpu/cpu.stat | grep nr_throttled | awk '{print $2}')

# Run 30-second benchmark
kubectl exec single-process-client -- iperf3 -c $SERVER_IP -t 30 -P 1

AFTER_THROTTLE=$(kubectl exec single-process-app -- \
  cat /sys/fs/cgroup/cpu/cpu.stat | grep nr_throttled | awk '{print $2}')

THROTTLE_EVENTS=$((AFTER_THROTTLE - BEFORE_THROTTLE))
echo "Throttle events during test: $THROTTLE_EVENTS"

if [ "$THROTTLE_EVENTS" -gt 0 ]; then
  echo "FAIL: CPU throttling detected during benchmark"
  exit 1
fi
echo "PASS: No CPU throttling"
```

## Latency Validation

```bash
#!/bin/bash
# validate-single-process-latency.sh

SERVER_IP=$(kubectl get pod netperf-server -o jsonpath='{.status.podIP}')

# TCP_RR with 1-byte payload
RESULT=$(kubectl exec single-process-client-netperf -- \
  netperf -H $SERVER_IP -t TCP_RR -l 30 -- -r 1,1 -o throughput,mean_latency 2>/dev/null)

TPS=$(echo "$RESULT" | tail -1 | awk '{print $1}')
MEAN_LAT=$(echo "$RESULT" | tail -1 | awk '{print $2}')

echo "Transactions/sec: $TPS"
echo "Mean latency: ${MEAN_LAT}us"

MIN_TPS=20000
MAX_LAT=100  # 100 microseconds

if (( $(echo "$TPS < $MIN_TPS" | bc -l) )); then
  echo "FAIL: TPS below minimum"
  exit 1
fi

if (( $(echo "$MEAN_LAT > $MAX_LAT" | bc -l) )); then
  echo "FAIL: Latency above maximum"
  exit 1
fi

echo "PASS: Latency validation successful"
```

## Combined CI/CD Validation Job

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: single-process-validation
  namespace: monitoring
spec:
  template:
    spec:
      containers:
      - name: validator
        image: cilium/netperf
        command:
        - /bin/sh
        - -c
        - |
          echo "=== Single-Process Validation ==="
          SERVER="iperf-server.monitoring"
          PASS=true

          # Throughput test
          BPS=$(iperf3 -c $SERVER -t 20 -P 1 -J | jq '.end.sum_sent.bits_per_second')
          GBPS=$(echo "scale=2; $BPS / 1000000000" | bc)
          echo "Throughput: $GBPS Gbps"
          if (( $(echo "$GBPS < 8" | bc -l) )); then PASS=false; fi

          # Latency test
          TPS=$(netperf -H netperf-server.monitoring -t TCP_RR -l 15 -- -r 1,1 2>/dev/null | tail -1 | awk '{print $1}')
          echo "TCP_RR: $TPS trans/s"
          if (( $(echo "$TPS < 20000" | bc -l) )); then PASS=false; fi

          if [ "$PASS" = true ]; then
            echo "OVERALL: PASS"
          else
            echo "OVERALL: FAIL"
            exit 1
          fi
      restartPolicy: Never
```

## Verification

```bash
# Check validation job results
kubectl logs job/single-process-validation -n monitoring

# Verify CPU isolation is maintained
kubectl get pods -o json | jq '.items[] | select(.spec.containers[].resources.limits.cpu == "2") | .metadata.name'

# Check for any throttling cluster-wide
kubectl top pods --containers | sort -k3 -rn | head -10
```

## Troubleshooting

- **Throughput validation fails intermittently**: Check for background DaemonSet pods consuming CPU on the test node.
- **CPU isolation validation reports throttling**: Verify QoS class is Guaranteed with integer CPU limits.
- **Latency validation shows high variance**: Check CPU frequency governor -- it should be "performance" not "powersave".
- **CI job times out**: Increase Job timeout and ensure iperf-server is always running.

## Conclusion

Validating single-process performance in Cilium requires testing three dimensions: throughput, CPU isolation, and latency. Each dimension has specific acceptance criteria and failure modes. By combining these into an automated validation pipeline, you can ensure that single-process workloads consistently receive the CPU resources and datapath efficiency they need. Run this validation after any cluster change that affects CPU management, Cilium configuration, or kernel tuning.
