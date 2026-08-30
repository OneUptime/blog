# Validation Summary: How to Exclude a Patroni Replica from Promotion While Keeping It Available for Reads

## Status

validated

## Post Type

Operational Guide / Configuration Tutorial

## Technologies Covered

- Patroni 4.1.5 member tags, leader elections, failover, switchover, and synchronous replication
- Patroni REST API and `patronictl`
- PostgreSQL 18 hot standby and streaming-replication monitoring
- HAProxy TCP backends with HTTP health checks
- YAML and shell commands

## Sources Consulted

- [Patroni YAML configuration settings and member tags](https://patroni.readthedocs.io/en/latest/yaml_configuration.html) - `nofailover`, `failover_priority`, `noloadbalance`, and `nosync` behavior, defaults, conflicts, and the quorum-mode limitation.
- [Patroni configuration overview](https://patroni.readthedocs.io/en/latest/patroni_configuration.html) - local, environment, and DCS-backed dynamic configuration scopes and reload behavior.
- [Patroni environment configuration](https://patroni.readthedocs.io/en/latest/ENVIRONMENT.html) - whole-configuration `PATRONI_CONFIGURATION` support and the absence of dedicated per-tag variables.
- [Patroni REST API](https://patroni.readthedocs.io/en/latest/rest_api.html) - `/replica`, lag parameters, `/patroni`, `/reload`, candidate checks, and manual-failover safety exceptions.
- [Patroni `patronictl` reference](https://patroni.readthedocs.io/en/latest/patronictl.html) - current `reload` and `list --extended` syntax and behavior.
- [Patroni replication modes](https://patroni.readthedocs.io/en/latest/replication_modes.html) - asynchronous, synchronous, and quorum-based replication behavior and `nosync` guidance.
- [Patroni 4.1.5 tag implementation](https://github.com/patroni/patroni/blob/v4.1.5/patroni/tags.py), [configuration validator](https://github.com/patroni/patroni/blob/v4.1.5/patroni/validator.py), and [HA implementation](https://github.com/patroni/patroni/blob/v4.1.5/patroni/ha.py) - priority conversion, accepted validator values, and candidate exclusion in the leader race.
- [HAProxy health-check documentation](https://www.haproxy.com/documentation/haproxy-configuration-tutorials/reliability/health-checks/) and [HAProxy configuration manual](https://docs.haproxy.org/3.3/configuration.html#4-http-check%20connect) - HTTP check sequences, alternate check ports, request construction, expected status, and check timing.
- [PostgreSQL hot standby](https://www.postgresql.org/docs/current/hot-standby.html), [client connection defaults](https://www.postgresql.org/docs/current/runtime-config-client.html), and [recovery information functions](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-RECOVERY-INFO-TABLE) - read-only recovery behavior, the scope of `transaction_read_only`, and `pg_is_in_recovery()`.
- [PostgreSQL replication statistics](https://www.postgresql.org/docs/current/monitoring-stats.html#MONITORING-PG-STAT-REPLICATION-VIEW) - `pg_stat_replication`, `pg_stat_wal_receiver`, and the direct-standby scope of sender-side statistics.
- [PostgreSQL `psql` reference](https://www.postgresql.org/docs/current/app-psql.html) - connection-string and `-c` command syntax.

## Issues Found

1. **The SQL result was described as a role-level transaction default.** `current_setting('transaction_read_only')` reports the current transaction's read-only state, and PostgreSQL forces it on during hot standby regardless of the connecting role. Changed the expected result to the exact value `current_setting('transaction_read_only') = 'on'`.
2. **Negative `failover_priority` values were presented without the current validator conflict.** Patroni's documentation and runtime treat a nonpositive priority as non-promotable, but Patroni 4.1.5's configuration validator requires an integer of at least zero. Changed the operational guidance to use zero and documented the validator discrepancy.
3. **The `failover_priority` discussion omitted its current quorum-mode limitation.** Patroni 4.1.5 does not apply positive priority ordering with quorum-based synchronous replication. Added that limitation while preserving the documented fact that `failover_priority: 0` maps to non-promotable behavior.
4. **The monitoring guidance assumed every replica connects directly to the primary.** `pg_stat_replication` lists only directly connected standbys, so a cascading replica appears on its immediate upstream rather than necessarily on the primary. Changed the guidance to inspect the direct upstream, usually the primary.
5. **The environment-variable wording was too broad.** Core Patroni 4.1.5 does not provide dedicated `PATRONI_TAGS_*` variables. Clarified that an environment-only deployment can supply tags through the whole-configuration `PATRONI_CONFIGURATION` variable.

## Review Notes

- The central policy is correct: `nofailover: true` prevents Patroni promotion while the default/explicit `noloadbalance: false` keeps an otherwise healthy replica eligible for `/replica` read routing.
- The YAML snippets, `patronictl reload` and `list --extended` commands, REST calls, `psql` invocation, and HAProxy configuration are syntactically valid and use current, non-deprecated interfaces. The shown HAProxy `http-check connect`/`send` sequence requires HAProxy 2.2 or later.
- Patroni's documented candidate checks and the relaxed lag, timeline, and synchronous-member checks for a manual failover without a leader are described accurately; `nofailover` remains an eligibility check.
- `nosync` is correctly presented as separate from promotion eligibility, and the warning not to combine `nofailover` with `failover_priority` matches the current configuration reference.
- Patroni 4.1.5 has an internal inconsistency for negative priority values: the prose documentation and runtime tag conversion accept them, while `patroni --validate-config` rejects them. The post now recommends the unambiguous, validator-safe value `0`.
- All links in the post resolve to the intended official documentation pages.
- No live Patroni cluster was available for an end-to-end promotion exercise; behavior was cross-checked against Patroni 4.1.5 documentation and source.
