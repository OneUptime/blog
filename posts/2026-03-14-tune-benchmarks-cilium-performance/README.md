# Tuning Benchmarks in Cilium Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Performance, Benchmarking, Tuning

Description: How to tune benchmark parameters and methodology for accurate Cilium performance measurement, including test duration, warm-up periods, and statistical rigor.

---

## Introduction

Performance benchmarks in Cilium are only meaningful if the benchmark methodology is sound. Poorly configured tests can produce results that are misleading, unrepeatable, or irrelevant to real-world workloads. Tuning the benchmarks themselves is as important as tuning Cilium.

This guide covers benchmark methodology optimization: choosing the right test duration, implementing warm-up periods, selecting appropriate parallelism levels, and applying statistical analysis to results.

The goal is to produce benchmark results that are accurate, repeatable, and meaningful for capacity planning and performance optimization decisions.

## Prerequisites

- Kubernetes cluster (v1.24+) with Cilium v1.14+
- `cilium` CLI, `helm`, and `kubectl`
- `iperf3` and `netperf` for benchmarking
- Prometheus and Grafana for monitoring
- Node-level root access

## Test Duration Optimization

```bash
# Too short: results dominated by connection setup
kubectl exec iperf-client -- iperf3 -c $SERVER_IP -t 5 -P 1  # Bad: too short

# Optimal: steady-state results with warm-up
kubectl exec iperf-client -- iperf3 -c $SERVER_IP -t 30 -P 1 --omit 5  # Good: 30s with 5s warm-up

# For TCP_RR
kubectl exec netperf-client -- netperf -H $SERVER_IP -t TCP_RR -l 30  # Good: 30s
```

## Statistical Methodology

```bash
#!/bin/bash
# Run multiple iterations and calculate statistics
RUNS=10
RESULTS=()

for i in $(seq 1 $RUNS); do
  BPS=$(kubectl exec iperf-client -- iperf3 -c $SERVER_IP -t 20 --omit 3 -P 1 -J | \
    jq '.end.sum_sent.bits_per_second')
  RESULTS+=($BPS)
  sleep 5  # Cool-down between runs
done

# Calculate mean, stddev, CV
MEAN=$(echo "${RESULTS[@]}" | tr ' ' '\n' | awk '{s+=$1} END {printf "%.0f", s/NR}')
STDDEV=$(echo "${RESULTS[@]}" | tr ' ' '\n' | awk -v m=$MEAN '{s+=($1-m)^2} END {printf "%.0f", sqrt(s/NR)}')
CV=$(echo "scale=2; $STDDEV * 100 / $MEAN" | bc)

echo "Mean: $(echo "scale=2; $MEAN/1000000000" | bc) Gbps"
echo "StdDev: $(echo "scale=2; $STDDEV/1000000000" | bc) Gbps"
echo "CV: ${CV}%"
echo "Minimum runs for <5% CV: at least 10"
```

## Warm-Up and Cool-Down

```bash
# iperf3 has built-in omit for warm-up
kubectl exec iperf-client -- iperf3 -c $SERVER_IP -t 30 --omit 5 -P 1

# For netperf, run a short warm-up test first
kubectl exec netperf-client -- netperf -H $SERVER_IP -t TCP_RR -l 5 > /dev/null
sleep 2
# Then run the actual measurement
kubectl exec netperf-client -- netperf -H $SERVER_IP -t TCP_RR -l 30
```

## Benchmark Suite Script

```bash
#!/bin/bash
# comprehensive-benchmark.sh
SERVER_IP=$1
RESULTS_DIR="/tmp/benchmark-$(date +%Y%m%d-%H%M%S)"
mkdir -p $RESULTS_DIR

echo "=== Cilium Performance Benchmark Suite ==="
echo "Date: $(date)"
echo "Cilium version: $(cilium version --client)"

# Throughput tests
for STREAMS in 1 8 32; do
  echo "--- Throughput: $STREAMS streams ---"
  for i in $(seq 1 5); do
    kubectl exec iperf-client -- iperf3 -c $SERVER_IP -t 20 --omit 3 -P $STREAMS -J \
      > $RESULTS_DIR/throughput_${STREAMS}s_run${i}.json
    sleep 5
  done
done

# Latency tests
echo "--- TCP_RR ---"
for i in $(seq 1 5); do
  kubectl exec netperf-client -- netperf -H $SERVER_IP -t TCP_RR -l 20 \
    > $RESULTS_DIR/tcp_rr_run${i}.txt
  sleep 3
done

# Connection rate tests
echo "--- TCP_CRR ---"
for i in $(seq 1 5); do
  kubectl exec netperf-client -- netperf -H $SERVER_IP -t TCP_CRR -l 20 \
    > $RESULTS_DIR/tcp_crr_run${i}.txt
  sleep 3
done

echo "Results saved to $RESULTS_DIR"
```

## Verification

```bash
# Validate benchmark methodology
# Run 10 iterations and check CV is below 5%
echo "If CV > 5%, increase test duration or check for interference"
```

## Troubleshooting

- **High variance between runs**: Increase test duration, add warm-up period, check for background load.
- **First run always different**: Add --omit flag to iperf3 or run a warm-up test before measuring.
- **Results differ between testers**: Standardize the benchmark script and server configuration.
- **iperf3 JSON parsing fails**: Check iperf3 version compatibility (3.9+ recommended).

## Systematic Tuning Methodology

Performance tuning should follow a systematic approach to avoid chasing false leads:

### Step 1: Measure Before Tuning

Always establish a pre-tuning baseline with multiple runs:

```bash
#!/bin/bash
echo "=== Pre-Tuning Baseline ==="
for i in $(seq 1 5); do
  kubectl exec perf-client -- iperf3 -c perf-server -t 15 -P 1 -J | \
    jq '.end.sum_sent.bits_per_second / 1000000000' | \
    xargs -I{} echo "Run $i: {} Gbps"
  sleep 5
done
```

### Step 2: Change One Variable at a Time

Never apply multiple changes simultaneously. Each change should be:
1. Applied independently
2. Measured with the same benchmark methodology
3. Documented with before/after results
4. Reverted if it causes regression

### Step 3: Verify Improvements Are Real

A 2% improvement might be within measurement noise. Use statistical tests to confirm improvements are significant:

```bash
# Compare two sets of measurements
# Use the Welch's t-test threshold of p < 0.05
# In practice, require at least 5% improvement with CV < 5%
```

### Step 4: Document the Final Configuration

After all tuning is complete, document the full configuration as the new baseline:

```bash
# Export final Cilium configuration
helm get values cilium -n kube-system -o yaml > cilium-tuned-values-$(date +%Y%m%d).yaml

# Record final benchmark results
echo "Final tuned throughput: X Gbps"
echo "Improvement from baseline: Y%"
```

### Common Tuning Pitfalls

Avoid these common mistakes in performance tuning:

- **Cargo-cult tuning**: Applying settings from blog posts without understanding why they help
- **Over-tuning**: Making changes that help benchmarks but hurt real workloads
- **Ignoring tail latency**: Optimizing mean while p99 gets worse
- **Hardware-specific tuning**: Settings that work on one hardware platform may hurt on another

## Conclusion

Tuning benchmarks for Cilium performance testing requires attention to test duration, warm-up periods, statistical methodology, and cool-down between runs. A well-tuned benchmark suite produces consistent, comparable results that accurately reflect Cilium's actual performance. The investment in benchmark methodology pays dividends by preventing false conclusions from noisy data.
