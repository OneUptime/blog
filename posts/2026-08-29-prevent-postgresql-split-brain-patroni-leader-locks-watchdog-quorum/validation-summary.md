# Validation Summary: Preventing PostgreSQL Split Brain with Patroni

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- PostgreSQL streaming and synchronous replication
- Patroni high availability, leader election, dynamic configuration, DCS failsafe mode, REST API, and `patronictl`
- etcd v3, Raft consensus, leases, and quorum
- Linux watchdog devices and `wdctl`
- HAProxy TCP routing with HTTP health checks
- `pg_rewind`

## Sources Consulted
- [Patroni watchdog support](https://patroni.readthedocs.io/en/latest/watchdog.html)
- [Patroni dynamic configuration settings](https://patroni.readthedocs.io/en/latest/dynamic_configuration.html)
- [Patroni configuration rules](https://patroni.readthedocs.io/en/latest/patroni_configuration.html)
- [Patroni YAML configuration settings](https://patroni.readthedocs.io/en/latest/yaml_configuration.html)
- [Patroni replication modes](https://patroni.readthedocs.io/en/latest/replication_modes.html)
- [Patroni DCS failsafe mode](https://patroni.readthedocs.io/en/latest/dcs_failsafe_mode.html)
- [Patroni REST API](https://patroni.readthedocs.io/en/latest/rest_api.html)
- [Patroni command-line documentation](https://patroni.readthedocs.io/en/latest/patronictl.html)
- [Patroni HA implementation](https://github.com/patroni/patroni/blob/master/patroni/ha.py)
- [Patroni etcd v3 implementation](https://github.com/patroni/patroni/blob/master/patroni/dcs/etcd3.py)
- [etcd FAQ: quorum and failure tolerance](https://etcd.io/docs/v3.7/faq/)
- [etcd cluster-status checks](https://etcd.io/docs/v3.7/tasks/operator/how-to-check-cluster-status/)
- [PostgreSQL warm standby and failover](https://www.postgresql.org/docs/current/warm-standby-failover.html)
- [PostgreSQL log-shipping standby and synchronous replication](https://www.postgresql.org/docs/current/warm-standby.html)
- [PostgreSQL streaming replication protocol](https://www.postgresql.org/docs/current/protocol-replication.html)
- [PostgreSQL `pg_rewind`](https://www.postgresql.org/docs/current/app-pgrewind.html)
- [PostgreSQL WAL configuration](https://www.postgresql.org/docs/current/runtime-config-wal.html)
- [PostgreSQL recovery information functions](https://www.postgresql.org/docs/current/functions-admin.html)
- [PostgreSQL hot standby](https://www.postgresql.org/docs/current/hot-standby.html)
- [PostgreSQL client connection defaults](https://www.postgresql.org/docs/current/runtime-config-client.html)
- [HAProxy configuration manual](https://docs.haproxy.org/3.2/configuration.html#4.2-http-check%20connect)
- [Linux watchdog userspace API](https://docs.kernel.org/watchdog/watchdog-api.html)
- [`wdctl(8)` manual](https://man7.org/linux/man-pages/man8/wdctl.8.html)
- [util-linux `wdctl` implementation](https://github.com/util-linux/util-linux/blob/master/sys-utils/wdctl.c)

## Issues Found
- The role-enforcement and DCS-loss text treated leader-lock renewal failure as unconditionally causing demotion. Current Patroni can keep the primary running when optional `failsafe_mode` is enabled, the failure reflects DCS unavailability rather than a leader-key version/value/index mismatch, and every known member acknowledges it. The introduction, demotion explanation, watchdog-refresh description, failure test, and recovery table were qualified accordingly.
- The etcd endpoint discussion treated one configured endpoint as an ongoing single point of access. Patroni normally uses configured hosts for initial discovery and can then use discovered members. The text now distinguishes the startup/rediscovery dependency from a single proxy instance, which remains an ongoing access failure.
- The leader-race description called etcd leader-key acquisition generic compare-and-set behavior. It now describes Patroni's precise etcd v3 operation: an atomic create-if-absent transaction, protected by Raft quorum.
- The watchdog suspension window was ordered incorrectly and used “paused,” which can be confused with Patroni pause mode. Patroni renews the leader lock before sending the associated watchdog keepalive; suspension between those operations can move watchdog expiry past lock expiry. The explanation now reflects that ordering and says the Patroni process is suspended.
- The initial `wdctl` command was described as verifying device permissions. `wdctl` can fall back to sysfs without proving Patroni can activate the device, and it may open and arm the watchdog when sysfs is insufficient. The text now calls this inspection and confines `wdctl` use to a controlled watchdog test.
- The failover safeguards were stated too broadly. `check_timeline`, lag limits, and synchronous membership protect automatic promotion and healthy switchovers, but a leaderless manual failover can bypass them. The text now includes that limitation.
- The synchronous-replication explanation implied that all acknowledged transactions are remotely durable and that strict mode blocks all writes. The post now ties remote durability to a nonempty `synchronous_standby_names` and appropriate `synchronous_commit` values, explains that only commits requiring standby acknowledgment block, and notes that manual promotion of an asynchronous node can lose data.
- The etcd verification example used `endpoint status`, which reports member state but does not perform the consensus-proposal health test. It now uses `endpoint health --cluster` to verify that the endpoints can commit through quorum.
- The SQL result description treated `transaction_read_only=off` as an invariant of every primary. It now describes a normally writable primary and explicitly states that a hot-standby replica reports `on`.
- The recovery table treated an earlier timeline ID as proof of divergent WAL. An earlier timeline may instead be an ancestor of the current history. The table now distinguishes being behind from actual divergence and recommends `pg_rewind` only when histories diverged.

## Review Notes
- The examples match current Patroni 4.1.5, etcd 3.7, and PostgreSQL 18 documentation as reviewed on 2026-08-29.
- The HAProxy `http-check connect` and `http-check send` form is current and is available in HAProxy 2.2 and later.
- `patronictl edit-config --apply` merges the supplied settings; it does not remove unspecified existing dynamic settings. Operators should therefore inspect the existing configuration, including `failsafe_mode`, before applying the example file.
- Watchdog timeout granularity, device permissions, activation, disarming, and actual reset behavior are hardware- and driver-dependent and still require a controlled staging test.
