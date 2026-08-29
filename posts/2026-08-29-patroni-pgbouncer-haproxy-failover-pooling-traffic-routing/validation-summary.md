# Validation Summary: Patroni, PgBouncer, and HAProxy: Failover, Pooling, and Routing

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- PostgreSQL
- Patroni 4.1.5
- PgBouncer 1.25.2
- HAProxy 3.4.4
- Distributed configuration stores such as etcd
- `patronictl`, `psql`, and `curl`

## Sources Consulted

- [Patroni REST API](https://patroni.readthedocs.io/en/latest/rest_api.html)
- [Patroni introduction and DCS requirements](https://patroni.readthedocs.io/en/latest/README.html)
- [Patroni dynamic configuration](https://patroni.readthedocs.io/en/latest/dynamic_configuration.html)
- [Patroni `patronictl` documentation](https://patroni.readthedocs.io/en/latest/patronictl.html)
- [Patroni automatic-failover FAQ](https://patroni.readthedocs.io/en/latest/faq.html#automatic-failover)
- [Patroni 4.1.5 REST API implementation](https://github.com/patroni/patroni/blob/v4.1.5/patroni/api.py#L343-L365)
- [Patroni issue #3603: leader can remain in recovery](https://github.com/patroni/patroni/issues/3603)
- [PgBouncer features and pooling modes](https://www.pgbouncer.org/features.html)
- [PgBouncer configuration](https://www.pgbouncer.org/config.html)
- [PgBouncer administration commands](https://www.pgbouncer.org/usage.html)
- [PgBouncer failover FAQ](https://www.pgbouncer.org/faq.html)
- [PgBouncer changelog](https://www.pgbouncer.org/changelog.html)
- [HAProxy 3.4 configuration manual](https://docs.haproxy.org/3.4/configuration.html)
- [HAProxy health-check documentation](https://www.haproxy.com/documentation/haproxy-configuration-tutorials/reliability/health-checks/)
- [PostgreSQL recovery control functions](https://www.postgresql.org/docs/current/functions-admin.html)
- [PostgreSQL hot-standby behavior](https://www.postgresql.org/docs/current/hot-standby.html)
- [PostgreSQL client connection settings](https://www.postgresql.org/docs/current/runtime-config-client.html)

## Issues Found

1. Pattern A did not terminate established application streams when HAProxy marked the old node down. HAProxy normally applies a health-state change only to new connections, so an existing stream could remain pinned to the old node's PgBouncer after its local PostgreSQL changed role. Added `on-marked-down shutdown-sessions` to all three Pattern A `default-server` directives and documented the deliberate connection interruption.

2. The post presented Patroni's `/primary` endpoint as proof that PostgreSQL was already promoted and writable. Although that is the documented endpoint condition, Patroni 4.1.5 derives the response from its local leader state without independently checking `pg_is_in_recovery()`. Updated the failover sequence and endpoint guidance to describe `/primary` as a role-routing signal and retained the end-to-end SQL readiness probe.

3. The primary-crash row implied that every PostgreSQL process crash immediately triggers election and promotion. Patroni can first attempt local recovery for `primary_start_timeout`, which defaults to 300 seconds. Corrected the failover sequence and failure table to make promotion conditional on lock release or expiry and an eligible replica.

4. The failover sequence implied that HAProxy routing changed immediately. The shown `fall 3` and `rise 2` settings require consecutive failed and successful checks. Updated the sequence to state that routing changes after those thresholds are met.

5. The `RECONNECT` guidance described idle server connections as waiting to be released, even though idle connections are already released. It also omitted that gradual replacement can temporarily mix old and new destinations. Corrected the idle/active connection semantics and documented `PAUSE` for a controlled write switchover that must move all server connections together.

6. The Patroni `503` explanation was too narrow, and the lag condition incorrectly said strictly below the configured threshold. Corrected it to cover role, PostgreSQL state, tag, and lag failures, and changed the lag wording to “does not exceed” the threshold.

7. Clarified that protocol-level prepared statements in transaction pooling require a nonzero `max_prepared_statements`, and replaced wording that could imply every autocommit statement needs explicit `BEGIN`/`COMMIT` with the precise requirement that explicit transactions reach `COMMIT` or `ROLLBACK`.

No other technical issues were found after these corrections.

## Review Notes

- The amended HAProxy snippets were checked with HAProxy 3.4.4; the exact complete configuration passed `haproxy -c` validation. The multi-connection health check, HTTP/1.1 `Host` header, query-string URI, TCP listener check, and `on-marked-down shutdown-sessions` placement are valid.
- PgBouncer enabled protocol-level prepared-statement tracking by default in 1.24 by setting `max_prepared_statements` to 200. The post's current configuration is therefore valid for PgBouncer 1.25.2 even though it does not set the option explicitly.
- `on-marked-down shutdown-sessions` intentionally interrupts in-flight work when a backend reaches `DOWN`; the post's application retry and ambiguous-commit warnings remain essential.
- No deprecated commands or configuration keys were found in the corrected snippets.
