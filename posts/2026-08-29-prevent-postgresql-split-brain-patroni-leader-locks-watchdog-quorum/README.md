# Preventing PostgreSQL Split Brain with Patroni

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Patroni, High Availability, Split Brain, Watchdog, Fencing, Quorum, etcd

Description: Layer Patroni leader locks, an odd etcd quorum, and watchdog fencing so an old PostgreSQL primary cannot outlive its authority to accept writes.

---

PostgreSQL split brain occurs when more than one server accepts writes for the same cluster on diverging timelines. Streaming replication alone cannot prevent it: a disconnected primary does not know whether it is isolated or whether every other node is down.

Patroni prevents split brain by combining three independent controls:

1. **Consensus:** an odd-sized distributed configuration store such as etcd grants one leader lock.
2. **Role enforcement:** normally, only the Patroni member that owns that lock may run PostgreSQL as the primary; loss of the ability to renew it triggers demotion. If renewal fails because the DCS is unavailable rather than because of a leader-key version, value, or index mismatch, optional DCS failsafe mode may let the current primary continue only while every known member acknowledges it.
3. **Fencing:** a watchdog resets a host if Patroni cannot run the demotion path before its authority expires.

Each control closes a different failure. None makes manual promotion of an unfenced node safe.

## Understand the normal leader-lock cycle

The Patroni leader writes and periodically renews a TTL-backed leader key in the DCS. Other members observe that key and remain replicas. If the key expires, eligible replicas participate in a leader race; etcd's atomic create-if-absent transaction and Raft quorum allow one winner to create the new leader key.

Three Patroni timing values govern the normal loop:

```yaml
ttl: 30
loop_wait: 10
retry_timeout: 5
```

- `loop_wait` is the sleep between HA loop iterations.
- `retry_timeout` bounds retries of DCS and PostgreSQL operations.
- `ttl` is the leader-lock lifetime and approximates the delay before automatic failover can begin.

Patroni enforces:

```text
loop_wait + 2 * retry_timeout <= ttl
```

Do not tune these values solely for a fast demonstration. Short TTLs amplify storage pauses and network jitter; long TTLs delay real failure detection. Measure the tail latency of DCS requests under load.

## Build a real DCS quorum

For three etcd members, two votes form quorum and one member may fail. Place the members across independent host, power, storage, and network failure domains. A two-member etcd cluster requires both votes and tolerates no failure. Configuring only one initial etcd endpoint can make startup or topology rediscovery depend on that member; by default, after discovery Patroni can use the other members. A single proxy instance in front of healthy members remains a single access failure.

Give Patroni every etcd endpoint:

```yaml
etcd3:
  hosts:
    - 10.50.1.11:2379
    - 10.50.2.11:2379
    - 10.50.3.11:2379
  protocol: https
  cacert: /etc/patroni/tls/etcd-ca.pem
  cert: /etc/patroni/tls/patroni-client.pem
  key: /etc/patroni/tls/patroni-client-key.pem
```

etcd quorum prevents two partitions from both changing the same leader key. It does not forcibly stop a PostgreSQL process that was primary before its host froze. That is the fencing layer's job.

## Why Patroni's demotion path is not enough

When Patroni cannot update the leader lock, it normally stops or demotes PostgreSQL before the lock expires. If optional DCS failsafe mode is enabled, the update failed because the DCS was unavailable rather than because of a leader-key version, value, or index mismatch, and every known member acknowledges the current primary through the Patroni REST API, the current primary may continue instead. But the same fault that interrupts DCS access can prevent the normal demotion code from running:

- Patroni is killed or runs out of memory.
- The host or virtual machine is paused.
- CPU starvation prevents the HA loop from being scheduled.
- PostgreSQL shutdown hangs.
- The kernel or userspace is partially unresponsive.

If failsafe agreement is not being maintained, another member can legitimately promote after the old lock expires. If the old PostgreSQL process still accepts writes when its host resumes, two primaries exist. A watchdog provides a deadline outside the Patroni process.

## Configure watchdog fencing on every candidate

Patroni supports the Linux watchdog device interface. A hardware watchdog can reset a host even when software is badly stuck; the kernel `softdog` module is useful for integration testing but cannot recover every kernel or hardware failure.

First inspect the device nodes and access bits. Run `wdctl` only during a controlled watchdog test: it may open the device when sysfs cannot supply all fields, and opening a watchdog can arm it.

```bash
ls -l /dev/watchdog /dev/watchdog0
wdctl /dev/watchdog
```

Configure each Patroni member locally:

```yaml
watchdog:
  mode: required
  device: /dev/watchdog
  safety_margin: 5
```

The modes have materially different guarantees:

| Mode | Behavior |
| --- | --- |
| `off` | Patroni does not use a watchdog |
| `automatic` | Patroni uses it when available but can promote without it |
| `required` | A node refuses to become leader if the watchdog cannot be activated |

Use `required` only after proving the device works on every failover candidate. Patroni arms the watchdog before promotion, refreshes it after confirmed leader-lock updates or successful DCS-failsafe checks, and disables it after demotion or while the cluster is paused.

During normal operation with successful DCS leader-lock updates, with `ttl=30` and the default `safety_margin=5`, Patroni sets the watchdog to expire five seconds before the leader lock. Given `loop_wait=10`, the HA loop has at least `ttl - safety_margin - loop_wait = 15` seconds to finish before reset. If DCS retries consume `retry_timeout=5`, at least ten seconds remain for terminating client access:

```text
ttl - safety_margin - loop_wait - retry_timeout
30  - 5             - 10        - 5             = 10 seconds
```

There is a narrow suspension window with a fixed margin: if the Patroni process is suspended after a successful leader-lock update but before the following watchdog keepalive, that keepalive can be delayed by more than `safety_margin`, allowing the watchdog to expire after the DCS lock. Patroni's documented strongest setting is:

```yaml
watchdog:
  mode: required
  device: /dev/watchdog
  safety_margin: -1
```

`safety_margin: -1` makes the watchdog timeout `ttl // 2`. This provides the strict timing guarantee but leaves less time for the HA loop and PostgreSQL shutdown. Increase `ttl` and/or reduce measured-safe `loop_wait` and `retry_timeout` so the resulting budget is practical. Test host reset behavior before production.

## Configure cluster-wide safety settings

Set dynamic values through `patronictl edit-config`, not only in local YAML after bootstrap:

```yaml
ttl: 30
loop_wait: 10
retry_timeout: 5
maximum_lag_on_failover: 67108864
check_timeline: true
postgresql:
  use_pg_rewind: true
```

Apply a reviewed file:

```bash
patronictl -c /etc/patroni/patroni.yml edit-config prod-ha \
  --apply /tmp/patroni-dynamic.yml --force
```

`maximum_lag_on_failover` bounds how far behind a replica may be for automatic failover; it limits potential data loss but does not guarantee zero loss with asynchronous replication. `check_timeline` rejects older-timeline candidates during automatic failover and a switchover in a healthy cluster. A manual failover without a leader can bypass the timeline, lag, and synchronous-membership checks.

Enable `postgresql.use_pg_rewind` before a failure and initialize clusters with data checksums or keep `wal_log_hints=on`; `full_page_writes` must remain on. These settings help a fenced former primary rejoin the new timeline, but do not prevent split brain themselves.

## Do not confuse two kinds of quorum

Patroni can also manage PostgreSQL synchronous replication:

```yaml
synchronous_mode: quorum
synchronous_node_count: 1
synchronous_mode_strict: true
```

This is **commit durability quorum**, not DCS leader-election quorum:

- etcd quorum decides who may own the Patroni leader lock.
- Patroni synchronous mode restricts automatic promotion candidates and configures `synchronous_standby_names`. When that setting is nonempty, with `synchronous_commit=on` (the default) or `remote_apply`, successful commits have been flushed to the required number of selected standbys. A manual failover can still promote an asynchronous node and lose data.
- `synchronous_mode_strict: true` keeps synchronous replication configured if no eligible synchronous standby exists, so commits that require a standby acknowledgment block until one returns. Transactions using `synchronous_commit=off` or `local` do not wait and may be lost on failover.

Choose `synchronous_mode: on` or `quorum` according to Patroni's replication-mode semantics and the number of replicas. Do not enable it without testing latency and failure behavior. It reduces transaction loss risk but still needs DCS consensus and fencing to prevent two writable primaries.

## Route writes only to the lock holder

HAProxy or another load balancer should query Patroni's role endpoint, not just PostgreSQL's TCP port:

```haproxy
backend patroni_primary
    mode tcp
    option httpchk
    http-check connect port 8008
    http-check send meth GET uri /primary ver HTTP/1.1 hdr Host patroni
    http-check expect status 200
    default-server inter 2s fall 3 rise 2
    server pg1 10.40.0.11:5432 check
    server pg2 10.40.0.12:5432 check
    server pg3 10.40.0.13:5432 check
```

`/primary` returns `200` only when PostgreSQL is primary and that Patroni member holds the leader lock. `/health` merely says PostgreSQL is running and is unsafe as a write selector.

Routing is not fencing. A client with a saved direct database address can bypass HAProxy, so restrict direct PostgreSQL access to approved proxies, administrators, and replication paths.

## Verify the safety invariants

Check DCS quorum health first:

```bash
etcdctl \
  --endpoints=https://10.50.1.11:2379,https://10.50.2.11:2379,https://10.50.3.11:2379 \
  --cacert=/etc/etcd/tls/ca.pem \
  --cert=/etc/etcd/tls/admin.pem \
  --key=/etc/etcd/tls/admin-key.pem \
  endpoint health --cluster
```

Then check Patroni and PostgreSQL:

```bash
patronictl -c /etc/patroni/patroni.yml list prod-ha

for host in 10.40.0.11 10.40.0.12 10.40.0.13; do
  printf '%s leader=' "$host"
  curl --silent --output /dev/null --write-out '%{http_code}' "http://${host}:8008/leader"
  printf ' primary='
  curl --silent --output /dev/null --write-out '%{http_code}\n' "http://${host}:8008/primary"
done
```

Exactly one normal cluster member should return `200` for both `/leader` and `/primary`. On every PostgreSQL server:

```sql
SELECT pg_is_in_recovery(), current_setting('transaction_read_only');
```

A normally writable primary reports `false` and `off`; hot-standby replicas report `true` and `on`.

Confirm Patroni logs state that the watchdog was activated on the leader. Monitor watchdog availability on replicas too-a device discovered only during an incident is too late.

## Test failures without inventing split brain

In staging, test one fault at a time:

1. Stop the primary cleanly through Patroni and verify a replica promotes.
2. With `failsafe_mode` disabled, remove primary access to etcd but leave the host schedulable; verify Patroni demotes before lock expiry.
3. Suspend the Patroni process/host in a controlled watchdog test and verify the watchdog resets it before another primary is exposed.
4. Lose one of three etcd members and verify quorum plus the current primary remain available.
5. Partition the old primary from both DCS and peers; verify it is fenced before allowing promotion elsewhere.

Never test the watchdog for the first time on a production primary. A functioning watchdog intentionally reboots the system.

## Failure modes and safe recovery

| Observation | Safety interpretation | Response |
| --- | --- | --- |
| DCS quorum lost and no successful failsafe check | The primary must relinquish writes or be watchdog-fenced | Restore quorum; do not bypass the lock |
| Required watchdog unavailable on a replica | Replica is ineligible for promotion | Repair device/permissions before relying on it |
| Old primary comes back on an earlier timeline | It is behind or has divergent WAL; the timeline ID alone does not distinguish them | Keep fenced; let Patroni rejoin it, using `pg_rewind` if histories diverged or a fresh base backup if needed |
| Two `/primary` endpoints return `200` | Critical invariant violation or separate DCS scopes | Remove client traffic, fence at least the stale node, and preserve evidence |
| `/leader` is `200` but `/primary` is `503` | Lock holder is not currently a normal running primary | Inspect Patroni/PostgreSQL; do not force HAProxy to accept it |
| Synchronous commits block | A required standby acknowledgment is absent | Restore a synchronous standby or make an explicit durability trade-off |

Before any manual failover when the leader state is uncertain, fence the old primary with an independent mechanism such as power control, storage revocation, or a network isolation that also blocks all client paths. Only then choose the most advanced eligible replica.

There is no “merge” after split brain. Identify the authoritative timeline, preserve divergent data for forensic/business reconciliation, and rebuild the losing node. `pg_rewind` makes its physical data match the source timeline; it intentionally discards changes unique to the target timeline.

## Rollback changes carefully

If watchdog integration causes false resets, do not disable it across the cluster at once. Repair a replica, verify it can arm the device, and move leadership through a planned switchover before changing the former primary. Edit local watchdog configuration and reload/restart Patroni according to the service runbook one member at a time.

If synchronous mode is too restrictive, change dynamic configuration only after documenting the new data-loss objective. Turning off synchronous replication may restore write availability but weakens acknowledged-transaction durability; it does not remove the need for leader locks or watchdog fencing.

## References

- [Patroni watchdog support](https://patroni.readthedocs.io/en/latest/watchdog.html)
- [Patroni dynamic configuration settings](https://patroni.readthedocs.io/en/latest/dynamic_configuration.html)
- [Patroni replication modes](https://patroni.readthedocs.io/en/latest/replication_modes.html)
- [Patroni DCS failsafe mode](https://patroni.readthedocs.io/en/latest/dcs_failsafe_mode.html)
- [Patroni REST API](https://patroni.readthedocs.io/en/latest/rest_api.html)
- [etcd FAQ: quorum and failure tolerance](https://etcd.io/docs/v3.7/faq/)
- [PostgreSQL warm standby and failover](https://www.postgresql.org/docs/current/warm-standby-failover.html)
