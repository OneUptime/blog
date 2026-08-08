# Debug PostgreSQL Standby Connection Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Streaming Replication, Standby, HBA Configuration, TLS, Primary Connection Info

Description: Trace a PostgreSQL standby connection failure through recovery state, networking, HBA rules, role privileges, TLS, credentials, slots, and WAL.

---

A PostgreSQL standby that cannot connect is rarely fixed by changing every replication setting at once. The WAL receiver follows a specific path: the server must be in standby mode, resolve and reach the upstream address, negotiate TLS if requested, match the first applicable `pg_hba.conf` rule, authenticate a role with `LOGIN` and either `REPLICATION` or `SUPERUSER`, start a WAL sender, select the configured slot if any, and request WAL that still exists.

Work through those layers in order. Keep the first error from both the standby and upstream logs, because later retries often replace a precise authentication or certificate failure with repetitive reconnect noise.

## Start by Proving the Node Is Still a Standby

If the standby has reached consistent recovery and accepts read-only connections with `hot_standby = on`, run locally on the affected node. Otherwise, start with its logs because these SQL checks are unavailable:

```sql
SELECT pg_is_in_recovery() AS is_standby,
       pg_last_wal_receive_lsn() AS receive_lsn,
       pg_last_wal_replay_lsn() AS replay_lsn,
       pg_last_xact_replay_timestamp() AS last_xact_replay_timestamp;
```

If `pg_is_in_recovery()` is false, there should be no physical WAL receiver. The node may have been promoted, may have started without `standby.signal`, or may be the wrong endpoint. Do not recreate `standby.signal` on a node that accepted writes after promotion. Its timeline may have diverged, requiring `pg_rewind` or a new base backup after the old writer is fenced.

If it is in recovery, inspect the receiver:

```sql
SELECT pid,
       status,
       receive_start_lsn,
       receive_start_tli,
       written_lsn,
       flushed_lsn,
       received_tli,
       last_msg_send_time,
       last_msg_receipt_time,
       latest_end_lsn,
       latest_end_time,
       slot_name,
       sender_host,
       sender_port,
       conninfo
FROM pg_stat_wal_receiver;
```

This view has one row only while a WAL receiver exists. No row means it is not running at that instant, not that the network is necessarily down. Read the standby log for its last start and retry error.

## Confirm Which Configuration PostgreSQL Loaded

Do not assume the file you edited is active. Inspect setting sources:

```sql
SELECT name,
       setting,
       source,
       sourcefile,
       sourceline,
       pending_restart
FROM pg_settings
WHERE name IN (
    'primary_conninfo',
    'primary_slot_name',
    'restore_command',
    'recovery_target_timeline',
    'wal_retrieve_retry_interval'
)
ORDER BY name;
```

Treat `primary_conninfo` as sensitive. It can contain a password, and privileged users may be able to see it. Redact it from tickets and monitoring output.

A secure example is:

```conf
primary_conninfo = 'host=primary-db.internal port=5432 user=replicator application_name=standby_a sslmode=verify-full gssencmode=disable sslrootcert=/etc/postgresql/certs/root.crt passfile=/etc/postgresql/replication.pass connect_timeout=5'
primary_slot_name = 'standby_a_slot'
recovery_target_timeline = 'latest'
```

The host and port must name the upstream **sending server**. In cascading replication that may be another standby, not the original primary.

PostgreSQL documents `primary_conninfo` as reloadable: when it changes while the WAL receiver runs, that process is signaled to stop and is expected to restart with the new setting, except when `primary_conninfo` is an empty string. Request a reload, then re-query `pg_settings` to confirm the applied values and check the server log:

```sql
SELECT pg_reload_conf();
```

Some other replication settings require a server restart. Check `pg_settings.context` before assuming a reload is enough.

## Test Name Resolution and TCP Reachability from the Standby Host

Run network tests as close as possible to the PostgreSQL service environment. Containers, network namespaces, service DNS, and firewall policy can differ from an administrator's shell.

```sh
getent ahosts primary-db.internal
nc -vz primary-db.internal 5432
pg_isready -h primary-db.internal -p 5432 -t 5
```

Use platform-equivalent tools if these are unavailable. `pg_isready` reports whether a PostgreSQL server responds; it does not prove that the replication role, HBA rule, TLS identity, slot, or requested WAL is valid.

Interpret failures narrowly:

- name lookup failure: fix DNS or the configured host;
- timeout: inspect routing, security groups, firewall, load balancer, and whether the server listens on that interface;
- connection refused: nothing is accepting at that address and port, or an active reject is present;
- `pg_isready` reports rejecting connections: the server is reachable but is in a state that disallows connections, such as startup, shutdown, or crash recovery; inspect its state and logs;
- a `FATAL` from the actual standby connection: transport worked, so follow the specific error through HBA, role, or capacity.

Avoid pointing physical replication through a generic SQL connection pooler unless that product explicitly supports the streaming replication protocol and preserves long-lived sessions.

## Verify the Upstream Is Listening and Can Send WAL

On the intended upstream:

```sql
SELECT inet_server_addr(), inet_server_port();

SHOW listen_addresses;
SHOW port;
SHOW wal_level;
SHOW max_wal_senders;
SHOW max_replication_slots;
```

`inet_server_addr()` and `inet_server_port()` describe the endpoint on which the current SQL session was accepted and return null for a Unix-domain socket connection; they do not enumerate every listening interface.

Remote TCP connections require `listen_addresses` to cover the desired interface. Physical streaming requires `wal_level = replica` or higher and an available WAL sender. `max_wal_senders = 0` disables replication connections.

Check actual sender use:

```sql
SELECT pid,
       usename,
       application_name,
       client_addr,
       state,
       sent_lsn,
       flush_lsn,
       replay_lsn,
       sync_state,
       reply_time
FROM pg_stat_replication
ORDER BY application_name;
```

`max_wal_senders` also covers streaming base backups. Leave headroom for reconnects because PostgreSQL notes that an abruptly disconnected client can temporarily leave a sender slot occupied until timeout.

## Validate the Replication Role

On the upstream:

```sql
SELECT rolname,
       rolsuper,
       rolcanlogin,
       rolreplication,
       rolvaliduntil
FROM pg_roles
WHERE rolname = 'replicator';
```

For a physical replication connection, the role always needs `LOGIN`; it also needs `REPLICATION` unless it is a superuser. Do not make it superuser to bypass diagnosis:

```sql
ALTER ROLE replicator WITH LOGIN REPLICATION;
```

Set or rotate its password through the organization's secret-management process. For password authentication, an expired `rolvaliduntil`, wrong password, or password stored with an authentication format unsupported by an old client can all block login.

Logical replication differs here: its connection names a real database and the role also needs table access for initial copy. A physical replication HBA rule using the special database field `replication` does not match a logical replication connection.

## Make `pg_hba.conf` Match the Real Source Address

A narrow TLS rule for one standby might be:

```conf
# TYPE     DATABASE      USER          ADDRESS          METHOD
hostssl    replication   replicator    10.20.30.41/32   scram-sha-256
```

The `replication` database keyword matches physical replication requests. Quote it and it loses that special meaning. Use the source IP observed by the upstream, which may be a NAT address rather than the standby interface you expected.

HBA evaluation is first-match only. PostgreSQL does not fall through to a later rule when authentication under an earlier matching rule fails. Inspect the current file contents in evaluation order. The query below uses `rule_number`, available in PostgreSQL 16 and later; on PostgreSQL 15 and earlier, omit that column and order by `line_number`:

```sql
SELECT rule_number,
       line_number,
       type,
       database,
       user_name,
       address,
       netmask,
       auth_method,
       options,
       error
FROM pg_hba_file_rules
ORDER BY rule_number NULLS LAST, line_number;
```

`pg_hba_file_rules` reads the current file contents, which can differ from the last successfully loaded configuration. Rows with non-null `error` identify rules PostgreSQL could not parse. Confirm the active file, reload it, and check the server log:

```sql
SHOW hba_file;
SELECT pg_reload_conf();
SELECT pg_conf_load_time();
```

On Unix-like systems, HBA changes require a reload; PostgreSQL handles Windows changes differently as documented. Check the log for reload errors before retrying.

Do not use `0.0.0.0/0 trust` as a connectivity test. It broadens access and removes authentication at exactly the moment the endpoint is being investigated.

## Validate Password File Lookup

PostgreSQL allows a physical standby password in `primary_conninfo` or a password file. Prefer an absolute `passfile` path with ownership and mode restricted to the PostgreSQL service account. A physical replication entry uses `replication` in the database field:

```text
primary-db.internal:5432:replication:replicator:REDACTED_SECRET
```

On Unix, libpq ignores a password file whose permissions allow group or world access. Set it to owner read/write only:

```sh
chmod 0600 /etc/postgresql/replication.pass
```

The password-file host and port must match the values libpq uses. A DNS alias in `primary_conninfo` will not match a different canonical hostname in the password file. Escape literal colons and backslashes according to the password-file documentation.

Do not print the file or embed its secret in diagnostic command history. Test with a short-lived, redacted procedure run as the PostgreSQL service user.

## Diagnose TLS as Identity, Trust, and Transport

`hostssl` matches only SSL connections and requires server-side SSL to be enabled. On the upstream:

```sql
SHOW ssl;
SHOW ssl_cert_file;
SHOW ssl_key_file;
SHOW ssl_ca_file;
```

For production replication, `sslmode=verify-full` both verifies the certificate chain and checks the requested host against the certificate identity. `sslmode=require` encrypts but does not provide the same server-identity guarantee. Libpq prefers GSSAPI encryption when it is available regardless of `sslmode`; when policy specifically requires TLS and a `hostssl` rule, set `gssencmode=disable` as in the earlier example.

Common failures have different fixes:

- certificate verify failed: the standby does not trust the issuing CA, the chain is incomplete, or certificate validity dates fail;
- hostname mismatch: `primary_conninfo` uses an IP or alias absent from the certificate names;
- server does not support SSL: the endpoint is wrong or upstream SSL is not enabled;
- no HBA entry for SSL off/on: connection encryption does not match `hostssl` or `hostnossl` rules;
- client certificate required: configure `sslcert` and a protected `sslkey`, plus any username mapping required by HBA policy.

After a successful connection appears, confirm encryption on the upstream by joining sender and SSL state:

```sql
SELECT r.application_name,
       r.client_addr,
       s.ssl,
       s.version,
       s.cipher,
       s.bits,
       s.client_dn,
       s.issuer_dn
FROM pg_stat_replication AS r
JOIN pg_stat_ssl AS s ON s.pid = r.pid
ORDER BY r.application_name;
```

## Check the Physical Replication Slot

If `primary_slot_name` is set, the named physical slot must exist on the connected upstream. The query below uses `inactive_since` and `invalidation_reason`, available in PostgreSQL 17 and later; omit those columns on older releases:

```sql
SELECT slot_name,
       slot_type,
       temporary,
       active,
       active_pid,
       restart_lsn,
       wal_status,
       safe_wal_size,
       inactive_since,
       invalidation_reason
FROM pg_replication_slots
WHERE slot_name = 'standby_a_slot';
```

It must be a physical slot. If another PID is active on it, determine whether a duplicate standby or stale session owns it. Do not terminate that PID until topology ownership is proven.

If the slot is absent, create it only after confirming the standby's configuration and retention budget:

```sql
SELECT *
FROM pg_create_physical_replication_slot('standby_a_slot', true);
```

The `true` argument reserves the slot's LSN immediately, so WAL retention starts immediately; it cannot restore WAL that was already removed. Monitor it and drop it if the planned standby is abandoned.

## A Connection Can Succeed but WAL Retrieval Can Still Fail

Errors such as these occur after authentication:

```text
requested WAL segment ... has already been removed
requested starting point ... is ahead of the WAL flush position
requested timeline ... is not a child of this server's history
```

If the connected upstream removed required WAL, the standby can continue only if another valid source, typically `restore_command` backed by a WAL archive, can supply it. If no source has the missing WAL, take a new base backup. Increasing `wal_keep_size` after removal cannot recreate old segments.

A permanent physical slot prevents required WAL removal while usable, but unlimited slot retention can fill `pg_wal`. Use `max_slot_wal_keep_size`, filesystem alerts, and slot lifecycle management according to the desired tradeoff.

Timeline errors usually follow failover or an incorrect upstream choice. `recovery_target_timeline = 'latest'` is the default and allows a standby to follow timeline changes in the history it shares. It cannot merge a node that accepted independent writes. Fence the old primary, then use `pg_rewind` when its prerequisites and required WAL are satisfied, or rebuild it.

## Error-to-Layer Map

| Symptom | Layer to inspect first |
| --- | --- |
| Name or service not known | DNS and configured host |
| Connection timed out | Routing, firewall, endpoint, listen address |
| Connection refused | Port, process, interface, load balancer |
| No `pg_hba.conf` entry | Connection type, source address, database keyword, rule order |
| Password authentication failed | Role, password source, passfile match, expiry |
| Must be superuser or replication role | `LOGIN`, plus `REPLICATION` or `SUPERUSER` |
| Certificate verify or hostname error | CA chain, validity, requested host, certificate names |
| Replication slot does not exist or is active | `primary_slot_name` and slot ownership |
| Requested WAL removed | Archive availability, slot/retention policy, re-seed |
| Timeline history error | Failover topology, fencing, rewind or rebuild |

## Verify Recovery End to End

On the upstream, the standby should have one sender row with the expected `application_name`, source address, TLS state, and eventually `streaming` state. On the standby, `pg_stat_wal_receiver` should identify the expected sender and both receive and replay LSNs should move under write activity.

On a queryable hot standby, make a harmless canary transaction on the actual writer and verify it becomes visible in a new query snapshot after replay. Then check that archive fallback, slot retention, monitoring, and automatic reconnect still behave under a controlled restart. A connected socket is only the first half of recovery.

## Official Documentation

- [PostgreSQL standby server operation and streaming replication](https://www.postgresql.org/docs/current/warm-standby.html)
- [PostgreSQL replication configuration including `primary_conninfo`](https://www.postgresql.org/docs/current/runtime-config-replication.html)
- [PostgreSQL `pg_hba.conf`](https://www.postgresql.org/docs/current/auth-pg-hba-conf.html)
- [PostgreSQL role attributes](https://www.postgresql.org/docs/current/role-attributes.html)
- [PostgreSQL libpq SSL support](https://www.postgresql.org/docs/current/libpq-ssl.html)
- [PostgreSQL libpq password file](https://www.postgresql.org/docs/current/libpq-pgpass.html)
- [PostgreSQL replication monitoring views](https://www.postgresql.org/docs/current/monitoring-stats.html#MONITORING-STATS-VIEWS)
- [PostgreSQL `pg_rewind`](https://www.postgresql.org/docs/current/app-pgrewind.html)

## Conclusion

Debug a standby connection from the inside out: confirm recovery mode and loaded settings, prove DNS and TCP reachability, validate the upstream listener and WAL sender capacity, then check role, first-match HBA, credentials, TLS identity, slot ownership, WAL availability, and timeline. Preserve errors from both sides and change one layer at a time so a secure configuration remains secure when streaming returns.
