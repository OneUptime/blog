# Aerospike Dead Partitions After Disk Replacement: When to Revive

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Aerospike, Database, Disaster Recovery, Troubleshooting

Description: Assess Aerospike dead partitions after disk replacement, preserve recovery options, and distinguish a justified revive from accepting unknown data loss.

A replacement disk is installed, the Aerospike process starts, and every expected node appears online. Yet some requests still fail and `show pmap` reports dead partitions. Replacing the hardware restored a place to store data. It did not prove that all acknowledged records survived.

In strong-consistency mode, a dead partition is a safety signal. The cluster cannot establish the required data guarantees for that partition. The `revive` operation acknowledges the potential loss and allows recovery to proceed; it does not reconstruct missing records.

This guide uses **Enterprise Database 8.2** and command syntax checked against **asadm 5.2.0**. It is an investigation and decision procedure, not a disk-wiping or automatic-repair script.

## Distinguish unavailable from dead

Aerospike distributes a namespace across partitions, with replicated copies on different nodes. The roster identifies the intended nodes for a strong-consistency namespace. A missing roster member or network problem can make partitions unavailable. When the complete roster is present but the required trusted data is not established, partitions can be reported as dead. The reported category can change as membership changes. [Partition metric definitions](https://aerospike.com/docs/database/reference/metrics/)

Do not sum identical dead-partition counts from every node and call the total unique damaged partitions. Keep the namespace, node, cluster key, and partition-map view together. A dashboard row is an observation from a node, not necessarily an independent set of losses.

| Observation | Initial response |
|---|---|
| Expected roster node missing | Restore connectivity or the missing node where possible |
| All expected nodes present, dead partitions remain | Investigate storage history, shutdowns, and trust state |
| Node identity changed after maintenance | Compare observed membership with the intended roster |
| Startup or migrations are incomplete | Understand progress before making a recovery decision |

A healthy-looking process list is not sufficient evidence for any of these decisions.

## Stop changes that could destroy evidence

Pause further disk replacements and unrelated restarts. Preserve remaining devices, configuration, startup logs, and the maintenance timeline. Do not overwrite an old device that might contain the only recoverable copy.

If you are considering revival followed by data restoration, keep ordinary application writers fenced off from the affected namespace. Otherwise, new business writes can race with replayed or restored data. Record exactly which traffic is stopped and which recovery tools are still allowed.

Collect the following facts before choosing a path:

- Which devices were replaced, erased, unreadable, or disconnected, on which nodes and at what times.
- Whether each shutdown completed cleanly and whether the next startup completed before another interruption.
- The namespace replication factor, roster, and partition ownership during the events.
- Whether migrations completed between hardware operations.
- Which backups, transaction logs, or upstream event records cover the possible loss interval.

Replication factor counts copies, not an unlimited failure allowance. What matters is whether the failures or erasures overlapped copies of the same partitions. Two operations separated in time can still interact if the first did not finish restoring the required state.

## Capture the cluster view without modifying it

Connect with your normal authentication and TLS options. Replace the example seed address:

```bash
asadm -h 10.20.0.11 -p 3000
```

Inside asadm, collect these read-only views:

```text
info network
show roster
show pmap
info namespace object
```

Compare observed nodes with current and pending rosters. Look for accidental identity changes or pending roster edits. Preserve partition-map output before any action. The [administrative reference](https://aerospike.com/docs/database/tools/asadm/live-mode/) documents these commands and roster views.

For a particular node, the following `asinfo` requests add startup status, build, and namespace statistics. Replace `test`, supply your secure connection options, and repeat for every relevant node:

```bash
asinfo -h 10.20.0.11 -p 3000 -v status
asinfo -h 10.20.0.11 -p 3000 -v build
asinfo -h 10.20.0.11 -p 3000 -v 'namespace/test' -l
```

These requests are described in the [info reference](https://aerospike.com/docs/database/reference/info/). Correlate them with startup and partition logs, especially storage changes, unclean shutdowns, and appeal activity. An appeal is the process through which a returning node checks replication state with peers. [Partition log reference](https://aerospike.com/docs/database/reference/logs/)

## Decide whether records need to be recovered

There are two different justifications for proceeding with revival.

First, a reviewed investigation may establish that no writes were actually lost, even though the cluster could not prove that automatically. Aerospike documents such situations, including an interrupted fast restart. That is a conclusion about a specific event sequence, not permission to assume every dead partition is harmless. [Strong-consistency recovery discussion](https://aerospike.com/docs/database/learn/strong-consistency/)

Second, data may be missing and an explicit recovery plan may require making the namespace usable for restoration. If storage containing all copies of particular data was erased, an external trusted source is required to recover it. Without that source, revival accepts the loss. The same documentation recommends disabling applications while reviving and restoring in this scenario.

Describe the recovery source precisely. A backup from last night leaves a gap unless a separate replay source covers later changes. Replaying creates and updates without replaying deletions can resurrect intentionally removed records. Identify the ordering, deduplication, and cutoff rules before opening the namespace for recovery writes.

If you cannot determine the failure history or whether remaining devices contain needed data, preserve the cluster state and involve Aerospike support. Repeating destructive maintenance to “make the cluster clean” reduces the evidence available to recover it.

## Run revival only after the decision is explicit

The following is the documented administrative sequence for an approved recovery of the example namespace `recovery_lab`. Run it in an interactive asadm session connected to the intended cluster. It changes state and requires administrative privileges:

```text
enable
manage revive ns recovery_lab
manage recluster
show pmap
```

Replace the namespace only after checking the recovery scope and keeping ordinary writers blocked where restoration is required. Inspect every response. The server's revive action takes effect with reclustering, and availability still depends on trusted nodes. An `ok` response is not a data-completeness verdict. [Revive command definition](https://aerospike.com/docs/database/reference/info/#revive), [tagged asadm implementation](https://github.com/aerospike/aerospike-admin/blob/5.2.0/lib/live_cluster/manage_controller.py)

Do not change the roster just to make this sequence succeed. Roster changes are appropriate for deliberate permanent membership changes, using the separate consistency-management procedure. They alter the cluster's expectations about copies and must be reviewed in that context. [Cluster consistency management](https://aerospike.com/docs/database/manage/cluster/consistency/)

## Do not treat auto-revive as a disk-recovery feature

`auto-revive` skips the manual investigation window for supported startup scenarios. It does not rebuild lost data. The configuration reference explicitly excludes startup revival when storage was erased; the Database 7.1.0.9 release notes record that safeguard as AER-6772. Enabling it during a disk-loss incident is not a substitute for understanding what survived. [Auto-revive reference](https://aerospike.com/docs/database/reference/config/#auto-revive), [7.1.0.9 release notes](https://aerospike.com/docs/database/release/7-1-0-9/)

Similarly, a relaxed read mode that exposes stale data is not proof that the partition is safe for normal business operations. Preserve the application's intended consistency contract during diagnosis.

## Validate data before restoring normal service

After the approved revive and recluster, recheck unavailable and dead partitions, membership, migrations, and client errors. If restoration is needed, complete it while ordinary writers remain blocked. Reconcile representative records and business invariants against the authoritative source, including deletions and the newest acknowledged operations.

Allow controlled verification traffic first. Confirm reads and authorized test writes behave correctly, then resume ordinary writers gradually. A zero dead-partition count establishes improved availability, not that every lost record was recovered.

For future disk work, rehearse replacement with a disposable dataset and wait for required migrations before moving to another node. The [disk replacement guidance](https://support.aerospike.com/hc/en-us/articles/49938423911963-How-to-add-replace-and-remove-disks) emphasizes restoring the replacement devices before continuing.

The examples were source-reviewed and shell syntax-checked. No disks were replaced, partitions revived, or data restored during preparation of this guide.
