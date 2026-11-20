# Restart Aerospike Safely with Quiesce and Partition Checks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Aerospike, Database, High Availability, DevOps

Description: Plan an Aerospike rolling restart with explicit handoff checks, stable roster membership, startup verification, and clear stop conditions.

A rolling restart is more than restarting nodes one after another. Before stopping a node, you need evidence that its traffic has moved. Before touching the next node, you need evidence that the first returned correctly and that the cluster can safely continue.

This tutorial describes a **single-node-at-a-time daemon restart** for an **Aerospike Enterprise 8.2** cluster, using command syntax checked against **asadm 5.2.0**. Assume replication factor at least two, healthy replicas, verified backups, and enough capacity for the remaining nodes to carry the workload. Host reboots, disk replacement, and container replacement need additional recovery planning.

The roster and the traffic handoff have different roles. In strong-consistency mode, the roster records intended cluster membership. If the same node returns after planned maintenance, the roster normally stays unchanged. Quiescing moves partition responsibility before the node stops. [Strong-consistency maintenance guidance](https://aerospike.com/docs/database/manage/cluster/consistency/)

## Prepare a per-node maintenance record

Write down the exact target address, node ID, expected cluster size, namespaces, consistency modes, and restart type. Confirm the installed and intended versions if the restart includes an upgrade; this procedure does not establish whether an arbitrary version jump is supported.

Record baseline client error rates, latency, stop-writes state, and available capacity. For a mixed cluster, examine every namespace. A successful check for the busiest namespace does not establish safety for the others.

Decide in advance what makes you stop: an unexpected missing node, unavailable partition, failed startup, unresolved handoff, or a significant application regression. Keep the current node as the only maintenance target until those questions are resolved.

```mermaid
flowchart LR
    A[Verify healthy baseline] --> B[Quiesce one node]
    B --> C[Recluster and verify handoff]
    C --> D[Stop and start daemon]
    D --> E[Verify identity and partitions]
    E --> F[Observe application health]
    F --> G[Choose next node]
```

## Inspect membership and partitions first

Connect to a known cluster seed using your normal authentication and TLS configuration. Replace the example address. The shell command starts an interactive administrative session:

```bash
asadm -h 10.20.0.11 -p 3000
```

Inside asadm, run these read-only commands:

```text
info network
show roster
show pmap
show stop-writes
show latencies
```

`info network` establishes observed membership. `show roster` exposes current and pending membership for strong-consistency namespaces. `show pmap` summarizes partition availability. Preserve the output and check that no unrelated pending roster change is waiting to be applied: the upcoming recluster can activate pending changes. The commands are documented in the [asadm live-mode reference](https://aerospike.com/docs/database/tools/asadm/live-mode/).

If the baseline already contains unavailable or dead partitions, do not start routine restart work. Resolve the existing incident first. Likewise, an unexpected pending roster is a coordination issue, not something to overwrite with the currently observed nodes.

## Plan migration delay and restart persistence

A short maintenance absence can cause unnecessary full copies to be sent to temporary replacement replicas. `migrate-fill-delay` delays these fill migrations. Choose it from the expected duration of one node's maintenance, and persist the intended setting in deployment configuration so restarting the node does not silently reset it. In strong-consistency namespaces, this delay applies to non-roster replicas; roster-replica migrations still proceed. [Delay migrations guide](https://aerospike.com/docs/database/manage/cluster/delay-migrations/)

Do not use an arbitrary long delay to hide a node that cannot return. If the maintenance window overruns, reassess the remaining redundancy and delayed work.

For a daemon-only restart, shared-memory indexes can survive and allow a warm restart. A host reboot removes shared memory. Aerospike's Shared-Memory Tool, ASMT, supports a separate backup/restore procedure for those indexes. Database 8.2 also introduces index checkpointing as a preview feature with its own requirements. These paths need rehearsal; a data backup and an index-preservation procedure serve different purposes. [ASMT documentation](https://aerospike.com/docs/database/tools/asmt/), [checkpoint configuration](https://aerospike.com/docs/database/reference/config/#index-checkpoint-path)

## Request quiesce, then verify its effect

Choose the target from the baseline inventory. In this example, `10.20.0.12:3000` is the one node being maintained. The following commands change cluster state and require appropriate administrative privileges. Run them interactively, one step at a time:

```text
enable
manage quiesce with 10.20.0.12:3000
manage recluster
show statistics like quiesce
```

Quiesce moves the node to the end of partition succession lists during rebalance. Master ownership can move to another node with a matching full partition version. The node is still a cluster participant; quiesce is not a process stop or a network firewall rule. [Quiesce semantics](https://aerospike.com/docs/database/manage/cluster/quiesce-node/)

Confirm `pending_quiesce` and then `effective_is_quiesced` for the intended target. With only this node quiesced, `nodes_quiesced` should reflect that single target. An `ok` response to the request is not proof that the handoff finished.

Run `show latencies` and inspect proxy activity over successive samples. Target-node operation rates should drain; `client_proxy_*` and `batch_sub_proxy_*` counters should stop increasing on that node, with `from_proxy_*` activity draining on the remaining nodes. Compare changes, not whether lifetime counters equal zero. The official [handoff verification procedure](https://aerospike.com/docs/database/manage/cluster/consistency/#upgrading-aerospike-asd-restart-only-no-host-reboot) describes these checks.

If traffic does not drain, investigate client routing, partition versions, and migration progress. Do not replace observation with a fixed sleep.

## Restart only the verified target

On the target's Linux host, after handoff verification, stop the daemon gracefully:

```bash
sudo systemctl stop aerospike
```

Complete the separately reviewed maintenance operation, if any, then start the same service:

```bash
sudo systemctl start aerospike
```

These are host commands, not asadm commands. Confirm the host identity before running them. The official [daemon-restart procedure](https://aerospike.com/docs/database/manage/cluster/consistency/) uses this stop/start sequence.

Do not interrupt startup because it takes longer than expected. From an administrative host, check startup status on the target with your normal secure connection options:

```bash
asinfo -h 10.20.0.12 -p 3000 -v status
```

Wait for `ok`, inspect startup logs, and verify whether the expected warm-restart path occurred. The [info reference](https://aerospike.com/docs/database/reference/info/) defines the status request. Unexpected cold-start behavior is a reason to reassess before continuing.

## Verify return before selecting the next node

Repeat the baseline commands. Confirm the expected node identity, cluster size, roster membership, zero unavailable/dead partitions, and no new stop-writes condition. Check client success and tail latency under ordinary traffic.

For a cold-started strong-consistency namespace, also inspect appeal activity, including `appeals_tx_remaining`. Appeals re-establish record replication state; they can affect read latency while progressing. [Appeal metrics](https://aerospike.com/docs/database/reference/metrics/)

The documented strong-consistency maintenance procedure does not require every migration to finish between warm restarts, but it does require the next target's handoff to complete before shutdown. A local runbook may deliberately wait longer for a stable baseline. Do not confuse that extra operational margin with a universal server requirement.

If the node remains quiesced, inspect `stay-quiesced` before trying to undo it. That static setting makes a node start quiesced and ignore undo requests. For an ordinary aborted quiesce with that setting false, the documented reversal is:

```text
manage quiesce undo with 10.20.0.12:3000
manage recluster
```

Verify the resulting state instead of assuming the reversal succeeded. The [configuration reference](https://aerospike.com/docs/database/reference/config/#stay-quiesced) and [tagged administrative implementation](https://github.com/aerospike/aerospike-admin/blob/5.2.0/lib/live_cluster/manage_controller.py) describe these behaviors.

If the node cannot return and must be replaced permanently, stop the rolling-restart procedure. Roster replacement and possible data recovery are a separate operation. Never stage the observed roster merely to remove an inconvenient warning during temporary maintenance.

The shell snippets and administrative command definitions were checked locally; no cluster was restarted. Rehearse these gates on staging with the same persistence, identity, and deployment behavior before using them in production.
