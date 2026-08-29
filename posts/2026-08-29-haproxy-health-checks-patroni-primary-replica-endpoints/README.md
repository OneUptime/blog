# HAProxy Health Checks for Patroni Primary and Replica Endpoints

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HAProxy, Patroni, PostgreSQL, Health Check, Traffic Routing, High Availability, Load Balancing

Description: Route PostgreSQL writes and reads with HAProxy HTTP checks that follow Patroni's leader lock, replica role, tags, and lag limits.

---

HAProxy should not decide that a PostgreSQL server is writable merely because port `5432` accepts TCP connections. A replica accepts connections too, and a demoted former primary may remain reachable while Patroni protects it from writes.

Patroni exposes role-aware HTTP endpoints on its REST port. HAProxy can carry PostgreSQL's TCP protocol to port `5432` while checking the same server's Patroni endpoint on port `8008`.

During normal, unpaused cluster operation, the safe write signal is:

```text
GET /primary -> HTTP 200 only when PostgreSQL is primary and Patroni owns the leader lock
```

All other nodes normally return `503` for that check.

Pause mode is an exception: when DCS cluster data is unavailable, Patroni derives `/primary`, `/leader`, and `/standby-leader` status from the local PostgreSQL role without confirming a leader lock. Do not rely on these endpoints for split-brain protection in that exceptional maintenance state.

## Choose the endpoint for each service

Patroni's endpoints express eligibility, not generic process liveness:

| Endpoint | `200` means | Typical HAProxy service |
| --- | --- | --- |
| `/primary` or `/read-write` | PostgreSQL is primary and this member holds the leader lock | Writes |
| `/leader` | Member holds the lock, without requiring PostgreSQL to be a normal primary | Monitoring, not normal write routing |
| `/replica` | PostgreSQL state is `running`, role is replica, and `noloadbalance` is not set | Read replicas |
| `/replica?lag=64MB` | Replica conditions hold and computed replay lag does not exceed `64MB` | Lag-bounded reads |
| `/synchronous` or `/sync` | Node is a synchronous standby | Reads requiring a sync standby |
| `/quorum` | Node is listed as a quorum member in `synchronous_standby_names` | Quorum-mode read selection |
| `/asynchronous` or `/async` | Node is an asynchronous standby | Explicit async read pool |
| `/read-only` | Eligible replica conditions, also including the primary | Reads that may use the primary |
| `/health` | PostgreSQL is running, regardless of role | Monitoring only |
| `/liveness` | Patroni is paused, or its HA loop ran within the role-specific liveness window | Patroni process monitoring |

For a normal PostgreSQL cluster, do not use `/leader` or `/health` for write traffic. In a Patroni standby cluster, the elected node is a `standby-leader`; use `/standby-leader` for that topology rather than pretending it is a writable primary.

## Verify Patroni directly first

From each HAProxy host, query every Patroni address:

```bash
for host in 10.40.0.11 10.40.0.12 10.40.0.13; do
  printf '%s primary=' "$host"
  curl --silent --output /dev/null --write-out '%{http_code}' \
    "http://${host}:8008/primary"
  printf ' replica='
  curl --silent --output /dev/null --write-out '%{http_code}' \
    "http://${host}:8008/replica"
  printf ' health='
  curl --silent --output /dev/null --write-out '%{http_code}\n' \
    "http://${host}:8008/health"
done
```

For one primary and two healthy replicas, expect:

- One `primary=200`, two `primary=503`
- One `replica=503`, two `replica=200`
- Three `health=200`

If those results are wrong, fix Patroni, PostgreSQL, DCS, REST networking, or tags before configuring HAProxy. A load balancer cannot repair missing leadership.

## Build separate write and read listeners

This complete example exposes writes on `5000` and lag-bounded replica reads on `5001`:

```haproxy
global
    log /dev/log local0
    stats socket /run/haproxy/admin.sock mode 660 level admin

defaults
    log global
    mode tcp
    option tcplog
    timeout connect 3s
    timeout client  30m
    timeout server  30m
    timeout check   2s

frontend postgresql_write
    bind :5000
    default_backend patroni_primary

backend patroni_primary
    mode tcp
    option httpchk
    http-check connect port 8008
    http-check send meth GET uri /primary ver HTTP/1.1 hdr Host patroni
    http-check expect status 200
    default-server inter 2s fall 3 rise 2 init-state fully-down
    server pg1 10.40.0.11:5432 check
    server pg2 10.40.0.12:5432 check
    server pg3 10.40.0.13:5432 check

frontend postgresql_read
    bind :5001
    default_backend patroni_replicas

backend patroni_replicas
    mode tcp
    balance roundrobin
    option httpchk
    http-check connect port 8008
    http-check send meth GET uri /replica?lag=64MB ver HTTP/1.1 hdr Host patroni
    http-check expect status 200
    default-server inter 2s fall 3 rise 2 init-state fully-down
    server pg1 10.40.0.11:5432 check
    server pg2 10.40.0.12:5432 check
    server pg3 10.40.0.13:5432 check
```

There are two ports on every `server` line's path:

- `10.40.0.11:5432` is the destination for accepted PostgreSQL client connections.
- `http-check connect port 8008` overrides the port for the HTTP health-check connection only.

`init-state fully-down` (HAProxy 3.1 and later) keeps each server out of rotation at process start until it passes the configured `rise` threshold. Without it, HAProxy can optimistically route traffic before the first role check finishes.

`option httpchk` starts an HTTP check ruleset. `http-check send` makes an explicit HTTP/1.1 GET with a Host header, and `http-check expect status 200` rejects every non-200 response. This avoids relying on HAProxy's broader default HTTP success range.

Keep the frontend/backend in `mode tcp`; HAProxy must not parse or terminate the PostgreSQL application protocol. The health check is HTTP even though carried within a TCP-mode backend.

The `30m` client/server settings are illustrative inactivity timeouts. Choose them from legitimate idle-session and long-query behavior; they are not SQL statement deadlines. A value such as `30s` can unexpectedly terminate a quiet persistent connection or a query that produces no network traffic.

## Set a meaningful replica lag threshold

`/replica?lag=<max-lag>` accepts integer bytes or human-readable values such as `64MB` or `1GB`. The lag test is inclusive: exactly the configured maximum still passes. Current Patroni compares the replica's replayed LSN with the greater of the last leader LSN known through DCS and the local WAL receiver's latest end LSN.

Choose a threshold from application consistency requirements, not server capacity. For example:

```haproxy
http-check send meth GET uri /replica?lag=16MB ver HTTP/1.1 hdr Host patroni
```

A lower threshold removes stale replicas sooner but can leave no read backend during bursts. A higher threshold improves read availability while exposing older data. Monitor actual receive/replay lag and document whether the application permits read-after-write anomalies.

If the application can safely read from either primary or replicas, use `/read-only` in a separate backend. Do not mix `/primary` and `/replica` checks within one backend and expect an in-flight SQL transaction to move between them; HAProxy selects a server once per TCP connection.

## Use Patroni tags for planned read draining

Set `noloadbalance: true` on a replica to make `/replica` return `503`, removing it from HAProxy's read pool without stopping PostgreSQL. Patroni tags are member-local configuration:

```yaml
tags:
  noloadbalance: true
```

Reload Patroni through the approved service procedure and verify the endpoint. The tag does not affect `/primary`/leader checks; Patroni deliberately ignores custom tags for leader endpoints. Use a switchover or `nofailover` policy separately when controlling leader candidacy.

Patroni also lets a replica endpoint require user-defined tags with `tag_`-prefixed query parameters. If HAProxy sends `/replica?tag_region=eu-west`, the member must define `region: eu-west` or it returns `503`. Combine multiple query parameters with care because `lag` and tag mismatches all look like role-check failures at the HTTP layer.

## Secure the REST checks

The examples use clear-text HTTP only for a protected internal network. In production:

- Use firewalls or network policy to restrict access to Patroni REST listeners; Patroni's allowlist settings restrict unsafe methods, not health-check GET/HEAD requests.
- Use TLS with certificate verification when checks cross untrusted networks.
- Issue certificates whose SANs match the SNI name or `verifyhost` value HAProxy verifies.
- Configure HAProxy's check-side `ssl`, `verify required`, `ca-file`, and explicit or per-server SNI/`verifyhost` options according to the installed HAProxy release; validate each server independently. With an explicit `http-check connect` rule, HAProxy 3.4 does not derive check SNI from the HTTP Host header.
- For PostgreSQL TLS passed through HAProxy, give every possible backend a certificate valid for the routed database service name and have libpq use `sslmode=verify-full` with the issuing CA.
- Keep unsafe Patroni REST methods authenticated. Health-check GET/HEAD requests do not need permission to mutate cluster state.

Do not solve a TLS name error with `verify none`. If the same backend uses different per-server DNS names, use certificates with appropriate SANs and matching per-server `check-sni`/`verifyhost` configuration.

## Validate and deploy without dropping connections

Check syntax before every reload:

```bash
haproxy -c -f /etc/haproxy/haproxy.cfg
```

Then reload one redundant HAProxy instance at a time:

```bash
systemctl reload haproxy
```

Run at least two HAProxy instances behind a redundant virtual IP, DNS/service-discovery record, or platform load balancer. A perfectly role-aware single HAProxy is still a single point of failure.

Inspect runtime backend state through the configured administration socket:

```bash
printf 'show stat\n' | socat - UNIX-CONNECT:/run/haproxy/admin.sock \
  | awk -F, '$1 == "patroni_primary" || $1 == "patroni_replicas" {print $1, $2, $18, $37}'
```

Also inspect HAProxy logs for `Layer7 wrong status, code: 503` versus transport or TLS failures. A 503 proves HAProxy reached Patroni and Patroni rejected role eligibility; Layer 4 failures point to the listening address or port, firewall, or routing, while Layer 6 failures point to TLS negotiation or certificate verification.

## Verify end to end

Use the same DNS names and TLS settings as the application:

```bash
psql "host=postgres-write.internal port=5000 dbname=postgres user=monitor sslmode=verify-full sslrootcert=/etc/postgresql/tls/ca.pem" \
  -c "SELECT inet_server_addr(), pg_is_in_recovery(), current_setting('transaction_read_only');"

psql "host=postgres-read.internal port=5001 dbname=postgres user=monitor sslmode=verify-full sslrootcert=/etc/postgresql/tls/ca.pem" \
  -c "SELECT inet_server_addr(), pg_is_in_recovery(), current_setting('transaction_read_only');"
```

The write listener should return `pg_is_in_recovery() = false`; for a session intended to write, `transaction_read_only` should also be `off`. The replica listener should return `pg_is_in_recovery() = true`.

Perform a planned Patroni switchover in staging:

```bash
patronictl -c /etc/patroni/patroni.yml switchover prod-ha \
  --leader pg1 --candidate pg2 --scheduled now --force
```

Verify the old write server transitions down and the new server transitions up, eventually leaving exactly one eligible server. Because the `fall` and `rise` thresholds debounce staggered checks, HAProxy may transiently show zero or both servers as eligible. Existing sessions may fail; HAProxy routes only new TCP connections. Applications must reconnect and retry complete transactions safely.

## Failure modes and rollback

| Symptom | Likely cause | Response |
| --- | --- | --- |
| Every primary server is down with HTTP `503` | Patroni has no normal primary holding the lock | Restore DCS/Patroni health; do not switch to `/health` |
| Direct `/primary` is `200`, HAProxy reports connection failure | Wrong check port/address, firewall, bind address, or TLS | Test from the HAProxy host and fix transport |
| Primary is accidentally present in read pool | Backend uses `/read-only` or a TCP-only check | Use `/replica` for replica-only reads |
| Lagging replica remains eligible | No `lag` query or threshold too large | Add/tighten the threshold after checking application requirements |
| Healthy replica returns `503` | `noloadbalance`, tag mismatch, lag, wrong role, or state not `running` | Inspect `/patroni`, tags, and replication state |
| Failover completes but clients stay on old server | Existing TCP/PgBouncer server connections | Allow them to fail/close; reconnect and verify transaction outcomes |
| One HAProxy host fails | Proxy layer lacks redundancy | Use the second instance and repair the failed proxy |

For a bad HAProxy deployment, retain the last known-good configuration, validate it with `haproxy -c`, and reload one proxy at a time. Restoring proxy configuration does not change the Patroni leader; query `/primary` again before returning application traffic.

Never make a role endpoint “healthy” by broadening `http-check expect` to include `503`. The non-200 result is the safety signal HAProxy must honor.

## References

- [Patroni REST API health endpoints](https://patroni.readthedocs.io/en/latest/rest_api.html#health-check-endpoints)
- [Patroni YAML REST and tag settings](https://patroni.readthedocs.io/en/latest/yaml_configuration.html)
- [HAProxy configuration manual](https://docs.haproxy.org/3.4/configuration.html)
- [HAProxy health-check tutorial](https://www.haproxy.com/documentation/haproxy-configuration-tutorials/reliability/health-checks/)
- [PostgreSQL hot standby](https://www.postgresql.org/docs/current/hot-standby.html)
- [PostgreSQL monitoring statistics](https://www.postgresql.org/docs/current/monitoring-stats.html)
- [PostgreSQL libpq SSL/TLS support](https://www.postgresql.org/docs/current/libpq-ssl.html)
