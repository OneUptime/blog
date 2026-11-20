# Diagnose Growing Aerospike Tombstones Before Tuning Tomb Raider

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Aerospike, Database, Monitoring, Troubleshooting

Description: Find what prevents Aerospike tombstone cleanup by checking age, migrations, old storage copies, XDR delivery, and tomb-raider progress.

After a large durable-delete job, application records disappear but tombstones keep accumulating. Reducing the cleanup interval looks tempting. However, a faster cleanup worker cannot remove a deletion marker that is still protecting an older copy of the record.

A tombstone records that a key was deleted. Aerospike retains it to prevent stale versions from returning during recovery or cluster changes. Tomb raider is the background process that determines when these markers can safely disappear. This guide uses **Aerospike Database Enterprise Edition 8.2** as its reference and keeps the diagnostic commands read-only.

The useful question is not simply “why is the count high?” It is “which condition is preventing safe removal, and is the resulting resource usage within our capacity plan?”

## Separate creation rate from removal eligibility

A rising count can be normal during a delete burst. It can also continue after application deletes stop: from Database 8.0, completed multi-record transactions create durable-delete markers for transaction monitor records. Check the workload responsible for creating tombstones before assuming cleanup has regressed. [Durable delete architecture](https://aerospike.com/docs/database/learn/architecture/durable-deletes/)

Think of the count as arrivals minus removals, with migrations changing where copies reside. If you delete a million keys within a few minutes, a high immediate count does not demonstrate a stuck worker. If a steady workload produces an indefinitely rising count, you need both an explanation and a capacity response.

Use two separate views: a per-node tombstone count over time and evidence of completed cleanup work. A single cluster sum can conceal one node that has stopped progressing or make a rebalance look like new deletion activity.

## Check the safety conditions together

For persisted data, the documented removal conditions include sufficient age, no earlier stored copies, no pending incoming migration, and successful shipping where cross-datacenter replication (XDR) applies. These conditions are cumulative. Passing the age check alone does not authorize removal. [Tombstone recovery conditions](https://support.aerospike.com/hc/en-us/articles/49939152086555-How-to-recover-tombstones-faster)

| Condition | Evidence to collect | What a failure suggests |
|---|---|---|
| Minimum retention age passed | Actual `tomb-raider-eligible-age` and deletion timing | Recent markers may still be intentionally protected |
| Earlier stored copies gone | Storage/defragmentation history and tomb-raider logs | Older versions can still block removal |
| Incoming migrations finished | Per-node receive migration statistics | Cluster movement is still protecting deletion state |
| Required XDR shipping complete | Destination health and shipping progress | A lagging destination can hold markers |
| Cleanup process runs | Configured period and phase/completion logs | Scheduling or execution needs investigation |

Do not infer an individual tombstone's age from when the dashboard count started rising. A busy namespace contains markers from many operations and times. A quiet staging workload is much easier to use for precise age experiments.

## Capture configuration and statistics consistently

The following script requires Bash and installed Aerospike tools. Replace the example addresses and `test` namespace, and add your deployment's normal authentication and TLS settings to each request. It records UTC time and then reads configuration and namespace statistics from each listed node.

```bash
set -e
for node in 10.20.0.11 10.20.0.12 10.20.0.13; do
  date -u '+%Y-%m-%dT%H:%M:%SZ'
  printf 'Node: %s\n' "$node"
  asinfo -h "$node" -p 3000 \
    -v 'get-config:context=namespace;namespace=test' -l
  asinfo -h "$node" -p 3000 -v 'namespace/test' -l
done
```

The script stops if a request exits unsuccessfully. Preserve its output and any errors as evidence; do not label an incomplete collection as healthy. Repeat the collection after the relevant cleanup interval and a completed cycle, rather than repeatedly polling every second. Request formats come from the [info command reference](https://aerospike.com/docs/database/reference/info/).

In the namespace statistics, inspect `tombstones`, `master_tombstones`, `prole_tombstones`, and `migrate_rx_partitions_remaining` where available. Master and replica markers are different copies, not separate business deletions. The [metrics reference](https://aerospike.com/docs/database/reference/metrics/) defines their scope. Keep node identity and server uptime alongside comparisons so restarts and ownership changes remain visible.

## Read the knobs without changing them first

`tomb-raider-period` controls the minimum interval between runs. Its default is 86400 seconds; setting it to zero disables tomb raider. `tomb-raider-eligible-age` also defaults to 86400 seconds, but controls minimum protection time instead of scheduling. Those two equal defaults have different purposes. [Configuration reference](https://aerospike.com/docs/database/reference/config/)

`tomb-raider-sleep` is measured in microseconds, with a default of 1000. Lowering it increases the intensity of storage traversal. Database 8.1.2 introduced `tomb-raider-unmark-threads`: zero uses one thread per device or memory stripe, while a positive value limits parallelism. Changes apply at the next unmark phase rather than retroactively changing threads already running. [Thread control documentation](https://aerospike.com/docs/database/reference/config/#tomb-raider-unmark-threads)

The unmark phase examines storage and removes “safe to remove” candidate status from markers that still protect stored data. Aerospike calls those candidates cenotaphs. Use the [log reference](https://aerospike.com/docs/database/reference/logs/) to identify phase activity for your storage engine and version. A worker that completes cycles while retaining protected markers is behaving differently from a worker that never completes a cycle.

## Understand why a quiet cluster can retain markers

Defragmentation makes storage blocks reusable, but reusable blocks may still contain old bytes until later writes overwrite them. At low write volume, earlier versions can remain on storage for a long time. Tomb raider must retain the corresponding markers. Aerospike explicitly documents this behavior for lightly loaded systems. [Low-load tombstone retention](https://support.aerospike.com/hc/en-us/articles/49938439804059-Durable-delete-tombstones-never-removed-in-system-where-load-is-extremely-low)

This explains a counterintuitive observation: stopping writers after a bulk deletion may not make every tombstone disappear quickly. The system has less pressure to overwrite old storage. That does not justify generating arbitrary production writes just to force the count down. Such traffic consumes capacity and can raise latency without resolving the intended operational risk.

First decide whether retained markers are actually exhausting index or storage headroom. If they are, plan additional capacity or a reviewed maintenance procedure with Aerospike support. Device wiping and node replacement are recovery operations, not routine dashboard cleanup techniques.

## Tune the confirmed bottleneck, not every parameter

If the worker is disabled unexpectedly, correct the configuration through your normal deployment process. If incoming migrations remain, investigate why they are not completing. If XDR is behind, restore delivery and assess destination state. Shortening the cleanup interval will not bypass either dependency.

If eligible markers accumulate because traversal takes too long, measure device read load, CPU, and application tail latency during a cycle. Test one concurrency or pacing change in staging, observe a full subsequent cycle, and retain the old value for rollback. More parallelism can compete with application reads; less sleeping can increase device pressure.

Do not lower eligible age as a first performance adjustment. That setting protects against stale data from absent nodes. A node that has been offline beyond the protection window must follow the documented safe reintroduction procedure, with its data handled deliberately. Changing the window requires agreement between the retention policy and the node-maintenance runbook.

## Define what recovery looks like

A useful acceptance result includes completed tomb-raider cycles, understood migration and XDR state, stable resource headroom, and a tombstone trend consistent with the workload. Zero tombstones is not a universal target for a system that continuously performs durable deletes or transactions.

For a staging test, use a small identified dataset, record deletion times, and track markers across the configured age and cleanup cycles. Include a low-write phase so you can see the storage dependency. Verify that deleted keys remain absent throughout. Compare application latency before and after any proposed tuning change.

The shell example was syntax-checked and exercised with a local command stub to verify collection order and failure handling. No Aerospike cluster or storage workload was run; actual cleanup timing and safe tuning values must come from your environment.
