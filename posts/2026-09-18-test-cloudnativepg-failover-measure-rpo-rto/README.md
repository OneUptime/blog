# How to Test PostgreSQL Operator Failover and Measure RPO and RTO Before Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CloudNativePG, PostgreSQL, Kubernetes, Failover, RPO, RTO, Testing

Description: Build a repeatable CloudNativePG failover exercise that measures acknowledged data loss and application recovery rather than pod readiness alone.

---

A successful promotion demonstrates one part of high availability. It does not establish how many acknowledged writes survived, whether clients found the new primary, or how long users waited. Measure those outcomes explicitly before accepting a PostgreSQL deployment for production.

This exercise targets CloudNativePG 1.30 and a disposable environment that resembles production: instance count, zone placement, storage, synchronous policy, backup plugin, PgBouncer, network policies, and application connection settings. Record all versions. Results from a small single-zone lab do not establish recovery behavior for a multi-zone production deployment.

## Define measurable acceptance criteria

Use an application observer outside the failure domain. It must continue recording events even if a database pod or node disappears.

Define the recovery time objective as the allowed interval from a specified failure event to sustained successful application transactions. Record both the injected-failure timestamp and the first observed application error, because they answer different questions.

For recovery point measurements, compare externally recorded successful commits with rows on the recovered writer. A useful report includes missing acknowledged operation IDs, their acknowledgment timestamps, and the longest lost interval. Missing sequence numbers alone are not evidence of lost commits: PostgreSQL sequences can have gaps after aborted transactions.

Write an acceptance statement such as: every acknowledged operation survives the single-node failure, and ten consecutive application writes finish within their normal deadline within sixty seconds. Those numbers are examples; use your service's agreed objectives.

## Create an identifiable workload

Use a dedicated table in the disposable application database:

```sql
CREATE TABLE failover_probe (
    operation_id uuid PRIMARY KEY,
    submitted_at timestamptz NOT NULL,
    payload text NOT NULL
);
```

Generate `operation_id` in the client, submit a transaction, and append the ID to an external durable ledger only after the driver reports successful commit. Record request start, acknowledgment time, attempt number, and errors. Keep credentials out of that ledger.

Model the client loop as:

```text
generate operation ID
record attempt start outside the database
insert using operation ID and commit
if commit acknowledgment arrives:
    record ACK and elapsed time outside the database
if connection fails during commit:
    record UNKNOWN and reconnect
    look up operation ID before deciding to retry
```

Use parameterized SQL. A unique key makes duplicate insertion detectable, but the real application's transaction must be designed for safe retries too. A read-modify-write operation with external side effects needs more than `ON CONFLICT DO NOTHING`.

## Capture the baseline

Record cluster state before each exercise:

```bash
kubectl cnpg status orders -n database
kubectl get cluster orders -n database -o yaml
kubectl get pods -n database -l cnpg.io/cluster=orders -o wide
kubectl get endpointslices -n database \
  -l kubernetes.io/service-name=orders-rw -o yaml
```

Include current primary, standby health, replication policy, archived WAL status, and steady-state application latency. Use PostgreSQL's [replication statistics](https://www.postgresql.org/docs/current/monitoring-stats.html#MONITORING-PG-STAT-REPLICATION-VIEW) to characterize the replicas. Low replay lag at baseline is useful context, not proof of zero loss under every partition.

## Exercise distinct failure modes

Begin with a planned promotion of a healthy replica:

```bash
kubectl cnpg promote orders orders-2 -n database
```

That rehearses operator orchestration and routing. It is not equivalent to losing a node.

In the disposable environment, identify the current primary again and deliberately delete only that pod. For example, if it is `orders-1`:

```bash
kubectl delete pod orders-1 -n database
```

Ordinary deletion allows graceful termination, so document it as a pod deletion test. Use your infrastructure's controlled node shutdown or fault-injection procedure for a separate abrupt node-loss test. Rehearse network partitions separately and preserve access to the observer and management plane. Do not use broad production NetworkPolicy changes as an improvised experiment.

CloudNativePG's [failure modes](https://cloudnative-pg.io/docs/1.30/failure_modes/) and [automated failover](https://cloudnative-pg.io/docs/1.30/failover/) explain why Kubernetes failure detection, shutdown, WAL state, quorum, and the 1.30 primary Lease affect timing. If quorum intentionally blocks promotion, record the unavailable interval and the preserved durability policy. Bypassing it changes the experiment.

## Reconcile data and time

After recovery, export the recovered operation IDs:

```sql
SELECT operation_id, submitted_at
FROM failover_probe
ORDER BY submitted_at, operation_id;
```

Compare sets, not just counts. All IDs in the external ACK set must appear in the recovered table for the tested zero-loss criterion. Classify UNKNOWN commits separately: they may have committed without an acknowledgment reaching the client.

Break the timeline into failure injection, detection, new primary readiness, write Service convergence, first successful client transaction, and sustained recovery. A database may be writable before a client-side pool recovers, which belongs in the application RTO.

Repeat under representative load and with a lagging replica. Restore full replica health between trials. Include loss of the primary plus another replica when your threat model requires it; synchronous acknowledgment alone does not guarantee a safe remaining candidate.

## Turn results into an operational decision

Store the manifest, application ledger, logs, timestamps, and observed losses together. Report the failure mode and durability configuration beside each result, rather than a single unexplained RTO number.

Finally, run a separate backup restore exercise. Failover within a cluster and recovery after losing its storage are different procedures. CloudNativePG's [backup guidance](https://cloudnative-pg.io/docs/1.30/backup/) treats recoverability as a separate responsibility, and a passing promotion test cannot replace it.
