# Why Does Patroni's HAProxy Health Check Return 503? Diagnosing REST API Role and Leader State

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Patroni, HAProxy, PostgreSQL, Health Check, High Availability, Failover, Troubleshooting

Description: Diagnose Patroni 503 health-check responses by separating expected role rejection from PostgreSQL, leader-lock, DCS, lag, tag, and proxy failures.

---

An HTTP `503` from a Patroni role endpoint usually means the endpoint is working exactly as designed: Patroni answered the request, but this node does not currently satisfy the requested role.

For a three-node cluster checked with `/primary`, two nodes should return `503` all the time. Only the PostgreSQL primary whose Patroni process holds the leader lock returns `200`. The alert condition is usually **zero eligible primary backends**, not “any check returned 503.”

The diagnosis starts by preserving three facts:

1. Which exact URI, port, and protocol did HAProxy request?
2. Did Patroni itself return `503`, or did the transport/TLS connection fail?
3. What role and leader-lock state did Patroni report at that moment?

## Know the contract of the endpoint being checked

Patroni's current REST API uses these conditions:

| Endpoint | `200` condition | Why it returns `503` |
| --- | --- | --- |
| `/`, `/primary`, `/read-write` | PostgreSQL is running as primary **and** this member holds the leader lock | Replica, no lock, PostgreSQL not in primary state, or transition |
| `/leader` | This Patroni member holds the leader lock | Lock belongs elsewhere or cluster is unlocked |
| `/standby-leader` | Member is the elected leader of a Patroni standby cluster | Wrong standby-cluster role |
| `/replica` | State is `running`, role is replica, and `noloadbalance` is not set | Primary, stopped/starting replica, or read-drain tag |
| `/replica?lag=64MB` | Replica conditions plus lag below threshold | Role/state/tag failure or excessive lag |
| `/replica?tag_region=eu-west` | Replica conditions plus matching `region` tag | Tag missing/different or base replica failure |
| `/synchronous` or `/sync` | Node is a synchronous standby | Async/primary/other role |
| `/quorum` | Node is listed as a quorum node in primary `synchronous_standby_names` | Not currently a quorum standby |
| `/asynchronous` or `/async` | Node is an asynchronous standby | Sync/primary/other role |
| `/health` | PostgreSQL is up and running | PostgreSQL is not running |
| `/liveness` | Patroni HA loop ran recently | Last loop is older than `ttl` on primary or `2 * ttl` on replica |
| `/readiness` | Leader, or a running/replicating replica within the allowed lag | Startup, replay/receive lag, or no suitable state |

Leader endpoint checks deliberately ignore user-defined tag query parameters. Replica checks honor `noloadbalance`, lag, and `tag_...` filters.

Do not replace `/primary` with `/health` to eliminate 503s. `/health` can return `200` on a replica and would send writes to the wrong role.

## Reproduce the exact check from the HAProxy host

Start with the backend configuration, not an assumed URI:

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

This sends PostgreSQL client connections to `5432` but the health request to `8008`. From the same HAProxy network namespace/host, request exactly that endpoint and keep headers plus body:

```bash
curl --include --max-time 3 \
  --header 'Host: patroni' \
  http://10.40.0.11:8008/primary
```

Repeat for every server. If TLS is configured, use the same CA, client certificate, DNS name/SNI, and protocol as HAProxy. A successful TCP connection followed by `HTTP/1.0 503` or `HTTP/1.1 503` is a Layer 7 role rejection. Connection refused, timeout, certificate verification failure, `401`, or `403` is a different problem.

HAProxy logs make this distinction visible:

- `Layer7 wrong status, code: 503` means Patroni responded but did not qualify the node.
- `Connection refused`, `Layer4 timeout`, or SSL alerts mean HAProxy did not obtain the Patroni role response.

## Read Patroni's monitoring document

`GET /patroni` returns status JSON regardless of the role selector. Capture the fields that explain most 503s:

```bash
curl --silent http://10.40.0.11:8008/patroni \
  | jq '{state,role,timeline,xlog,dcs_last_seen,cluster_unlocked,failsafe_mode_is_active,tags,patroni}'
```

Typical healthy primary fields resemble:

```json
{
  "state": "running",
  "role": "primary",
  "timeline": 12,
  "dcs_last_seen": 1787991000,
  "patroni": {
    "scope": "prod-ha",
    "name": "pg2"
  }
}
```

Interpret combinations instead of reading only `role`:

| `/health` | `/leader` | `/primary` | Interpretation |
| --- | --- | --- | --- |
| `200` | `200` | `200` | Normal primary holding the lock |
| `200` | `503` | `503` | PostgreSQL runs, but this node is not leader; often a healthy replica |
| `503` | `200` | `503` | Patroni holds the lock but PostgreSQL is not currently up as a normal primary; investigate immediately |
| `200` | `200` | `503` | Lock holder is not running PostgreSQL as a normal primary (possible transition or standby-leader topology) |
| `503` | `503` | `503` | PostgreSQL down and node not leader |

For `/replica`, inspect `state`, `role`, `tags.noloadbalance`, `xlog.received_location`, `xlog.replayed_location`, and the query's lag/tag limits.

`dcs_last_seen` is a Unix timestamp showing recent successful DCS communication. `cluster_unlocked: true` means no leader lock appears in the local cluster view. `failsafe_mode_is_active: true` explains the special state during a DCS failsafe event; confirm it across members rather than assuming ordinary DCS leadership.

## Compare the whole cluster view

Run `patronictl` with a configuration that can reach the same DCS and authenticated REST APIs:

```bash
patronictl -c /etc/patroni/patroni.yml list prod-ha --extended
patronictl -c /etc/patroni/patroni.yml history prod-ha
patronictl -c /etc/patroni/patroni.yml show-config prod-ha
```

Check:

- Exactly one leader for a normal cluster
- Member `scope` and database system identifier match
- Candidate states are `running`/`streaming`
- Timelines are current
- Replication lag stays within endpoint and failover policy
- Tags do not intentionally drain a member
- Cluster is not unexpectedly paused

If one server has a different `scope`, it belongs to a different Patroni DCS namespace even if the PostgreSQL port and data look related. Never make HAProxy combine different scopes into one write backend.

## Diagnose all-primary-503 incidents

When every `/primary` check returns `503`, work in safety order.

### 1. No leader lock

`patronictl list` shows no leader or `/patroni` contains `cluster_unlocked`. Check etcd quorum:

```bash
etcdctl \
  --endpoints=https://10.50.1.11:2379,https://10.50.2.11:2379,https://10.50.3.11:2379 \
  --cacert=/etc/etcd/tls/ca.pem \
  --cert=/etc/etcd/tls/admin.pem \
  --key=/etc/etcd/tls/admin-key.pem \
  endpoint health --cluster

etcdctl \
  --endpoints=https://10.50.1.11:2379,https://10.50.2.11:2379,https://10.50.3.11:2379 \
  --cacert=/etc/etcd/tls/ca.pem \
  --cert=/etc/etcd/tls/admin.pem \
  --key=/etc/etcd/tls/admin-key.pem \
  endpoint status --cluster --write-out=table
```

Restore DCS quorum/network latency first. Patroni demoting a database-healthy primary after it cannot renew the lock is split-brain protection. Do not force HAProxy to route around it.

### 2. PostgreSQL failed to start or is changing role

If `/health` is also `503`, inspect Patroni/PostgreSQL logs, disk capacity, crash recovery, configuration validity, and watchdog state:

```bash
journalctl -u patroni --since '-15 minutes'
curl --include http://10.40.0.11:8008/liveness
```

During a normal switchover, the old primary stops qualifying before the new one qualifies. A short zero-backend interval is expected. If it exceeds the runbook budget, diagnose candidate promotion rather than broadening the check.

### 3. This is a standby cluster

A Patroni standby cluster has a `standby-leader`, which remains in recovery and is not a normal writable primary. `/primary` correctly returns `503`. Use `/standby-leader` only for traffic appropriate to that architecture; do not send ordinary writes to it.

### 4. Wrong REST path or port

Confirm the loaded HAProxy configuration uses `http-check connect port 8008` and `/primary`, not a stale endpoint, a reverse proxy's `/health`, or PostgreSQL port `5432`. Validate configuration:

```bash
haproxy -c -f /etc/haproxy/haproxy.cfg
```

Then inspect runtime state through an enabled admin socket:

```bash
printf 'show stat\n' | socat - UNIX-CONNECT:/run/haproxy/admin.sock
```

Test from both redundant HAProxy instances; one may not have reloaded.

## Diagnose replica-only 503 responses

If `/health` is `200` and `/replica` is `503`, inspect the exact replica eligibility filters:

```bash
curl --silent http://10.40.0.12:8008/patroni \
  | jq '{state,role,timeline,xlog,tags}'

curl --include 'http://10.40.0.12:8008/replica?lag=64MB'
curl --include 'http://10.40.0.12:8008/replica?tag_region=eu-west'
```

Common explanations:

- The node is now primary, so replica rejection is correct.
- PostgreSQL role is replica but Patroni state is `starting`, `stopped`, or otherwise not `running`.
- `noloadbalance: true` intentionally drained the member.
- Receive or replay lag exceeds the `lag` query.
- A `tag_` query requires a missing or different member tag.
- The endpoint asks for `/sync`, `/quorum`, or `/async` and the standby's current replication class differs.

Fix replication, capacity, or the intended tag policy. Do not remove the lag limit without confirming the application's stale-read tolerance.

## Correlate timing with HAProxy thresholds

With:

```haproxy
default-server inter 2s fall 3 rise 2
```

HAProxy needs three consecutive failed checks to mark a server down and two successes to mark it up. With two-second intervals, detection takes roughly four to six seconds from the onset of a persistent failure, depending on where it lands between checks and how long each check takes. Patroni's default leader-lock TTL is commonly 30 seconds, with a ten-second HA loop. These are different clocks.

Too many `fall` checks can keep the old route eligible longer after Patroni begins returning `503`; too many `rise` checks extend the outage after a safe new primary appears. Too few can flap on transient transport loss. Measure the entire failover and set values that honor both safety and application retry behavior. The endpoint's role assertion—not aggressive timing—is what makes the route safe.

Existing TCP connections are not reevaluated by health checks. HAProxy applies backend changes to new connections; PgBouncer may retain server connections until they break or are recycled. Include connection-pool behavior in the incident timeline.

## Failure modes and safe remediation

| Finding | Correct action | Unsafe shortcut |
| --- | --- | --- |
| Two of three `/primary` checks are `503` | None; this is normal | Alerting on every 503 |
| All `/primary` checks are `503`, no DCS leader | Restore DCS quorum and let Patroni elect | Accept `/health` as writable |
| `/leader=200`, `/primary=503` | Repair/observe the lock holder's PostgreSQL role | Route writes to `/leader` |
| Replica exceeds lag query | Fix lag or route reads elsewhere | Remove limit without consistency review |
| Patroni direct check is `200`, HAProxy still marks down | Fix loaded config, transport identity, or stale runtime state | Change Patroni role |
| Direct request times out | Fix REST bind/firewall/network/TLS | Treat it as a role 503 |
| More than one `/primary=200` | Remove write traffic and investigate DCS scope/fencing immediately | Round-robin between them |

If a recent HAProxy edit caused the problem, restore the last known-good file, validate it, and reload one proxy at a time. Re-test the exact endpoint from each proxy before reopening traffic. A proxy rollback does not roll back a Patroni role change.

If the cluster has no safe leader, application write unavailability is preferable to guessing. Any manual promotion requires a positively fenced former primary, a selected authoritative timeline, and explicit acceptance of possible data loss.

## References

- [Patroni REST API](https://patroni.readthedocs.io/en/latest/rest_api.html)
- [Patroni DCS failsafe mode](https://patroni.readthedocs.io/en/latest/dcs_failsafe_mode.html)
- [Patroni dynamic configuration](https://patroni.readthedocs.io/en/latest/dynamic_configuration.html)
- [Patroni pause mode](https://patroni.readthedocs.io/en/latest/pause.html)
- [HAProxy configuration manual](https://docs.haproxy.org/3.4/configuration.html)
- [HAProxy health-check tutorial](https://www.haproxy.com/documentation/haproxy-configuration-tutorials/reliability/health-checks/)
- [etcd monitoring guide](https://etcd.io/docs/v3.7/op-guide/monitoring/)
