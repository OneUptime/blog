# Validation Summary: Why Patroni Demotes a Primary When etcd Is Unavailable

## Status

validated

## Post Type

Operations guide and configuration tutorial

## Technologies Covered

- PostgreSQL
- Patroni 4.1.5
- Patroni DCS failsafe mode
- Patroni REST API and `patronictl`
- etcd 3.7 and `etcdctl`
- YAML and JSON configuration
- curl and jq
- HAProxy health checks
- Linux watchdog fencing

## Sources Consulted

- [Patroni DCS failsafe mode](https://patroni.readthedocs.io/en/latest/dcs_failsafe_mode.html)
- [Patroni dynamic configuration settings](https://patroni.readthedocs.io/en/latest/dynamic_configuration.html)
- [Patroni REST API](https://patroni.readthedocs.io/en/latest/rest_api.html)
- [Patroni `patronictl` documentation](https://patroni.readthedocs.io/en/latest/patronictl.html)
- [Patroni YAML and bootstrap configuration](https://patroni.readthedocs.io/en/latest/yaml_configuration.html)
- [Patroni security considerations](https://patroni.readthedocs.io/en/latest/security.html)
- [Patroni watchdog support](https://patroni.readthedocs.io/en/latest/watchdog.html)
- Patroni 4.1.5 source at commit `5f2c94c82a9cbea388c40451bdc8444683bae367`: [`ha.py`](https://github.com/patroni/patroni/blob/5f2c94c82a9cbea388c40451bdc8444683bae367/patroni/ha.py), [`api.py`](https://github.com/patroni/patroni/blob/5f2c94c82a9cbea388c40451bdc8444683bae367/patroni/api.py), [`request.py`](https://github.com/patroni/patroni/blob/5f2c94c82a9cbea388c40451bdc8444683bae367/patroni/request.py), and [`__main__.py`](https://github.com/patroni/patroni/blob/5f2c94c82a9cbea388c40451bdc8444683bae367/patroni/__main__.py)
- [PostgreSQL system administration and recovery functions](https://www.postgresql.org/docs/current/functions-admin.html)
- [PostgreSQL `transaction_read_only`](https://www.postgresql.org/docs/current/runtime-config-client.html#GUC-TRANSACTION-READ-ONLY)
- [PostgreSQL hot standby behavior](https://www.postgresql.org/docs/current/hot-standby.html)
- [etcd 3.7 cluster-status commands](https://etcd.io/docs/v3.7/tasks/operator/how-to-check-cluster-status/)
- [etcd 3.7 quorum and failure-tolerance FAQ](https://etcd.io/docs/v3.7/faq/)
- [etcd 3.7 monitoring guide](https://etcd.io/docs/v3.7/op-guide/monitoring/)
- [curl command-line manual](https://curl.se/docs/manpage.html)
- [jq manual](https://jqlang.org/manual/)

## Issues Found

- The `/health` example described the endpoint as proof that PostgreSQL accepts connections generally. It was narrowed to PostgreSQL being up and running because Patroni's check does not validate every external client path.
- The `/primary` explanation incorrectly required a currently held DCS leader lock. Patroni actually bases this endpoint on its local leadership state, which is refreshed after successful failsafe checks even when the DCS lock cannot be confirmed. The explanation and command comment now distinguish normal DCS-backed leadership from active failsafe leadership.
- The failsafe acknowledgement description implied that receiving members independently confirm the caller as the current DCS primary. In current Patroni, the leader contacts every other member in the cached topology; a receiver rejects if it is itself running PostgreSQL as primary, otherwise it returns `Accepted` and caches the caller-supplied leader information. The workflow and all-members wording were corrected accordingly.
- The limitation about an "unreachable database member" conflated PostgreSQL health with the required Patroni REST acknowledgement. It now states that a missing or rejected REST acknowledgement forces demotion; a member can acknowledge even when its local PostgreSQL is not running.
- The SQL note incorrectly implied that `pg_current_wal_lsn()` proves confirmed Patroni leadership. It only requires PostgreSQL not to be in recovery and cannot establish DCS authority. The note now states this and directs replica checks to be run separately.
- The TLS diagnosis incorrectly listed a REST server certificate whose name does not match the advertised address as a cause of Patroni's internal failsafe POST failing. Patroni 4.1.5 constructs its internal peer client with server-hostname verification disabled. The diagnosis now checks the actual failure points: network policy, peer Basic authentication, and required client-certificate validation.
- "Paused Patroni process" could be confused with Patroni maintenance pause mode, which disables the watchdog. It was changed to "suspended Patroni process or paused VM," matching the watchdog documentation.
- `/config` and `show-config` report global DCS configuration and do not prove that each process has consumed a change. Rollback verification now uses those interfaces for the DCS value and the per-member `patroni_failsafe_mode_enabled` metric for process-level confirmation.

## Review Notes

- The core split-brain rationale, cached `/failsafe` topology, all-recorded-members rule, compare/version conflict exclusion, `ttl` cache, and failure scenarios are correct.
- The `patronictl` commands, `PATCH /config` request, curl options, jq filter, default timeout values, and `loop_wait + 2 * retry_timeout <= ttl` constraint are current and syntactically valid.
- The etcd commands are valid. `--cluster` discovers advertised endpoints through a configured/reachable endpoint, so explicit `--endpoints` values may be needed when discovery itself is impaired.
- Current Patroni uses a two-second timeout and one retry for each parallel `POST /failsafe` request and accepts only HTTP `200` with body `Accepted`; this is an implementation detail that should be rechecked after Patroni upgrades.
- Shell and jq syntax were checked locally. The network-partition exercises appropriately remain staging-only fault-injection tests.
