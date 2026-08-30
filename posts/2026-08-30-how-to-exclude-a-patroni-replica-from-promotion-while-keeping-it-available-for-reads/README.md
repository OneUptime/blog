# How to Exclude a Patroni Replica from Promotion While Keeping It Available for Reads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Patroni, Failover, Streaming Replication, Traffic Routing, High Availability, Replication Lag

Description: Use Patroni member tags to keep a reporting or remote replica in read service while preventing it from winning an automatic or planned promotion.

---

Set the replica's Patroni `nofailover` tag to `true` while leaving `noloadbalance` as `false`:

```yaml
tags:
  nofailover: true
  noloadbalance: false
```

Those tags control different decisions. `nofailover` excludes the member from the leader race and normal promotion-candidate selection. `noloadbalance` controls whether Patroni's `/replica` endpoint returns success for a running replica. Keeping the latter false lets a Patroni-aware read load balancer continue using the node.

This is useful for a remote asynchronous replica, a reporting server with different resources, a delayed recovery target, or hardware that should never carry production writes. It is not a substitute for replication health checks or database privileges.

## Apply the tag to one member

Tags live in each member's local Patroni configuration, not the cluster-wide dynamic configuration. On the replica to exclude, edit its Patroni YAML:

```yaml
scope: prod-ha
name: pg-reporting-1

tags:
  nofailover: true
  noloadbalance: false
  nosync: true
```

`nosync: true` is optional and separate. Use it when this node must also never become a synchronous standby—for example, a high-latency reporting replica whose selection would increase commit latency. Do not add it automatically to every `nofailover` node; a non-promotable local replica may still be a valid synchronous durability target if that is an intentional, tested design.

Ask Patroni to reread the local file:

```bash
patronictl -c /etc/patroni/patroni.yml reload prod-ha pg-reporting-1 --force
```

Patroni also supports `POST /reload`. A reload applies Patroni settings that are reloadable and triggers PostgreSQL configuration reload; it is not the same operation as editing the cluster DCS config.

Verify that Patroni publishes the tag:

```bash
patronictl -c /etc/patroni/patroni.yml list prod-ha --extended
curl --silent http://10.40.0.14:8008/patroni
```

The member should remain a streaming replica and show `nofailover: true`.

## Keep the read route role-aware

HAProxy can still use `/replica`, optionally with a lag ceiling:

```haproxy
backend reporting_replicas
    mode tcp
    balance leastconn
    option httpchk
    http-check connect port 8008
    http-check send meth GET uri /replica?lag=256MB ver HTTP/1.1 hdr Host patroni
    http-check expect status 200
    default-server inter 3s fall 3 rise 2
    server pg-reporting-1 10.40.0.14:5432 check
```

Because `noloadbalance` remains false, a running replica that meets the lag condition returns `200`. If it stops being a replica, is not running, exceeds the requested lag, or later receives `noloadbalance: true`, the endpoint returns `503`.

For a general replica pool, put all members in the backend and let the same endpoint decide eligibility. For a dedicated reporting tier, a separate listener makes its weaker consistency and performance contract explicit.

## Understand `failover_priority`

Current Patroni also supports a numeric `failover_priority` tag. Higher values are preferred when candidates have received or replayed the same amount of WAL; a candidate further ahead in WAL is still preferred regardless of priority. A value of zero or less prevents leadership, similarly to `nofailover: true`.

Use one mechanism, not both. Patroni's current configuration reference warns to provide only `nofailover` or `failover_priority`:

```yaml
tags:
  failover_priority: 0
  noloadbalance: false
```

`nofailover: true` is clearest when eligibility is binary. `failover_priority` is useful when several eligible nodes need a preference order. Treat it as a tie preference, not a way to promote a stale replica ahead of a healthier one.

## Prove both sides of the policy

First test read eligibility:

```bash
curl --include http://10.40.0.14:8008/replica

psql "host=postgres-reporting.example.net dbname=app user=app_read" \
  -c "SELECT inet_server_addr(), pg_is_in_recovery(), current_setting('transaction_read_only');"
```

Expect HTTP `200`, `pg_is_in_recovery() = true`, and a read-only transaction default for the read role.

Then test promotion exclusion during a planned exercise. Patroni documents several candidate checks: the node must be reachable through its API, must not have `nofailover`, must satisfy a required watchdog, and for a healthy switchover or automatic failover must meet lag and optional timeline checks. A candidate-explicit switchover targeting this member should be rejected while the tag is set.

Do not test by destroying the only production primary. Use an isolated or staging cluster with at least one other eligible, current replica. Confirm the allowed replica becomes leader and the excluded node remains a replica.

## Avoid the dangerous exceptions

The policy must cover operational procedures as well as automatic elections. Patroni's REST documentation notes that a manual failover in a cluster with no leader relaxes some safety checks, including lag, timeline, and synchronous-member constraints. `nofailover` remains a candidate eligibility check, but operators should not rely on memory during an outage. Put excluded-node intent in the runbook, dashboards, host naming, and alert annotations.

Also avoid these common mistakes:

- Setting `noloadbalance: true` when the goal is only to prevent promotion. That unnecessarily removes the node from `/replica` read routing.
- Assuming `nofailover` makes the server read-only. PostgreSQL recovery state and privileges enforce that; the tag controls Patroni elections.
- Leaving a delayed replica in a read pool without disclosing its delay. A lag threshold may remove it, but consumers still need an explicit consistency contract.
- Using a non-promotable node as the only replica. If the primary fails, the cluster correctly has no automatic candidate.
- Editing `bootstrap.dcs` to change a local tag. Bootstrap settings are consumed when the cluster is created; tags belong in the member file or supported environment variables.

## Monitor the invariant

Alert on two counts:

1. There must be at least one healthy eligible promotion candidate besides the primary.
2. Every excluded replica intended for reads must remain a running replica within its read lag objective.

Check `pg_stat_wal_receiver` on the replica and `pg_stat_replication` on the primary. A `/replica` result is a routing signal, not a complete replication-quality dashboard.

## Official Documentation

- [Patroni YAML configuration settings and tags](https://patroni.readthedocs.io/en/latest/yaml_configuration.html)
- [Patroni REST API and candidate checks](https://patroni.readthedocs.io/en/latest/rest_api.html)
- [Patroni `patronictl` commands](https://patroni.readthedocs.io/en/latest/patronictl.html)
- [Patroni replication modes](https://patroni.readthedocs.io/en/latest/replication_modes.html)
- [PostgreSQL hot standby](https://www.postgresql.org/docs/current/hot-standby.html)
- [PostgreSQL replication statistics](https://www.postgresql.org/docs/current/monitoring-stats.html#MONITORING-PG-STAT-REPLICATION-VIEW)

## Conclusion

Use `nofailover: true` and keep `noloadbalance: false` to make a Patroni replica readable but non-promotable. Add `nosync` only when synchronous selection is also undesirable, and use either `nofailover` or `failover_priority`, not both. Verify the REST route, SQL recovery state, and candidate behavior in staging so the tag is a tested policy rather than a hopeful annotation.
