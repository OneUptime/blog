# Validation Summary: How to Give Apps One Stable PostgreSQL Endpoint with HAProxy and Keepalived

## Status
validated

## Post Type
Technical tutorial and high-availability deployment guide

## Technologies Covered

- PostgreSQL, `psql`, libpq connection strings, and TLS certificate verification
- Patroni leader election and REST API role health checks
- HAProxy 3.4 TCP proxying, HTTP health checks, backend state, and session shutdown
- Keepalived process tracking and virtual IP management
- VRRP, unicast advertisements, gratuitous ARP, and neighbor-cache convergence
- Linux networking, DNS, and systemd service reloads
- Kubernetes Services and platform load balancers as alternatives to floating VIPs

## Sources Consulted

- [Patroni REST API health-check endpoints](https://patroni.readthedocs.io/en/latest/rest_api.html#health-check-endpoints)
- [Patroni DCS failsafe mode](https://patroni.readthedocs.io/en/latest/dcs_failsafe_mode.html)
- [Patroni replication modes](https://patroni.readthedocs.io/en/latest/replication_modes.html)
- [HAProxy 3.4 configuration manual](https://docs.haproxy.org/3.4/configuration.html), including `http-check connect`, `http-check send`, `http-check expect`, `init-state`, `fall`, `rise`, and `on-marked-down`
- [HAProxy 3.4 management guide](https://docs.haproxy.org/3.4/management.html)
- [HAProxy health-check guidance](https://www.haproxy.com/documentation/haproxy-configuration-tutorials/reliability/health-checks/)
- [Keepalived `keepalived.conf(5)` reference](https://www.keepalived.org/documentation/keepalived-conf/)
- [Keepalived quick start](https://www.keepalived.org/documentation/user-guide/quick-start/)
- [RFC 9568: Virtual Router Redundancy Protocol Version 3](https://www.rfc-editor.org/rfc/rfc9568.html)
- [PostgreSQL libpq SSL/TLS support](https://www.postgresql.org/docs/current/libpq-ssl.html)
- [PostgreSQL libpq connection parameters and connection strings](https://www.postgresql.org/docs/current/libpq-connect.html)
- [PostgreSQL frontend/backend protocol termination](https://www.postgresql.org/docs/current/protocol-flow.html#PROTOCOL-FLOW-TERMINATION)
- [PostgreSQL transaction retry guidance](https://www.postgresql.org/docs/current/mvcc-serialization-failure-handling.html)
- [PostgreSQL error codes](https://www.postgresql.org/docs/current/errcodes-appendix.html)
- [PostgreSQL system information functions](https://www.postgresql.org/docs/current/functions-info.html) and [administration functions](https://www.postgresql.org/docs/current/functions-admin.html)
- [PostgreSQL `psql` reference](https://www.postgresql.org/docs/current/app-psql.html)
- [Linux `ip address` manual](https://man7.org/linux/man-pages/man8/ip-address.8.html)
- [Kubernetes Service documentation](https://kubernetes.io/docs/concepts/services-networking/service/)

## Issues Found

- HAProxy's backends had no safe initial state. Static servers could be eligible before their first Patroni role checks, briefly allowing a new HAProxy process to route a connection to a replica. Added `init-state fully-down` so each server remains unavailable until it passes the configured `rise 2` checks.
- The port explanation incorrectly said the accepted application connection goes to port `5432`. Corrected it to distinguish the HAProxy frontend on `5000`, PostgreSQL backends on `5432`, and Patroni health checks on `8008`.
- The TLS guidance mentioned only a certificate name match. `sslmode=verify-full` also requires a chain to a CA trusted by the client, so the certificate guidance now states that requirement.
- The retry guidance could be read as recommending blind replay after any disconnect. A connection loss around a write or `COMMIT` can leave the outcome unknown and make replay duplicate effects. The post now limits whole-transaction retries to known outcomes or idempotent/deduplicated operations.
- The Keepalived process-tracking explanation implied it detects any dead HAProxy. `vrrp_track_process` checks only for a matching process and cannot detect a hung process, broken listener, or failed database path. The wording now states that limitation.
- The unicast peer list selected advertisement destinations but did not enable inbound source validation. Added `check_unicast_src`, retained the network-policy warning, and identified unicast as Keepalived's mode rather than standard multicast VRRP behavior.
- The VRRP configuration did not mention avoiding an overlapping `virtual_router_id`. Added the requirement to choose a non-colliding VRID on the LAN while keeping the value aligned between the two proxies.
- The direct Patroni test targeted only `pg1` without explaining that a healthy replica correctly returns `503` from `/primary`. Clarified that `pg1` returns `200` only when it is primary and that probing all members should yield exactly one `200` in a healthy primary cluster.
- The interruption budget mentioned HAProxy's `fall` threshold but omitted `rise`; a newly promoted server must also pass the configured successful-check threshold. Corrected the timing description to include both.

## Review Notes

- The corrected HAProxy snippet passed `haproxy -c` with HAProxy 3.4.4.
- The corrected Keepalived snippet passed `keepalived --config-test` with Keepalived 2.3.3, and every used keyword is present in the current official configuration reference.
- `systemctl reload haproxy` is valid when the installed HAProxy systemd unit implements reload, as standard distribution packages normally do; custom units should be checked locally.
- The `30m` HAProxy client and server values are inactivity timeouts, so a completely idle database connection can be closed after that interval.
- Patroni's default asynchronous replication can permit transaction loss during database failover. The post does not promise zero data loss; deployments should select Patroni replication settings according to their recovery-point requirements.
- `enable_script_security` is valid but has no effect on `vrrp_track_process`; it matters only for configured scripts.
