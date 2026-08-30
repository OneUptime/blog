# How to Test PostgreSQL HA Safely: Primary Crash, Network Partition, DCS Loss, and Proxy Failure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Patroni, High Availability, Failover, Network Partition, etcd, HAProxy

Description: Build a controlled PostgreSQL HA exercise that proves safety and recovery across database, network, DCS, and proxy failures.

---

A successful HA test proves more than "a replica was promoted." It must prove that no two nodes accepted writes, committed-data exposure stayed inside the stated objective, the stable endpoint recovered, applications behaved correctly, and every failed component could rejoin without improvisation.

Run destructive fault injection only in a dedicated staging cluster or a production game day with explicit approval, current backups, fencing, and rollback access outside the system under test. Never start by pulling cables from an uninstrumented production cluster.

## Define invariants and evidence first

Use the same checks for every scenario:

| Invariant | Evidence |
| --- | --- |
| At most one writable PostgreSQL node | Direct `pg_is_in_recovery()` and `transaction_read_only` query on every member |
| One Patroni leader | `patronictl list`, DCS leader key, and Patroni REST state |
| Stable endpoint routes correctly | Fresh SQL connections through HAProxy/VIP or load balancer |
| Committed operations are accounted for | Workload sequence table with durable unique operation IDs |
| Recovery is bounded | Timestamped fault, detection, promotion, route, and application recovery events |
| Rejoined node is safe | Current timeline, streaming state, lag, and read/write role |

Generate a low-rate canary workload whose transactions insert a unique operation ID and commit timestamp. Record client acknowledgements separately. After each fault, reconcile acknowledged IDs against the promoted database. This detects loss, duplication, and ambiguous commits more reliably than a dashboard screenshot.

Before every scenario, capture:

```bash
patronictl -c /etc/patroni/patroni.yml list prod-ha --extended
patronictl -c /etc/patroni/patroni.yml show-config prod-ha
etcdctl --endpoints="$ETCDCTL_ENDPOINTS" \
  endpoint status --cluster --write-out=table
```

Set the endpoint list and TLS/authentication environment through the exercise's protected etcd administration profile; do not put private keys or passwords in the runbook output.

Also save HAProxy backend state, replication positions, current timeline, and the live values of `ttl`, `loop_wait`, `retry_timeout`, `primary_start_timeout`, `maximum_lag_on_failover`, synchronous mode, watchdog mode, and DCS failsafe mode. Expected behavior changes with those settings.

## Scenario 1: crash the primary PostgreSQL process

Fault only PostgreSQL on the leader while leaving Patroni, the host, DCS, and network running. Use your service supervisor or fault-injection platform to send an ungraceful process termination in the disposable environment; do not stop Patroni itself when the purpose is a database-process crash.

Patroni may try to recover PostgreSQL locally for up to `primary_start_timeout` before allowing failover. Patroni documents worst-case detection/failover timing for a primary failure as approximately:

```text
loop_wait + primary_start_timeout + loop_wait
```

When `primary_start_timeout` is zero, the documented bound is one `loop_wait`, assuming an eligible candidate and healthy DCS. A faster failover setting can increase the chance of unnecessary promotion after a transient process failure; it also cannot eliminate application reconnect time.

Observe whether the same node restarts or another node promotes. Confirm HAProxy drops the old `/primary` backend and a fresh connection reaches exactly one writer. Reconcile canary commits, then let the old primary rejoin through Patroni rather than starting or promoting it manually.

## Scenario 2: partition the primary

Test separate network cuts rather than one vague "partition":

1. Primary loses DCS access but retains Patroni REST access to every known member.
2. Primary loses both DCS and member REST access.
3. Replicas retain DCS quorum but cannot reach the former primary.
4. A minority partition loses DCS quorum while the majority remains connected.

Use reversible, narrowly scoped security-group, firewall, or network-emulation rules managed by the test harness. Pre-stage an out-of-band cleanup command and an automatic expiry. Do not block SSH or the management plane used to undo the fault.

By default, a Patroni leader that cannot update its DCS lock demotes before the lock can expire, preventing a second writer. If dynamic `failsafe_mode` is enabled and the DCS update failed for an eligible reason, the primary may continue only when it can reach **all** members listed in the DCS failsafe key through Patroni's `POST /failsafe` path and they acknowledge it. If any known member does not respond, it demotes.

The required assertion is still one writer. Query every network side directly. A client that cannot reach one side does not prove that side is fenced.

## Scenario 3: lose DCS members

Start by stopping one member of a three-member etcd cluster. A two-member majority remains, so Patroni should retain normal leadership and no PostgreSQL role should change. Verify etcd endpoint health and leader status.

Then, only in the isolated exercise, remove a second etcd member to lose quorum. Existing etcd data is not erased, but linearizable writes such as leader-lock renewal cannot succeed. No new Patroni leader can safely be elected through that DCS.

Expected primary behavior depends on failsafe mode and Patroni-member reachability as described above. Record whether the writer demotes, stays up under failsafe, or becomes read-only/unavailable through routing. Restore the same etcd members and data; do not create a fresh DCS cluster or delete Patroni keys as a shortcut.

Distinguish a Patroni-to-etcd network failure from an etcd quorum failure. They can look identical to one member but have different cluster-wide evidence and recovery actions.

## Scenario 4: fail the proxy path

First stop HAProxy on the active proxy. If Keepalived provides the stable address, verify its tracked process causes the VIP to move to the peer. If a platform load balancer fronts the proxies, verify it removes the failed target. PostgreSQL and the Patroni leader should not change.

Next leave HAProxy running but block its access to Patroni REST port `8008`. Correct role-aware checks mark database backends down even if `5432` is reachable. This test proves the health-check path is part of service availability.

Finally fail only the current database backend. With `on-marked-down shutdown-sessions`, old streams should close after the health-check fall threshold. Without it, new sessions move but old TCP streams can remain. Record both behaviors deliberately.

## Measure application behavior

For each scenario, capture:

- time from injected fault to Patroni detection;
- time to promotion or local restart;
- time until HAProxy reports one healthy write backend;
- time until the first successful application transaction;
- number of failed, retried, duplicated, and ambiguous transactions; and
- recovery time for the failed member.

Retry only complete transactions whose semantics permit it. A lost connection around `COMMIT` has an ambiguous outcome, so the application must query a stable idempotency key rather than blindly repeat the operation.

Test long transactions, idle pooled connections, prepared statements, and read pools—not just repeated one-shot `psql` connections. Verify PgBouncer server connections no longer point at the former writer after the route changes.

## Restore and close the exercise

Remove fault rules through the pretested management path. Confirm etcd quorum first, then Patroni membership, PostgreSQL replication, proxy state, and application traffic. A former primary may require `pg_rewind` or full reinitialization; let Patroni decide according to configured policy and inspect the result.

Do not declare success until:

- exactly one primary exists on the current timeline;
- all intended replicas stream and replay within their objectives;
- all temporary firewall, scheduler, and HA tags are removed;
- DCS has the original healthy membership;
- HAProxy/VIP redundancy is restored; and
- acknowledged canary operations reconcile.

Turn measured failure times and surprises into alert thresholds and runbook changes. Repeat after Patroni, PostgreSQL, DCS, proxy, kernel, and network architecture changes.

## Official Documentation

- [Patroni dynamic configuration and failover timing](https://patroni.readthedocs.io/en/latest/dynamic_configuration.html)
- [Patroni DCS failsafe mode](https://patroni.readthedocs.io/en/latest/dcs_failsafe_mode.html)
- [Patroni watchdog support](https://patroni.readthedocs.io/en/latest/watchdog.html)
- [Patroni replication modes](https://patroni.readthedocs.io/en/latest/replication_modes.html)
- [etcd failure tolerance and quorum FAQ](https://etcd.io/docs/v3.7/faq/)
- [etcd monitoring guide](https://etcd.io/docs/v3.7/op-guide/monitoring/)
- [HAProxy health checks](https://www.haproxy.com/documentation/haproxy-configuration-tutorials/reliability/health-checks/)
- [PostgreSQL warm standby and failover](https://www.postgresql.org/docs/current/warm-standby-failover.html)

## Conclusion

Test one failure boundary at a time, always asserting one writer and reconciling acknowledged transactions. A primary crash, network partition, DCS quorum loss, and proxy failure exercise different safety mechanisms. Capture the settings and evidence that explain each result, restore through the normal control plane, and make the measured recovery behavior part of the production contract.
