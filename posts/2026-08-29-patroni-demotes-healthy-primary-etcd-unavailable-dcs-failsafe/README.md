# Why Does Patroni Demote a Healthy Primary When etcd Is Unavailable? Configuring DCS Failsafe Mode

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Patroni, etcd, High Availability, Failover, Split Brain, Quorum

Description: Understand Patroni's safety demotion on DCS loss and configure DCS failsafe mode without weakening split-brain protection.

---

A PostgreSQL primary can answer queries perfectly while Patroni decides to demote it. That behavior is intentional: database health alone cannot prove that the node is still the only primary.

Patroni permits a normal PostgreSQL node to remain primary only while it can renew the cluster's leader lock in the distributed configuration store (DCS). If etcd becomes unreachable, the node cannot tell whether etcd is down everywhere or whether it alone is isolated while another partition still has quorum. In the second case, another Patroni member could acquire the expired lock and promote. Demoting the old primary before lock expiry prevents two writable timelines.

DCS failsafe mode offers a bounded alternative. It lets the existing primary continue during certain DCS failures only when it can contact every other member in the last valid failsafe topology and each returns `Accepted`, agreeing that the primary may continue.

## Separate database health from leadership authority

These observations answer different questions:

```bash
# Is PostgreSQL up and running on this host?
curl --include http://10.40.0.11:8008/health

# Is this node primary and does Patroni currently consider it the leader?
curl --include http://10.40.0.11:8008/primary

# What does the current DCS-backed cluster view show?
patronictl -c /etc/patroni/patroni.yml list prod-ha
```

`/health` returns `200` when PostgreSQL is up, regardless of role. `/primary` returns `200` when PostgreSQL is primary and Patroni currently considers the local member the leader. Normally that corresponds to a live DCS leader lock; during active DCS failsafe mode, Patroni refreshes its local leadership status after successful all-member checks even though it cannot confirm the lock in the DCS. A node can therefore be database-healthy but deliberately read-only after DCS loss.

Patroni's `retry_timeout` absorbs short DCS or network disturbances. With the default dynamic values, problems shorter than ten seconds normally do not cause demotion:

```yaml
loop_wait: 10
retry_timeout: 10
ttl: 30
```

These values must always satisfy:

```text
loop_wait + 2 * retry_timeout <= ttl
```

Increasing `ttl` may reduce sensitivity to transient outages but also delays legitimate failover and lengthens the period for which stale leadership could exist. It is not a substitute for fixing etcd.

## How DCS failsafe mode stays conservative

When failsafe mode is enabled, the current leader maintains a permanent `/failsafe` key in the cluster's DCS namespace. The value contains every known Patroni member and its REST API address.

If renewing the leader lock fails for a reason other than a compare/version/value mismatch:

1. The existing primary uses its last known failsafe topology.
2. It sends `POST /failsafe` to every other member in that topology.
3. A reachable member rejects the request if its own PostgreSQL is already running as primary. Otherwise it returns `Accepted` and caches the caller-supplied leader information for `ttl` seconds.
4. The primary may remain writable only if every other listed member returns `Accepted`.
5. If any other member does not respond or rejects the request, the primary demotes.

The requirement is **all members recorded in the failsafe topology**, not a Patroni-node majority. DCS voters and Patroni database members may be placed in different failure domains; a majority calculation from the primary's limited network view could authorize the losing side of a partition. Requiring every recorded member closes that ambiguity.

Failsafe mode does not activate when the leader-lock update fails because its stored version/value no longer matches. That conflict is evidence that leadership state changed, so continuing would be unsafe.

## Prerequisites before enabling it

Meet these conditions first:

- Upgrade every cluster member to a current, mutually supported Patroni release. Patroni's documentation explicitly requires all members to be up to date before enabling failsafe mode.
- Ensure every Patroni REST `connect_address` is stable and reachable from every other member on port `8008` (or the configured port).
- Secure REST traffic with network allowlists and TLS where required. Keep peer authentication configuration consistent.
- Remove decommissioned members cleanly and wait for the leader to update the failsafe topology.
- Restore a healthy etcd quorum. `failsafe_mode` is dynamic configuration stored in the DCS; enable and verify it before an outage, not during one.
- Monitor the Patroni HA loop, REST reachability, DCS latency, and the current membership list.

Check all-to-all REST reachability from every database node. A safe GET such as `/patroni` is useful for this preflight:

```bash
for host in 10.40.0.11 10.40.0.12 10.40.0.13; do
  curl --fail --silent --show-error --connect-timeout 1 --max-time 2 \
    "http://${host}:8008/patroni" >/dev/null
done
```

This GET only proves basic reachability and latency. Patroni's real failsafe exchange uses `POST /failsafe` under a short internal request deadline, so GET success does not prove that Basic authentication, unsafe-method allowlists, mutual TLS, or the POST path works. Do not probe `POST /failsafe` manually: it is a Patroni-to-Patroni coordination endpoint, not an operator switch. The isolated DCS-outage exercise below is the safe way to invoke the real path; require leader logs to show a timely acknowledgement from every member.

## Enable failsafe mode as dynamic configuration

Use `patronictl` while etcd is healthy:

```bash
patronictl -c /etc/patroni/patroni.yml edit-config prod-ha \
  --set failsafe_mode=true --force

patronictl -c /etc/patroni/patroni.yml show-config prod-ha
```

The output should contain:

```yaml
failsafe_mode: true
```

Alternatively, use the authenticated Patroni configuration API against the current leader:

```bash
curl --request PATCH \
  --user patroni_api \
  --header 'Content-Type: application/json' \
  --data '{"failsafe_mode":true}' \
  http://10.40.0.11:8008/config
```

With a username but no colon/password on the command line, curl prompts for the password; automation should read it from a protected configuration or secret source. Use TLS, REST authentication, and an allowlist in production. Do not add `failsafe_mode` only to the local top-level YAML or an already-consumed `bootstrap.dcs` block; the effective setting must be in global dynamic configuration.

After enabling it, review Patroni logs on all nodes and confirm ordinary leader-lock renewal remains healthy. Failsafe mode should be an emergency branch, not the normal operating state.

## Validate in an isolated failure exercise

Use a staging cluster that mirrors production networking. Record the current leader, membership, and endpoint behavior:

```bash
patronictl -c /etc/patroni/patroni.yml list prod-ha

for host in 10.40.0.11 10.40.0.12 10.40.0.13; do
  curl --silent "http://${host}:8008/patroni" | jq '{role,state,patroni}'
done
```

Then simulate these cases separately:

### DCS unavailable, every Patroni member mutually reachable

Block only Patroni-to-etcd client traffic while keeping Patroni REST traffic intact. The existing primary should log entry into DCS failsafe behavior and may remain primary. Replicas must not begin a leader race. `/primary` on the existing leader should remain the only eligible write check.

Confirm the logs identify successful `POST /failsafe` acknowledgements from every member. A passing manual GET is not sufficient evidence for this test.

### DCS unavailable and one Patroni member unreachable

While the DCS path is still unavailable, isolate one replica's Patroni REST address. On its next failsafe checks, the primary can no longer receive every acknowledgement and must demote. This is the expected safe result.

### Primary isolated while replicas retain DCS quorum

Isolate the primary from etcd but leave replica-to-etcd and all Patroni REST paths as designed. The primary contacts replicas through failsafe; their recent failsafe messages tell them that the existing primary is alive, so they do not race for the expired lock. If the primary cannot contact all of them, it demotes instead.

For each case, prove database state with SQL rather than relying only on process status:

```sql
SELECT pg_is_in_recovery(),
       current_setting('transaction_read_only'),
       pg_current_wal_lsn();
```

`pg_current_wal_lsn()` cannot be executed during recovery, and it does not prove that the node holds Patroni's leader lock. Run `pg_is_in_recovery()` and the read-only check separately on replicas.

## Know what failsafe mode does not solve

DCS failsafe mode is not:

- An etcd replacement. Patroni cannot make normal membership/configuration changes or complete arbitrary leader elections indefinitely without the DCS.
- Permission to operate when a member's Patroni REST API is unreachable or rejects the request. One missing or rejected acknowledgement forces demotion.
- A way to keep writes available after the current primary itself fails. With DCS down, replicas cannot safely establish new leadership.
- Protection from a manually promoted PostgreSQL server outside Patroni.
- A substitute for watchdog fencing. A suspended Patroni process or paused VM may not execute its demotion path; a watchdog provides an independent reset deadline.
- Evidence that HAProxy should use `/health` for writes. Continue checking `/primary` or `/read-write`.

During a DCS outage, membership is effectively frozen to the failsafe topology. A newly created replica not present in `/failsafe` cannot become leader. A terminated member still matters to the primary's every-cycle reachability test, and its absence causes demotion.

## Diagnose unexpected demotion

Collect evidence before changing timeouts:

1. Inspect Patroni logs around the last successful leader-lock update and look for DCS timeouts, compare failures, or failed `POST /failsafe` acknowledgements.
2. Check each etcd endpoint directly with `etcdctl endpoint health --cluster` and `endpoint status --cluster --write-out=table`.
3. Check every REST `connect_address` from the former primary, including network policy, peer Basic-auth credentials, and any required client-certificate handshake.
4. Compare `patronictl show-config` with local YAML. Confirm `failsafe_mode: true` is effective dynamic configuration.
5. Look for a stale or newly added Patroni member in `patronictl list` and the DCS membership keys.
6. Confirm the failure was not a genuine leader-key conflict. Failsafe correctly refuses to override one.

Common causes include a REST firewall that allowed HAProxy but not node-to-node requests, inconsistent peer Basic-auth credentials, a missing, expired, or untrusted client certificate configured through `ctl.certfile` when REST client-certificate validation is required, DNS used by `connect_address` becoming unavailable with etcd, or a decommissioned member still present when the outage began.

## Rollback and incident recovery

Disable failsafe mode only while DCS quorum is healthy:

```bash
patronictl -c /etc/patroni/patroni.yml edit-config prod-ha \
  --set failsafe_mode=false --force
```

Verify the global DCS value through `/config` or `show-config`. To confirm that every Patroni process has consumed the change, query `/metrics` on each member and check that `patroni_failsafe_mode_enabled` is `0`. Disabling it restores the normal rule: failure to renew the leader lock causes primary demotion before the lock can expire.

If the cluster is already in a DCS outage, do not attempt to “roll back” by editing three local files—the effective configuration is stored in the unavailable DCS. Restore etcd quorum and network reachability. If all nodes are replicas afterward, let Patroni perform a normal election once DCS is consistent.

Before any forced manual promotion, positively fence the former primary at the power, storage, or network layer and determine the most advanced safe replica. A manual disaster-recovery promotion is a separate decision that may lose transactions; failsafe mode does not make that shortcut safe.

## References

- [Patroni DCS failsafe mode](https://patroni.readthedocs.io/en/latest/dcs_failsafe_mode.html)
- [Patroni dynamic configuration settings](https://patroni.readthedocs.io/en/latest/dynamic_configuration.html)
- [Patroni REST API](https://patroni.readthedocs.io/en/latest/rest_api.html)
- [Patroni security considerations](https://patroni.readthedocs.io/en/latest/security.html)
- [Patroni watchdog support](https://patroni.readthedocs.io/en/latest/watchdog.html)
- [etcd failure tolerance and quorum FAQ](https://etcd.io/docs/v3.7/faq/)
- [etcd monitoring and health checks](https://etcd.io/docs/v3.7/op-guide/monitoring/)
