# Validating Multi-Stream Performance in Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, Performance, Multi-Stream, Validation

Description: A rigorous framework for validating multi-stream TCP throughput in Cilium clusters, covering scaling tests, statistical analysis, and cross-node validation matrices.

---

## Introduction

Validating multi-stream performance goes beyond running a single iperf3 test with many parallel streams. A proper validation framework must confirm that throughput scales linearly with stream count, that all node pairs deliver consistent performance, and that results are statistically repeatable across multiple runs.

Multi-stream validation is more complex than single-stream because the number of variables increases. Each additional stream adds another CPU core to the equation, another NIC queue, and another set of BPF program invocations. The validation must confirm that all these components work together efficiently.

This guide provides a comprehensive validation methodology that you can integrate into CI/CD pipelines and use for acceptance testing after any Cilium configuration change.

## Prerequisites

- Kubernetes cluster with Cilium v1.14+
- `iperf3` and `jq` available in container images
- At least 3 worker nodes for cross-node testing
- Prometheus for metrics storage
- CI/CD system for automated validation

## Scaling Validation Test

The most important multi-stream validation is the scaling test. Throughput should increase proportionally with stream count:

```bash
#!/bin/bash
# scaling-validation.sh

SERVER_IP=$(kubectl get pod iperf-server -o jsonpath='{.status.podIP}')
RESULTS=()

echo "Stream Count | Throughput (Gbps) | Scaling Efficiency"
echo "-------------|-------------------|-------------------"

SINGLE_BPS=""

for STREAMS in 1 2 4 8 16 32; do
  # Run 3 iterations per stream count
  TOTAL=0
  for i in 1 2 3; do
    BPS=$(kubectl exec iperf-client -- \
      iperf3 -c $SERVER_IP -t 20 -P $STREAMS -J 2>/dev/null | \
      jq '.end.sum_sent.bits_per_second')
    TOTAL=$(echo "$TOTAL + $BPS" | bc)
    sleep 5
  done
  AVG=$(echo "scale=2; $TOTAL / 3" | bc)
  GBPS=$(echo "scale=2; $AVG / 1000000000" | bc)

  if [ "$STREAMS" -eq 1 ]; then
    SINGLE_BPS=$AVG
    EFFICIENCY="100%"
  else
    EXPECTED=$(echo "$SINGLE_BPS * $STREAMS" | bc)
    EFFICIENCY=$(echo "scale=1; $AVG / $EXPECTED * 100" | bc)
    EFFICIENCY="${EFFICIENCY}%"
  fi

  echo "$STREAMS            | $GBPS             | $EFFICIENCY"
done
```

Expected results on a well-tuned 25G NIC:

```
Stream Count | Throughput (Gbps) | Scaling Efficiency
-------------|-------------------|-------------------
1            | 9.2               | 100%
2            | 18.1              | 98.4%
4            | 23.8              | 64.7% (NIC saturation)
8            | 24.5              | 33.3% (NIC max)
```

Scaling efficiency should be above 90% until the NIC link speed is reached.

## Cross-Node Validation Matrix

```bash
#!/bin/bash
# cross-node-matrix.sh

NODES=$(kubectl get nodes -l node-role.kubernetes.io/worker -o jsonpath='{.items[*].metadata.name}')
STREAMS=16

echo "Source -> Dest | Throughput (Gbps)"
echo "---------------|------------------"

for src in $NODES; do
  for dst in $NODES; do
    [ "$src" = "$dst" ] && continue

    # Deploy server on dst
    kubectl run matrix-server --image=networkstatic/iperf3 \
      --overrides="{\"spec\":{\"nodeSelector\":{\"kubernetes.io/hostname\":\"$dst\"}}}" \
      -- -s 2>/dev/null
    kubectl wait --for=condition=ready pod/matrix-server --timeout=30s
    DST_IP=$(kubectl get pod matrix-server -o jsonpath='{.status.podIP}')

    # Run test from src
    BPS=$(kubectl run matrix-client --image=networkstatic/iperf3 \
      --rm -it --restart=Never \
      --overrides="{\"spec\":{\"nodeSelector\":{\"kubernetes.io/hostname\":\"$src\"}}}" \
      -- -c $DST_IP -t 15 -P $STREAMS -J 2>/dev/null | \
      jq '.end.sum_sent.bits_per_second / 1000000000')

    echo "$src -> $dst | $BPS"
    kubectl delete pod matrix-server --force 2>/dev/null
  done
done
```

## Statistical Validation

Run enough iterations to produce statistically valid results:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: statistical-validation
  namespace: monitoring
spec:
  template:
    spec:
      containers:
      - name: validator
        image: networkstatic/iperf3
        command:
        - /bin/sh
        - -c
        - |
          SERVER="iperf-server.monitoring"
          echo '[]' > /tmp/results.json

          for i in $(seq 1 20); do
            BPS=$(iperf3 -c $SERVER -t 20 -P 16 -J | \
              jq '.end.sum_sent.bits_per_second')
            jq --arg v "$BPS" '. += [$v|tonumber]' \
              /tmp/results.json > /tmp/tmp.json
            mv /tmp/tmp.json /tmp/results.json
            sleep 10
          done

          # Calculate statistics
          jq '{
            samples: length,
            mean: (add / length),
            min: min,
            max: max,
            range_pct: ((max - min) / (add / length) * 100),
            stddev: ((add / length) as $m |
              (map(. - $m | . * .) | add / length | sqrt)),
            cv: ((add / length) as $m |
              (map(. - $m | . * .) | add / length | sqrt) / $m * 100)
          }' /tmp/results.json
      restartPolicy: Never
```

Acceptance criteria for the statistical validation:
- Coefficient of variation (CV) should be below 5%
- No individual run should deviate more than 15% from the mean
- Mean should meet your minimum throughput requirement

## CI/CD Integration

```bash
#!/bin/bash
# ci-multistream-validate.sh
set -euo pipefail

MIN_THROUGHPUT_GBPS=20
MAX_CV_PCT=5
STREAMS=16
RUNS=5

echo "Multi-stream validation: $STREAMS streams, $RUNS runs"

declare -a RESULTS
for i in $(seq 1 $RUNS); do
  BPS=$(kubectl exec perf-client -- \
    iperf3 -c iperf-server.monitoring -t 20 -P $STREAMS -J | \
    jq '.end.sum_sent.bits_per_second')
  RESULTS+=($BPS)
  sleep 5
done

# Calculate statistics
MEAN=$(echo "${RESULTS[@]}" | tr ' ' '\n' | awk '{s+=$1} END {printf "%.0f", s/NR}')
MEAN_GBPS=$(echo "scale=2; $MEAN / 1000000000" | bc)

STDDEV=$(echo "${RESULTS[@]}" | tr ' ' '\n' | awk -v m=$MEAN '{s+=($1-m)^2} END {printf "%.0f", sqrt(s/NR)}')
CV=$(echo "scale=2; $STDDEV / $MEAN * 100" | bc)

echo "Mean: ${MEAN_GBPS} Gbps, CV: ${CV}%"

if (( $(echo "$MEAN_GBPS < $MIN_THROUGHPUT_GBPS" | bc -l) )); then
  echo "FAIL: Throughput ${MEAN_GBPS} Gbps below minimum ${MIN_THROUGHPUT_GBPS} Gbps"
  exit 1
fi

if (( $(echo "$CV > $MAX_CV_PCT" | bc -l) )); then
  echo "FAIL: CV ${CV}% exceeds maximum ${MAX_CV_PCT}%"
  exit 1
fi

echo "PASS: Multi-stream validation successful"
```

## Verification

```bash
# Confirm test infrastructure
kubectl get pods -n monitoring -l app=iperf-server

# Verify validation Job completed
kubectl get jobs -n monitoring -l app=statistical-validation

# Check metric collection
curl -s http://prometheus:9090/api/v1/query?query=cilium_multi_stream_throughput_bps
```

## Troubleshooting

- **Scaling efficiency drops sharply at low stream counts**: Check NIC queue count and RSS configuration.
- **Cross-node matrix shows asymmetric results**: Check for different NIC firmware, kernel versions, or Cilium configs across nodes.
- **High CV in statistical validation**: Increase test duration or check for background workloads causing interference.
- **CI validation flaky**: Use more runs (10+) and increase the CV threshold to 8%.

## Conclusion

Multi-stream validation in Cilium requires testing scaling efficiency, cross-node consistency, and statistical repeatability. The scaling test reveals whether your hardware and configuration can fully utilize parallel connections. The cross-node matrix ensures uniform performance across the cluster. Statistical analysis confirms your results are reliable enough to use as baselines. Together, these validations provide confidence that multi-stream performance meets your requirements.
