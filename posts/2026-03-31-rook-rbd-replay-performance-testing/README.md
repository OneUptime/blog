# How to Use RBD Replay for Performance Testing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, Performance, Testing

Description: Learn how to use RBD replay to capture and replay I/O workloads against Ceph block devices for performance testing and regression analysis.

---

## What Is RBD Replay

RBD replay is a two-phase tool for capturing and replaying I/O workloads against RBD block devices. It consists of:

- **LTTng** to capture librbd userspace traces during a workload
- `rbd-replay-prep` to convert the LTTng traces into a replay file
- `rbd-replay` to replay the captured I/O against a target RBD image

This allows you to benchmark Ceph cluster performance using realistic workloads captured from production systems, and to compare performance before and after configuration changes.

## Step 1 - Prerequisites

Ensure the following are available in the Rook toolbox or on the test node:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- bash
rbd --version
which lttng
which rbd-replay-prep
which rbd-replay
```

Install LTTng and babeltrace if not present:

```bash
apt-get install -y lttng-tools lttng-modules-dkms liblttng-ust-dev babeltrace
```

## Step 2 - Capture I/O with LTTng

Create an LTTng session and enable librbd tracepoints to capture I/O operations:

```bash
lttng create librbd-trace -o /tmp/lttng-traces
lttng enable-event -u 'librbd:*'
lttng add-context -u -t pthread_id
lttng start
```

Now run your workload against the RBD image (e.g., using fio, dd, or your application). Once the workload completes, stop the trace:

```bash
lttng stop
lttng destroy
```

## Step 3 - Convert Traces with rbd-replay-prep

Convert the LTTng traces to a format usable by rbd-replay:

```bash
rbd-replay-prep /tmp/lttng-traces/ust/uid/*/* /tmp/rbd-replay-workload
```

## Step 4 - Set Up a Target Image for Replay

Create a target image for replay (same size as source):

```bash
rbd create replicapool/replay-target --size 10G
```

## Step 5 - Run the Replay

Replay the captured workload against the target image. `rbd-replay` connects directly to the Ceph cluster via librados, so no kernel mapping is needed:

```bash
rbd-replay --pool replicapool --latency-multiplier=1 \
  --map-image "myimage=replay-target" /tmp/rbd-replay-workload
```

Key flags:
- `--latency-multiplier` - Scale replay speed (1 = original speed, 0 = as fast as possible)
- `--pool` - Target pool for the replay
- `--map-image` - Remap image names from the trace to different target images
- `--read-only` - Perform only read operations (useful for safe testing)

## Step 6 - Measure Throughput During Replay

While replay runs, monitor Ceph OSD performance using `ceph osd perf` or the `--dump-perf-counters` flag:

```bash
rbd-replay --pool replicapool --latency-multiplier=1 \
  --map-image "myimage=replay-target" --dump-perf-counters \
  /tmp/rbd-replay-workload
```

You can also monitor OSD-level I/O from a separate terminal:

```bash
ceph osd perf
```

## Step 7 - Compare Before and After

Run the same replay before and after tuning librbd settings, changing CRUSH rules, or adding OSDs:

```bash
# Before tuning
rbd-replay --pool replicapool --latency-multiplier=0 \
  --map-image "myimage=replay-target" /tmp/rbd-replay-workload \
  2>&1 | tee /tmp/before-tuning.log

# After tuning - run again with same capture
rbd-replay --pool replicapool --latency-multiplier=0 \
  --map-image "myimage=replay-target" /tmp/rbd-replay-workload \
  2>&1 | tee /tmp/after-tuning.log
```

Compare total I/O time and latency distributions between both runs.

## Summary

RBD replay provides a rigorous method for performance testing Ceph block storage by capturing real workloads with LTTng and replaying them against test images. The workflow involves capturing librbd traces from production with LTTng, converting them to rbd-replay format with `rbd-replay-prep`, and running the replay with `--latency-multiplier=0` for maximum speed benchmarking. This enables objective before-and-after comparisons when tuning Rook-Ceph configurations.
