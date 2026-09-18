# CloudNativePG Replica Promotion Fails: Check Quorum, WAL, and Instance Health

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CloudNativePG, PostgreSQL, Kubernetes, Failover, Troubleshooting

Description: Diagnose blocked CloudNativePG promotion by tracing instance health, WAL receivers, failover quorum, and the primary election lease.

---

A healthy-looking replica is not sufficient evidence that CloudNativePG should promote it. The operator must establish a safe candidate, coordinate the former primary, and protect committed data. A cluster that refuses promotion can therefore be enforcing the durability policy you selected.

This guide targets CloudNativePG 1.30, whose [release notes](https://cloudnative-pg.io/docs/1.30/release_notes/v1.30/) introduce a primary election Lease. Use the documentation matching your installed operator: older versions do not have identical election behavior. The examples use a cluster named `orders` in namespace `database`.

## Capture the control-plane view first

Collect evidence before restarting pods or changing replication settings:

```bash
kubectl cnpg status orders -n database
kubectl get cluster orders -n database -o yaml
kubectl describe cluster orders -n database
kubectl get pods -n database -l cnpg.io/cluster=orders -o wide
kubectl get events -n database --sort-by=.lastTimestamp
kubectl get deployment -n cnpg-system cnpg-controller-manager
kubectl logs -n cnpg-system deployment/cnpg-controller-manager --since=15m
```

Replace the operator namespace and deployment name when your installation differs. Record the current primary, target primary, cluster phase, pod readiness, node placement, and incident timestamps. Save the original manifest in your incident evidence store.

The [`cnpg status` command](https://cloudnative-pg.io/docs/1.30/kubectl-plugin/#status) combines observations taken at different times. Small LSN differences within one report are not proof of corruption. Compare repeated samples and the corresponding PostgreSQL logs.

Check whether the operator can reach each instance manager. A pod can appear ready while a NetworkPolicy, certificate problem, or control-plane network failure prevents the operator from retrieving its database state. Conversely, a pod in `Running` can still have a failed readiness probe or a restarting PostgreSQL container.

## Identify the stage that is waiting

CloudNativePG's [failover procedure](https://cloudnative-pg.io/docs/1.30/failover/) first changes the target primary to `pending` and stops the old primary. It waits for WAL receivers to stop before choosing a candidate. Promotion also depends on obtaining the primary Lease in 1.30.

Inspect that Lease without modifying it:

```bash
kubectl get lease orders -n database -o yaml
kubectl get nodes
kubectl describe pod orders-2 -n database
kubectl logs orders-2 -n database -c postgres --since=15m
```

A recently renewed Lease still held by the former primary is useful evidence. Deleting it to force progress bypasses the coordination you are trying to diagnose. Find out whether the former primary is still shutting down, archiving WAL, or unreachable.

Distinguish `.spec.failoverDelay`, which delays initiating failover, from `.spec.switchoverDelay`, which limits the graceful shutdown attempt. Also include Kubernetes node failure detection in the timeline. A node becoming unreachable is not observed instantaneously by the operator.

## Check the failover quorum

If synchronous replication has `failoverQuorum: true`, inspect the generated resource:

```bash
kubectl get failoverquorum orders -n database -o yaml
kubectl get cluster orders -n database \
  -o jsonpath='{.spec.postgresql.synchronous}{"\n"}'
```

For the simple case of three instances and one required synchronous standby, losing the primary and one standby can legitimately block automatic promotion. The remaining standby might lack transactions acknowledged by the missing one. Restoring communication with a missing candidate can resolve this without relaxing durability.

Do not edit `FailoverQuorum` directly. Review any legacy `alpha.cnpg.io/failoverQuorum` annotation too, because it overrides the corresponding specification setting. Quorum resets during configuration transitions can also explain temporary blocking. These rules are documented under [quorum-based failover](https://cloudnative-pg.io/docs/1.30/failover/#failover-quorum-quorum-based-failover).

## Inspect received and replayed WAL

On each reachable standby, use an authorized local PostgreSQL connection:

```bash
kubectl exec -n database orders-2 -c postgres -- \
  psql -U postgres -d postgres -c \
  'SELECT pg_is_in_recovery(), pg_last_wal_receive_lsn(),
          pg_last_wal_replay_lsn(), pg_is_wal_replay_paused();'
```

Run the same query against the other standby. A paused replay process, missing archive segment, full disk, or unhealthy storage can prevent catch-up. A null receive LSN alone is not conclusive: archive recovery and streaming recovery expose different evidence. Check the logs and, when streaming is active, `pg_stat_wal_receiver`.

PostgreSQL documents these [recovery functions](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-RECOVERY-CONTROL). LSN comparisons need timeline context; numeric positions from divergent histories are not a safe election algorithm.

## Restore the missing prerequisite

Resolve the demonstrated fault: restore operator-to-instance connectivity, recover a missing replica, fix storage capacity, repair archive access, or allow shutdown to finish. Keep primary isolation protection enabled; an election Lease does not by itself stop an isolated old primary from accepting writes.

Manual `kubectl cnpg promote` can override failed quorum checks. Treat it as a recovery decision requiring an explicit assessment of possible lost commits and assurance that the old writer cannot serve traffic. It is not a routine way to clear a stuck status.

After promotion, verify one writable primary, healthy replicas, the `orders-rw` Service endpoints, and a real application transaction. Retain the timeline showing what blocked promotion and what resolved it. That evidence turns the incident into a testable availability or durability improvement.
