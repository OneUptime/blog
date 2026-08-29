# Validation Summary: HAProxy Health Checks for Patroni Primary and Replica Endpoints

## Status

validated

## Post Type

Technical configuration tutorial and high-availability operations guide

## Technologies Covered

- HAProxy 3.4 TCP proxying, HTTP health checks, Runtime API, TLS checks, and graceful reloads
- Patroni 4.1.5 REST health endpoints, leader-lock behavior, replica lag checks, tags, pause mode, and `patronictl`
- PostgreSQL 18 hot standby, recovery state, transaction read-only state, and libpq TLS verification
- curl, psql, systemd, socat, and awk operational commands

## Sources Consulted

- [Patroni REST API health-check endpoints](https://patroni.readthedocs.io/en/latest/rest_api.html#health-check-endpoints)
- [Patroni YAML REST API and tag settings](https://patroni.readthedocs.io/en/latest/yaml_configuration.html)
- [Patroni security considerations](https://patroni.readthedocs.io/en/latest/security.html)
- [Patroni 4.1.5 REST implementation](https://github.com/patroni/patroni/blob/v4.1.5/patroni/api.py)
- [Patroni configuration reload behavior](https://patroni.readthedocs.io/en/latest/patroni_configuration.html)
- [Patronictl switchover documentation](https://patroni.readthedocs.io/en/latest/patronictl.html#patronictl-switchover)
- [Patroni standby-cluster documentation](https://patroni.readthedocs.io/en/latest/standby_cluster.html)
- [HAProxy 3.4 configuration manual](https://docs.haproxy.org/3.4/configuration.html)
- [HAProxy 3.4 management guide](https://docs.haproxy.org/3.4/management.html)
- [HAProxy health-check tutorial](https://www.haproxy.com/documentation/haproxy-configuration-tutorials/reliability/health-checks/)
- [HAProxy server-side TLS documentation](https://www.haproxy.com/documentation/haproxy-configuration-tutorials/security/ssl-tls/server-side-encryption/)
- [HAProxy Runtime API `show stat` reference](https://www.haproxy.com/documentation/haproxy-runtime-api/reference/show-stat/)
- [PostgreSQL libpq connection strings](https://www.postgresql.org/docs/current/libpq-connect.html)
- [PostgreSQL libpq SSL verification](https://www.postgresql.org/docs/current/libpq-ssl.html)
- [PostgreSQL hot standby](https://www.postgresql.org/docs/current/hot-standby.html)
- [PostgreSQL recovery information functions](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-RECOVERY-INFO)
- [PostgreSQL `transaction_read_only` setting](https://www.postgresql.org/docs/current/runtime-config-client.html#GUC-TRANSACTION-READ-ONLY)
- [curl command-line manual](https://curl.se/docs/manpage.html)

## Issues Found

- The post originally described `/primary` as requiring the leader lock without qualification. Patroni 4.1.5 has a pause-mode exception: when cluster data is unavailable from DCS, `/primary`, `/leader`, and `/standby-leader` use the local PostgreSQL role. The introduction now limits the normal lock guarantee to unpaused operation and warns against relying on these endpoints for split-brain protection in that maintenance state.
- The lag table said the lag must be below the threshold. Patroni's comparison is inclusive, so lag equal to the configured maximum passes. The table and explanation now say the computed replay lag must not exceed the threshold.
- The lag explanation attributed the reference position only to DCS. Current Patroni uses the greater of the last leader LSN known through DCS and the WAL receiver's latest end LSN, then compares it with the replayed LSN. The explanation now reflects that implementation.
- The `/liveness` row implied that `200` always proves a recent HA-loop run. Patroni returns `200` while paused even if the loop is stale. The row now includes the pause-mode behavior and role-specific liveness window.
- On a fresh HAProxy start, the original configuration could make unchecked servers eligible before the first role check. Both backends now use `init-state fully-down`, requiring each server to satisfy `rise 2` before receiving traffic.
- Patroni's REST allowlist was presented as restricting the listener generally, but it applies only to unsafe methods. The security guidance now assigns health-endpoint network restriction to firewalls or network policy and states the allowlist's actual scope.
- The TLS guidance tied certificate identity to the destination address. HAProxy validates a certificate name against SNI or `verifyhost`, and an explicit `http-check connect` prevents HAProxy 3.4 from deriving check SNI from the HTTP Host header. The guidance now specifies SAN, `verify required`, `ca-file`, SNI, and `verifyhost` requirements.
- TLS failures were grouped with Layer 4 failures. HAProxy reports TLS negotiation and verification problems at Layer 6. The troubleshooting text now separates Layer 4 connection failures, Layer 6 TLS failures, and Layer 7 HTTP status failures.
- The switchover test required a brief interval with zero eligible write servers. With `fall 3`, `rise 2`, and staggered checks, HAProxy can transiently show zero or both cached server states as eligible. The test now requires eventual convergence to exactly one new eligible server instead of a specific intermediate state.
- The end-to-end check implied that `/primary` itself guarantees `transaction_read_only = off`. That setting is session/transaction configuration. The text now treats `off` as an acceptance requirement for a session intended to write.
- The PostgreSQL TLS reference pointed to server-side TLS setup while the related claim concerns libpq hostname verification. It now links to the official libpq SSL documentation.

## Review Notes

- The corrected complete HAProxy configuration was extracted from the post and accepted by `haproxy -c` using the official HAProxy 3.4.4 image.
- `init-state` requires HAProxy 3.1 or later. The linked configuration manual and validated example target HAProxy 3.4.
- Patroni's `/quorum` endpoint depends on quorum-based synchronous replication introduced in Patroni 4.0; older Patroni installations do not provide that functionality.
- The `patronictl switchover` options, psql connection strings, curl loop, HAProxy Runtime API field positions, timeout explanations, and tag behavior were verified as correct.
- `systemctl reload haproxy` assumes the installed service unit implements HAProxy's standard graceful reload behavior.
