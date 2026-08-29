# How to Build a Three-Node PostgreSQL HA Cluster with Patroni, etcd, and HAProxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Patroni, etcd, HAProxy, High Availability, Database Cluster, Streaming Replication

Description: Build and operate a three-node PostgreSQL cluster in which Patroni manages roles, etcd provides consensus, and HAProxy sends traffic to the correct node.

---

A highly available PostgreSQL service needs more than streaming replication. It needs one authority that decides which node may accept writes, a way to expose that decision to clients, and operational procedures that keep a failed former primary from returning as a second writer.

In this design:

- Patroni runs beside PostgreSQL on `pg1`, `pg2`, and `pg3`. It bootstraps replicas, maintains the leader lock, and promotes or demotes PostgreSQL.
- A three-member etcd cluster stores Patroni's dynamic configuration and leader state. A majority of two members is required.
- HAProxy checks each Patroni REST API and sends new PostgreSQL connections to nodes whose role matches the requested service according to the most recent health check.

The example co-locates one etcd member with each database node to keep the walkthrough compact. Co-location is acceptable only when CPU, memory, and disk I/O are isolated. For a busy production database, place etcd on separate failure domains with fast dedicated storage. Run at least two HAProxy instances behind redundant DNS, a virtual IP, or a platform load balancer; one HAProxy process would otherwise be a new single point of failure.

## Topology and prerequisites

Use stable addresses and forward-confirmed names:

| Host | Address | Services |
| --- | --- | --- |
| `pg1` | `10.40.0.11` | PostgreSQL, Patroni, etcd member `etcd1` |
| `pg2` | `10.40.0.12` | PostgreSQL, Patroni, etcd member `etcd2` |
| `pg3` | `10.40.0.13` | PostgreSQL, Patroni, etcd member `etcd3` |
| `proxy1` | `10.40.0.21` | HAProxy |
| `proxy2` | `10.40.0.22` | HAProxy |

Before starting:

1. Install the same supported PostgreSQL major release and the matching `pg_rewind` binary on all three database nodes.
2. Install the same Patroni and etcd release on their respective nodes. Use Patroni's `etcd3` dependency, not the incompatible etcd v2 API.
3. Permit etcd peer traffic on `2380`, etcd client traffic on `2379`, Patroni REST traffic on `8008`, and PostgreSQL traffic on `5432` only between the systems that need them.
4. Synchronize clocks, configure host-level fencing or a watchdog, and provision backups independently of replication.
5. Put passwords and TLS keys in a restricted secret source readable by the Patroni service account and its administrators. The literal passwords below are placeholders, not production values.

Stop and disable any distribution-managed standalone PostgreSQL service. For a new cluster, point Patroni at an empty, correctly owned data directory; some packages initialize a default cluster during installation. Never erase a pre-existing data directory to satisfy this prerequisite-use Patroni's documented conversion or replica-creation procedure instead.

## Bootstrap the etcd quorum

Create `/etc/etcd/etcd.yml` on `pg1`:

```yaml
name: etcd1
data-dir: /var/lib/etcd
listen-peer-urls: http://10.40.0.11:2380
initial-advertise-peer-urls: http://10.40.0.11:2380
listen-client-urls: http://10.40.0.11:2379,http://127.0.0.1:2379
advertise-client-urls: http://10.40.0.11:2379
initial-cluster: etcd1=http://10.40.0.11:2380,etcd2=http://10.40.0.12:2380,etcd3=http://10.40.0.13:2380
initial-cluster-token: patroni-prod-01
initial-cluster-state: new
```

Use the same file on `pg2` and `pg3`, changing `name` and the local IP address in `listen-peer-urls`, `initial-advertise-peer-urls`, `listen-client-urls`, and `advertise-client-urls`. Keep `initial-cluster` and `initial-cluster-token` identical on all three members. Start all three members with the configuration file:

```bash
etcd --config-file=/etc/etcd/etcd.yml
```

When etcd uses `--config-file`, its documentation states that command-line flags and environment variables are ignored. Do not try to override individual file values in the service unit.

This clear-text configuration is suitable only for a protected lab network. In production, use HTTPS peer and client URLs and separate peer/client credentials. Configure etcd client mTLS with `client-cert-auth`, `trusted-ca-file`, `cert-file`, and `key-file`, and peer mTLS with `peer-client-cert-auth`, `peer-trusted-ca-file`, `peer-cert-file`, and `peer-key-file`. Configure Patroni's `etcd3` section with `protocol: https`, `cacert`, `cert`, and `key`.

Verify membership and quorum from an administrative host:

```bash
etcdctl \
  --endpoints=http://10.40.0.11:2379,http://10.40.0.12:2379,http://10.40.0.13:2379 \
  endpoint health --cluster

etcdctl \
  --endpoints=http://10.40.0.11:2379,http://10.40.0.12:2379,http://10.40.0.13:2379 \
  endpoint status --cluster --write-out=table

etcdctl \
  --endpoints=http://10.40.0.11:2379 \
  member list --write-out=table
```

All three members should be healthy, have distinct member IDs, and agree on one etcd leader. Do not continue if the initial cluster list differs between nodes.

## Configure Patroni and PostgreSQL

Create `/etc/patroni/patroni.yml` on `pg1`. Replace every placeholder secret and adjust binary/data paths for the installed PostgreSQL package:

```yaml
scope: prod-ha
namespace: /service/
name: pg1

restapi:
  listen: 0.0.0.0:8008
  connect_address: 10.40.0.11:8008
  authentication:
    username: patroni_api
    password: REPLACE_REST_API_PASSWORD
  allowlist:
    - 127.0.0.1
  allowlist_include_members: true

etcd3:
  hosts:
    - 10.40.0.11:2379
    - 10.40.0.12:2379
    - 10.40.0.13:2379

bootstrap:
  dcs:
    ttl: 30
    loop_wait: 10
    retry_timeout: 10
    maximum_lag_on_failover: 1048576
    check_timeline: true
    postgresql:
      use_pg_rewind: true
      use_slots: true
      parameters:
        wal_level: replica
        hot_standby: "on"
        max_wal_senders: 10
        max_replication_slots: 10
        wal_log_hints: "on"
        full_page_writes: "on"
        password_encryption: scram-sha-256
        ssl: "on"
        ssl_cert_file: /etc/postgresql/tls/server.pem
        ssl_key_file: /etc/postgresql/tls/server-key.pem
  initdb:
    - encoding: UTF8
    - data-checksums
  pg_hba:
    - hostssl replication replicator 127.0.0.1/32 scram-sha-256
    - hostssl all all 127.0.0.1/32 scram-sha-256
    - hostssl replication replicator 10.40.0.0/24 scram-sha-256
    - hostssl all all 10.40.0.0/24 scram-sha-256

postgresql:
  listen: 0.0.0.0:5432
  connect_address: 10.40.0.11:5432
  data_dir: /var/lib/postgresql/18/main
  bin_dir: /usr/lib/postgresql/18/bin
  authentication:
    superuser:
      username: postgres
      password: REPLACE_SUPERUSER_PASSWORD
    replication:
      username: replicator
      password: REPLACE_REPLICATION_PASSWORD
    rewind:
      username: rewind_user
      password: REPLACE_REWIND_PASSWORD

watchdog:
  mode: required
  device: /dev/watchdog
  safety_margin: 5

tags:
  nofailover: false
  noloadbalance: false
  clonefrom: false
  nostream: false
```

Copy it to `pg2` and `pg3`, changing only `name`, `restapi.connect_address`, and `postgresql.connect_address` to the local node. Keep `scope`, `namespace`, DCS endpoints, and bootstrap settings identical.

Provision a unique PostgreSQL server certificate and key at the configured paths on each member, owned by the PostgreSQL account with the private key restricted as PostgreSQL requires. HAProxy passes PostgreSQL TLS through unchanged. If clients use `sslmode=verify-full` with `database-write.example.net`, every possible primary's certificate must contain that routed service name in its subject alternative names, along with any node identities used for direct administration.

The REST username/password protects unsafe methods; the allowlist limits them to localhost plus registered cluster members. Add explicit management networks only where required. Safe role-check GETs remain available to HAProxy. The examples still use HTTP for REST simplicity, so production deployments must add Patroni REST TLS (and, where appropriate, client certificates); Basic authentication alone does not protect credentials on an untrusted network.

The timing values obey Patroni's required inequality:

```text
loop_wait + 2 * retry_timeout <= ttl
10        + 2 * 10            <= 30
```

`pg_rewind` requires the target cluster to have either data checksums enabled or `wal_log_hints=on`; `full_page_writes` must also remain on. When checksums are enabled, PostgreSQL always WAL-logs hint-bit updates and ignores `wal_log_hints`, so configuring both is redundant while checksums remain enabled. The rewind account is created with the required permissions by Patroni on PostgreSQL 11 and newer.

The `bootstrap.dcs` section is consumed only when the cluster is first initialized. After that, edit cluster-wide values with `patronictl edit-config` or the Patroni REST configuration endpoint, not by changing `bootstrap.dcs` in local files.

Configure and test the Linux watchdog on every database node before using `mode: required`. Patroni will refuse promotion if it cannot activate a required watchdog. A hardware watchdog is preferable; the kernel `softdog` device is useful for testing but cannot recover a completely frozen kernel or host.

A fixed `safety_margin: 5` leaves Patroni's documented narrow suspension window in which a delayed watchdog keepalive can expire after the DCS lock. If the design requires the watchdog to fire first under every scheduling pause, use `safety_margin: -1` so its timeout is `ttl // 2`, then retune `ttl`, `loop_wait`, and `retry_timeout` and prove the reset budget in staging.

## Start in a controlled order

Start Patroni on `pg1` first. It initializes PostgreSQL, writes the cluster configuration to etcd, and acquires the leader lock. Then start `pg2` and `pg3`; Patroni creates them as streaming replicas.

```bash
systemctl enable --now patroni

patronictl -c /etc/patroni/patroni.yml list prod-ha
```

Do not run `initdb`, `pg_ctl promote`, or PostgreSQL's service unit independently. Patroni must remain the only role manager.

Check the role API from a different host:

```bash
for host in 10.40.0.11 10.40.0.12 10.40.0.13; do
  printf '%s primary=' "$host"
  curl --silent --output /dev/null --write-out '%{http_code}' "http://${host}:8008/primary"
  printf ' replica='
  curl --silent --output /dev/null --write-out '%{http_code}\n' "http://${host}:8008/replica"
done
```

Exactly one node should return `200` for `/primary`; the two running replicas should return `200` for `/replica`. A `503` from a role endpoint means that node does not currently satisfy that role, which is expected for the other nodes.

Confirm the database state too:

```sql
SELECT pg_is_in_recovery();

SELECT application_name,
       client_addr,
       state,
       sync_state,
       pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS byte_lag
FROM pg_stat_replication;
```

The first query is `false` on the primary and `true` on replicas. Run the second on the primary; both replicas should normally report `state = 'streaming'`.

## Route write and read traffic with HAProxy

Install this configuration on both proxy nodes. HAProxy carries PostgreSQL traffic on the server's normal port while opening a separate HTTP health-check connection to Patroni on port `8008`:

```haproxy
global
    log /dev/log local0

defaults
    log global
    mode tcp
    timeout connect 3s
    timeout client  30m
    timeout server  30m
    timeout check   2s

frontend postgresql_write
    bind :5000
    default_backend patroni_primary

backend patroni_primary
    option httpchk
    http-check connect port 8008
    http-check send meth GET uri /primary ver HTTP/1.1 hdr Host patroni
    http-check expect status 200
    default-server inter 2s fall 3 rise 2
    server pg1 10.40.0.11:5432 check
    server pg2 10.40.0.12:5432 check
    server pg3 10.40.0.13:5432 check

frontend postgresql_read
    bind :5001
    default_backend patroni_replicas

backend patroni_replicas
    balance roundrobin
    option httpchk
    http-check connect port 8008
    http-check send meth GET uri /replica?lag=64MB ver HTTP/1.1 hdr Host patroni
    http-check expect status 200
    default-server inter 2s fall 3 rise 2
    server pg1 10.40.0.11:5432 check
    server pg2 10.40.0.12:5432 check
    server pg3 10.40.0.13:5432 check
```

Validate and reload each proxy one at a time:

```bash
haproxy -c -f /etc/haproxy/haproxy.cfg
systemctl reload haproxy
```

The `30m` client/server values are illustrative inactivity timeouts, not query-duration limits. Size them from legitimate idle-session and long-query behavior; an unexplained `30s` database timeout can terminate quiet persistent sessions or a query that produces no network traffic. Enforce SQL execution limits with PostgreSQL/application policy rather than an accidentally short proxy inactivity timer.

HAProxy selects a backend when a new TCP connection is established; it does not migrate existing sessions. Connect applications to the redundant write endpoint on port `5000`. Use port `5001` only for queries that tolerate replica lag and read-only transaction semantics. A session opened against a replica can remain connected after that replica is promoted and can then start read-write transactions, so enforce read-only application access with PostgreSQL privileges rather than treating port `5001` as an authorization boundary.

After a disconnect, clients must reconnect and cannot resume an open transaction. Retry the whole transaction only when its outcome is known to be uncommitted, or use idempotency or deduplication for an unknown commit outcome; neither HAProxy nor Patroni can safely replay it.

## Prove health and failover behavior

Before accepting production traffic, use a previously provisioned application login to test from the same network path applications use. The command below assumes that the `app` login role can connect to the `postgres` database:

```bash
psql "host=database-write.example.net port=5000 dbname=postgres user=app sslmode=verify-full sslrootcert=/etc/postgresql/tls/ca.pem" \
  -c "SELECT inet_server_addr(), pg_is_in_recovery(), current_setting('transaction_read_only');"
```

For a planned test, select a caught-up replica and perform a Patroni switchover:

```bash
patronictl -c /etc/patroni/patroni.yml switchover prod-ha \
  --leader pg1 --candidate pg2 --force
```

Then verify all of the following:

- `patronictl list` shows exactly one leader and two replicas.
- `/primary` moved to `pg2`, and a fresh connection through HAProxy's write endpoint reaches `pg2`.
- The former primary becomes a streaming replica rather than remaining writable.
- etcd still has a healthy majority and Patroni logs show normal leader-lock renewal.
- Monitoring alerts on replication lag, etcd leader changes, watchdog activation, HAProxy backend count, backup freshness, and timeline changes.

## Failure modes and recovery

| Symptom | Likely cause | Safe response |
| --- | --- | --- |
| All `/primary` checks return `503` | No Patroni leader, DCS unavailable, or PostgreSQL is not running as primary | Restore DCS quorum and inspect `patronictl list`; do not manually promote a random node |
| One etcd member is down | Quorum still exists, but no further member failure is tolerable | Recover or restart it if the failure is transient. If it is permanently failed, remove the old member first, add the replacement, and start it with `initial-cluster-state: existing` |
| Two etcd members are down | etcd has lost quorum and cannot update the leader key | Restart or recover one original member to regain quorum. If two members are permanently lost, restore a new cluster from a verified snapshot with `etcdutl`; runtime membership changes cannot repair lost quorum |
| A former primary has divergent WAL | It accepted writes on an older timeline | Keep it fenced and let Patroni use `pg_rewind`, or reinitialize it from a fresh base backup |
| Both HAProxy nodes are unavailable | The database may be healthy but has no client route | Recover a proxy or use a documented break-glass direct connection to the confirmed Patroni leader |
| A required watchdog cannot arm | Device, permissions, or driver is wrong | Fix the watchdog on a replica first; do not weaken fencing during an incident |

If bootstrap fails before the first cluster is accepted, preserve logs and determine whether Patroni wrote the initialize/config keys before retrying. Never delete a DCS namespace or data directory merely to make an existing cluster start. For an established cluster, rebuild only the failed replica with `patronictl reinit`; retain the current leader and at least one verified copy of the data.

A rewind that fails partway can leave the target data directory unrecoverable. Do not start it. Reinitialize that member from the current primary or restore a known-good backup. Transactions that existed only on a divergent former-primary timeline are not merged by `pg_rewind`.

## References

- [Patroni YAML configuration settings](https://patroni.readthedocs.io/en/latest/yaml_configuration.html)
- [Patroni dynamic configuration settings](https://patroni.readthedocs.io/en/latest/dynamic_configuration.html)
- [Patroni REST API](https://patroni.readthedocs.io/en/latest/rest_api.html)
- [Patroni security considerations](https://patroni.readthedocs.io/en/latest/security.html)
- [Patroni watchdog support](https://patroni.readthedocs.io/en/latest/watchdog.html)
- [etcd clustering guide](https://etcd.io/docs/v3.7/op-guide/clustering/)
- [etcd configuration options](https://etcd.io/docs/v3.7/op-guide/configuration/)
- [PostgreSQL `pg_rewind`](https://www.postgresql.org/docs/current/app-pgrewind.html)
- [PostgreSQL SSL/TLS support](https://www.postgresql.org/docs/current/ssl-tcp.html)
- [HAProxy configuration manual](https://docs.haproxy.org/3.4/configuration.html)
