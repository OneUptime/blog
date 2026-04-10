# How to Write a Ceph Performance Benchmarking Script

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Benchmarking, Performance, Scripting, Bash

Description: Write a comprehensive Ceph performance benchmarking script that tests throughput and IOPS across object, block, and filesystem storage layers using built-in tools.

---

Benchmarking Ceph performance before deploying workloads helps you understand baseline throughput, IOPS, and latency. A scripted benchmark produces reproducible results you can compare across configurations and upgrades.

## Benchmark Script Structure

```bash
#!/bin/bash
# ceph-benchmark.sh
# Runs performance benchmarks across Ceph storage layers

set -euo pipefail

NAMESPACE="${CEPH_NAMESPACE:-rook-ceph}"
TOOLS="deploy/rook-ceph-tools"
BENCH_POOL="${BENCH_POOL:-benchmarks}"
BENCH_DURATION="${BENCH_DURATION:-60}"  # seconds per test
OUTPUT_DIR="${OUTPUT_DIR:-./ceph-bench-$(date +%Y%m%d-%H%M%S)}"
RBD_IMAGE="${RBD_IMAGE:-bench-rbd}"
RBD_SIZE="${RBD_SIZE:-10G}"

mkdir -p "$OUTPUT_DIR"

ceph_cmd() {
  kubectl -n "$NAMESPACE" exec "$TOOLS" -- ceph "$@"
}

rados_cmd() {
  kubectl -n "$NAMESPACE" exec "$TOOLS" -- rados "$@"
}

log() { echo "[$(date '+%H:%M:%S')] $*" | tee -a "$OUTPUT_DIR/benchmark.log"; }
```

## Setting Up the Benchmark Environment

```bash
setup_benchmark() {
  log "Setting up benchmark environment..."

  # Create benchmark pool if needed
  if ! ceph_cmd osd pool ls | grep -q "$BENCH_POOL"; then
    ceph_cmd osd pool create "$BENCH_POOL" 32 32
    ceph_cmd osd pool application enable "$BENCH_POOL" benchmark
    log "Created pool: $BENCH_POOL"
  fi

  # Record cluster state before benchmark
  ceph_cmd status > "$OUTPUT_DIR/pre-bench-status.txt"
  ceph_cmd osd perf > "$OUTPUT_DIR/pre-bench-osd-perf.txt"
}
```

## RADOS Object Storage Benchmark

```bash
bench_rados() {
  log "Running rados bench write test ($BENCH_DURATION seconds)..."
  rados_cmd -p "$BENCH_POOL" bench "$BENCH_DURATION" write \
    --no-cleanup --run-name "bench-$USER" \
    > "$OUTPUT_DIR/rados-write.txt" 2>&1

  log "Running rados bench sequential read test..."
  rados_cmd -p "$BENCH_POOL" bench "$BENCH_DURATION" seq \
    --run-name "bench-$USER" \
    > "$OUTPUT_DIR/rados-seq-read.txt" 2>&1

  log "Running rados bench random read test..."
  rados_cmd -p "$BENCH_POOL" bench "$BENCH_DURATION" rand \
    --run-name "bench-$USER" \
    > "$OUTPUT_DIR/rados-rand-read.txt" 2>&1

  # Cleanup
  rados_cmd -p "$BENCH_POOL" cleanup --run-name "bench-$USER" || true
}
```

## RBD Block Storage Benchmark with fio

```bash
bench_rbd() {
  log "Setting up RBD image for benchmarking..."
  kubectl -n "$NAMESPACE" exec "$TOOLS" -- \
    rbd create --size "$RBD_SIZE" --pool "$BENCH_POOL" "$RBD_IMAGE" || true

  log "Running fio benchmark on RBD..."
  kubectl -n "$NAMESPACE" exec "$TOOLS" -- bash -c "
    rbd map $BENCH_POOL/$RBD_IMAGE || true
    DEV=\$(rbd showmapped --format json | python3 -c \
      \"import sys,json; d=json.load(sys.stdin); \
      [print(v['device']) for v in d.values() if v['name']=='$RBD_IMAGE']\")

    fio --name=rbd-seq-write \
      --filename=\$DEV \
      --direct=1 \
      --rw=write \
      --bs=4M \
      --iodepth=16 \
      --numjobs=4 \
      --runtime=$BENCH_DURATION \
      --time_based \
      --output-format=json
  " > "$OUTPUT_DIR/rbd-seq-write.json" 2>&1

  log "RBD benchmark complete"
}
```

## Extracting Key Metrics

```python
#!/usr/bin/env python3
# parse-bench-results.py

import re
import sys

def parse_rados_bench(filename: str) -> dict:
    """Extract metrics from rados bench output."""
    metrics = {}
    with open(filename) as f:
        for line in f:
            m = re.search(r'Bandwidth \(MB/sec\):\s+([\d.]+)', line)
            if m:
                metrics['bandwidth_mb_s'] = float(m.group(1))
            m = re.search(r'Average IOPS:\s+([\d.]+)', line)
            if m:
                metrics['avg_iops'] = float(m.group(1))
            m = re.search(r'Average Latency\(s\):\s+([\d.]+)', line)
            if m:
                metrics['avg_latency_s'] = float(m.group(1))
    return metrics


def main():
    output_dir = sys.argv[1] if len(sys.argv) > 1 else "."
    print("=== Benchmark Summary ===\n")
    for test in ["rados-write", "rados-seq-read", "rados-rand-read"]:
        fname = f"{output_dir}/{test}.txt"
        try:
            metrics = parse_rados_bench(fname)
            print(f"{test}:")
            print(f"  Bandwidth: {metrics.get('bandwidth_mb_s', 'N/A')} MB/s")
            print(f"  IOPS:      {metrics.get('avg_iops', 'N/A')}")
            print(f"  Latency:   {metrics.get('avg_latency_s', 'N/A')}s\n")
        except FileNotFoundError:
            print(f"{test}: results not found\n")

if __name__ == "__main__":
    main()
```

## Running the Full Benchmark Suite

```bash
setup_benchmark
bench_rados
bench_rbd

log "Parsing results..."
python3 parse-bench-results.py "$OUTPUT_DIR"

log "Benchmarks complete. Results in: $OUTPUT_DIR"
```

## Summary

A scripted Ceph benchmark suite covers RADOS object storage and RBD block storage in a reproducible way. By capturing pre-benchmark cluster state alongside results and parsing outputs into structured summaries, you create a benchmark history that's useful for comparing performance across Ceph upgrades and configuration changes.
