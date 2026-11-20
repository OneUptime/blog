# Tune Aerospike Defragmentation Without Excessive Write Amplification

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Aerospike, Database, Performance, Troubleshooting

Description: Diagnose falling Aerospike free-block capacity after deletes and tune defragmentation eligibility and pacing with measurable safeguards.

You delete a large batch of Aerospike records, yet available storage keeps falling. The application team expects deleted bytes to become free immediately. The storage engine still needs to consolidate the surviving records, and incoming writes may be consuming free blocks faster than that work returns them.

Defragmentation solves this problem by copying live records out of partially occupied blocks and making the original blocks reusable. It also creates additional reads and writes. Tuning it successfully means recovering enough write capacity without overwhelming the same devices serving the application.

This guide uses **Database 8.2 with device-backed storage**. Memory-only namespaces have different I/O trade-offs. The example change is deliberately scoped to one staging node and one namespace; it is not a recommended production default.

## Measure Aerospike's available blocks

Aerospike appends data into write blocks. Updates and deletes leave obsolete portions within those blocks. A filesystem's free-space report does not describe how many Aerospike write blocks are immediately reusable, particularly with raw devices or preallocated data files. [Defragmentation architecture](https://aerospike.com/docs/database/manage/namespace/storage/defrag/)

Start with `data_avail_pct`, `data_used_pct`, and per-device free-block counts. `data_avail_pct` represents the minimum available percentage across configured storage units, so investigate individual devices rather than assuming the namespace average describes every device. [Metrics reference](https://aerospike.com/docs/database/reference/metrics/)

With Aerospike tools installed, replace this address and namespace. Add your normal authentication and TLS options. These requests do not modify the server:

```bash
asinfo -h 10.20.0.11 -p 3000 -v 'namespace/test' -l
asinfo -h 10.20.0.11 -p 3000 \
  -v 'get-config:context=namespace;namespace=test' -l
```

Preserve the full responses with timestamps and repeat on other affected nodes. The [info command reference](https://aerospike.com/docs/database/reference/info/) documents these request forms. Capture application throughput and latency over the same interval so storage observations have workload context.

## Decide whether the problem is eligibility or throughput

Two controls answer different questions:

- `defrag-lwm-pct` decides which partially occupied blocks qualify for cleanup. LWM means low-water mark. Its default is 50 percent.
- `defrag-sleep` controls pacing. In Database 7.1 and later, it sleeps between reads of `flush-size` segments; the default is 1000 microseconds.

Those definitions come from the [configuration reference](https://aerospike.com/docs/database/reference/config/). Reducing sleep does not make an ineligible block eligible. Raising the low-water mark does not add device throughput.

| Observation | Likely next investigation |
|---|---|
| Available blocks fall while the defrag queue grows | Whether cleanup throughput is falling behind |
| Available blocks fall but the defrag queue stays empty | Block eligibility, post-write cache, and occupancy distribution |
| Queue shrinks but latency rises sharply | Device contention from cleanup work |
| Only one device has poor availability | Per-device load and layout rather than cluster-wide tuning |

These are hypotheses, not diagnoses from one sample. Confirm a sustained trend and check recent bulk expiry, truncation, migration, or workload changes. Several of those operations can make many blocks eligible at once.

## Understand the cost of reclaiming denser blocks

Suppose four blocks are each 75 percent live. Compacting their survivors requires three destination blocks and yields only one net free block. With two half-live blocks, survivors fit into one destination block and produce the same net free block with much less copying.

The official [disk and defragmentation FAQ](https://aerospike.com/docs/database/reference/faq/ops-disk-defrag/) illustrates the following write-amplification levels:

| Live occupancy in the illustrative model | Total write amplification |
|---|---|
| 50% | 2 times |
| 75% | 4 times |
| 90% | 10 times |

For this simplified steady-state model, the relationship is `1 / (1 - live_fraction)`. It explains why the cost rises sharply as you try to reclaim nearly full blocks. It is not a device benchmark or a promise that the observed ratio equals the configured threshold. Actual candidate occupancy, workload, caching, and flush behavior affect the result.

Raising the low-water mark can admit a large backlog of denser blocks at once. Do not interpret the resulting jump in the defrag queue as proof that the change fixed the problem. You still need enough capacity to process it without violating application latency requirements.

## Follow the queue and device activity together

For each device, examine `storage-engine.device[ix].defrag_q`, `free_wblocks`, `defrag_writes`, and the write queue. Use the corresponding file metrics for file-backed storage. `defrag_q` is a queue-size gauge; `defrag_writes` is a cumulative counter. Compare counter changes over matching intervals and account for process restarts. [Device metric definitions](https://aerospike.com/docs/database/reference/metrics/)

The device ticker log also reports `write`, `defrag-write`, `defrag-q`, and `free-wblocks`. Its write figures include defrag writes, so do not add defrag writes to total writes again. [Device log reference](https://aerospike.com/docs/database/reference/logs/)

A shrinking queue with declining available blocks can still indicate inadequate net recovery relative to incoming traffic. Conversely, a temporary queue increase after mass expiry may be acceptable when available capacity remains healthy and the backlog subsequently drains. Judge the whole trend.

## Test one pacing change with a rollback value

If eligible work is queued, free blocks are falling, and the device has measured headroom, a modest pacing adjustment is worth a staging experiment. First record the existing `defrag-sleep` from the configuration response. The following example assumes that value is **1000**, and tests **500** on a disposable staging namespace named `defrag_lab` at an example address:

```bash
asinfo -h 10.20.0.21 -p 3000 \
  -v 'set-config:context=namespace;namespace=defrag_lab;defrag-sleep=500'
asinfo -h 10.20.0.21 -p 3000 \
  -v 'get-config:context=namespace;namespace=defrag_lab' -l
```

Unlike the earlier requests, the first command changes runtime configuration. Expect an `ok` response, then verify the value independently. The setting and dynamic change are documented in the [defragmentation guide](https://aerospike.com/docs/database/manage/namespace/storage/defrag/). The `namespace=` selector is the current form documented for `set-config`.

Observe a representative workload interval. Compare free-block trend, queue growth, device activity, and application tail latency against the baseline. Stop the experiment if latency breaches the agreed limit or resource headroom deteriorates. For this specific baseline, restore the original value with:

```bash
asinfo -h 10.20.0.21 -p 3000 \
  -v 'set-config:context=namespace;namespace=defrag_lab;defrag-sleep=1000'
```

Use your actual saved value if it differs. Verify restoration with the configuration read. Runtime changes are not a substitute for updating deployment configuration when a tested setting is deliberately adopted.

## When eligibility really is the constraint

An empty queue with poor availability warrants checking block occupancy before increasing `defrag-lwm-pct`. Also check `post-write-cache`: blocks still held there are not candidates for defragmentation. A cache that is large relative to device capacity can matter. The [capacity-planning guide](https://aerospike.com/docs/database/manage/planning/capacity/) discusses both reserved headroom and this cache boundary.

If the evidence supports an eligibility change, test a small increment independently from pacing changes. Recalculate the write-amplification trade-off and watch the initial queue surge. Avoid filling devices to a new maximum merely because a brief experiment reclaimed space; reserve room for failure, migration, and workload bursts.

## Confirm sustainable recovery

A successful result has stable or improving available blocks under ordinary traffic, a bounded queue, and acceptable application latency. Observe the next representative deletion burst as well as steady state. A setting that works only with writers paused is not yet a sustainable solution.

If the hardware cannot keep up, reduce the workload or plan additional capacity. Lowering the stop-writes safety margin does not make defragmentation faster. Preserve enough working space for the database to recover.

The command blocks were syntax-checked and source-reviewed, and the amplification arithmetic was checked locally. No server settings were changed or storage benchmark run. The staging procedure supplies a way to measure your own safe operating point.
