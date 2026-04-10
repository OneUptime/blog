# How to Benchmark Ceph After Version Upgrades

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Benchmarking, Upgrade, Performance, Testing

Description: Establish and run a repeatable benchmark suite after Ceph version upgrades to verify performance regressions, validate improvements, and confirm cluster health and throughput.

---

## Why Benchmark After Upgrades

Ceph version upgrades can introduce performance regressions due to changes in BlueStore defaults, RocksDB versions, network protocol handling, or OSD op queue behavior. Running a consistent benchmark suite before and after upgrades provides quantitative comparison data and catches regressions before they affect production workloads.

## Pre-Upgrade Baseline Collection

Always run benchmarks before the upgrade and save results:

```bash
# Create results directory
mkdir -p /tmp/ceph-benchmarks/pre-upgrade
cd /tmp/ceph-benchmarks/pre-upgrade

# Record cluster version
ceph version > cluster-info.txt
ceph status >> cluster-info.txt

# Object store benchmark
rados bench -p benchmark-pool 60 write --no-cleanup -b 4M -t 16 \
    > rados-write-4M.txt 2>&1

rados bench -p benchmark-pool 60 seq -t 16 > rados-seq-read.txt 2>&1
rados bench -p benchmark-pool 60 rand -t 16 > rados-rand-read.txt 2>&1

# Clean up
rados -p benchmark-pool cleanup > /dev/null 2>&1
```

## Creating a Dedicated Benchmark Pool

Use a separate pool for benchmarks to avoid impacting production:

```bash
# Create benchmark pool
ceph osd pool create benchmark-pool 64 64
ceph osd pool set benchmark-pool size 3

# Verify pool is healthy
ceph osd pool ls detail | grep benchmark
```

## Block Storage Benchmark Script

Create a repeatable fio benchmark:

```bash
#!/bin/bash
# ceph-benchmark.sh - run after creating image: rbd create benchmark-pool/bench --size 20G

RESULTS_DIR=${1:-/tmp/ceph-benchmarks/$(date +%Y%m%d-%H%M%S)}
mkdir -p "$RESULTS_DIR"

echo "Collecting results in $RESULTS_DIR"
ceph version > "$RESULTS_DIR/version.txt"

# Sequential write (1 MB blocks)
echo "Testing sequential write..."
fio --ioengine=rbd --pool=benchmark-pool --rbdname=bench \
    --rw=write --bs=1M --numjobs=4 --iodepth=16 --runtime=60 \
    --name=seq-write --group_reporting --output-format=json \
    > "$RESULTS_DIR/seq-write.json"

# Sequential read (1 MB blocks)
echo "Testing sequential read..."
fio --ioengine=rbd --pool=benchmark-pool --rbdname=bench \
    --rw=read --bs=1M --numjobs=4 --iodepth=16 --runtime=60 \
    --name=seq-read --group_reporting --output-format=json \
    > "$RESULTS_DIR/seq-read.json"

# Random read IOPS (4 KB blocks)
echo "Testing random read IOPS..."
fio --ioengine=rbd --pool=benchmark-pool --rbdname=bench \
    --rw=randread --bs=4k --numjobs=8 --iodepth=128 --runtime=60 \
    --name=rand-read --group_reporting --output-format=json \
    > "$RESULTS_DIR/rand-read.json"

# Random write IOPS (4 KB blocks)
echo "Testing random write IOPS..."
fio --ioengine=rbd --pool=benchmark-pool --rbdname=bench \
    --rw=randwrite --bs=4k --numjobs=8 --iodepth=128 --runtime=60 \
    --name=rand-write --group_reporting --output-format=json \
    > "$RESULTS_DIR/rand-write.json"

echo "Done. Results saved to $RESULTS_DIR"
```

## Parsing and Comparing Results

Extract key metrics from JSON output:

```python
#!/usr/bin/env python3
import json
import sys

def parse_fio_result(filepath):
    with open(filepath) as f:
        data = json.load(f)
    job = data['jobs'][0]
    return {
        'read_bw_mb': job['read']['bw'] / 1024,
        'write_bw_mb': job['write']['bw'] / 1024,
        'read_iops': job['read']['iops'],
        'write_iops': job['write']['iops'],
        'read_lat_p99_us': job['read']['lat_ns']['percentile'].get('99.000000', 0) / 1000,
        'write_lat_p99_us': job['write']['lat_ns']['percentile'].get('99.000000', 0) / 1000,
    }

pre_dir = sys.argv[1]
post_dir = sys.argv[2]
tests = ['seq-write', 'seq-read', 'rand-read', 'rand-write']

for test in tests:
    pre = parse_fio_result(f"{pre_dir}/{test}.json")
    post = parse_fio_result(f"{post_dir}/{test}.json")
    print(f"\n{test}:")
    for metric, pre_val in pre.items():
        post_val = post[metric]
        if pre_val == 0 and post_val == 0:
            continue
        if pre_val == 0:
            change = float('inf')
        else:
            change = ((post_val - pre_val) / pre_val) * 100
        status = "OK" if change > -10 else "REGRESSION"
        print(f"  {metric}: {pre_val:.1f} -> {post_val:.1f} ({change:+.1f}%) [{status}]")
```

## Post-Upgrade Checklist

After upgrading and running benchmarks:

```bash
# 1. Verify cluster health
ceph health detail

# 2. Check OSD performance
ceph osd perf | sort -k3 -n | tail -10

# 3. Verify no slow ops
ceph daemon osd.0 ops | grep -v '"age": 0'

# 4. Confirm no scrub errors
ceph pg ls inconsistent

# 5. Check for any new config deprecation warnings
ceph log last 100 | grep -i deprecat
```

## Summary

Post-upgrade benchmarking requires a pre-upgrade baseline, a consistent benchmark script that tests sequential throughput and random IOPS, and automated comparison tooling to flag regressions. Using a dedicated benchmark pool with persistent test images ensures repeatable conditions. Automated comparison scripts that flag greater-than-10% regressions provide clear pass/fail criteria for production readiness after Ceph upgrades.
