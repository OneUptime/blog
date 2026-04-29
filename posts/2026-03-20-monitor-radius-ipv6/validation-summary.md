# Validation Summary: How to Monitor RADIUS Servers for IPv6

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- FreeRADIUS 3.0.x (status server, dictionary attributes)
- RADIUS protocol (Status-Server, Access-Request/Accept/Reject)
- IPv6 (Framed-IPv6-Prefix, Delegated-IPv6-Prefix, NAS-IPv6-Address)
- Prometheus (textfile collector, scrape config, alerting rules)
- `freeradius_exporter` (bvantagelimited)
- Grafana (PromQL queries)
- MySQL / FreeRADIUS SQL schema (`radacct`, `radpostauth` tables)
- Redis (rlm_redis_ippool keys)
- `radclient` CLI tool

## Sources Consulted
- FreeRADIUS server statistics docs: https://github.com/FreeRADIUS/freeradius-server/blob/master/doc/antora/modules/howto/pages/optimization/monitoring/statistics.adoc
- FreeRADIUS Status wiki: https://wiki.freeradius.org/config/Status
- bvantagelimited/freeradius_exporter README: https://github.com/bvantagelimited/freeradius_exporter
- FreeRADIUS dictionary file (share/dictionary/radius/v3/dictionary.freeradius)

## Issues Found

1. **Incorrect `FreeRADIUS-Statistics-Type` values.** The original post listed "8 = Client statistics", which is wrong. According to the official FreeRADIUS documentation, the bitmask values are:
   - 1 = Authentication
   - 2 = Accounting
   - 4 = Proxy Auth
   - 8 = Proxy Accounting
   - 16 = Internal
   - 32 = Client
   - 64 = Server
   - 128 = Home Server
   Replaced the comment block with the full, correct list and noted that the values combine as a bitmask.

2. **Incorrect `freeradius_exporter` configuration format.** The original post showed a YAML config file (`listen_address`, `radius_status_server`, `stats_type`) passed via `--config`. The `bvantagelimited/freeradius_exporter` is configured via command-line flags (`-radius.address`, `-radius.secret`, `-radius.timeout`, `-web.listen-address`) and environment variables — there is no `stats_type` option, and the YAML schema shown does not match the project. Replaced the config file approach with the documented `go install` command and the correct command-line flag invocation.

## Review Notes
- The custom textfile collector script names metrics `radius_*` (e.g., `radius_auth_requests_total`); these names are consistent across the script, alerting rules, and Grafana queries. Note that they are *not* the metric names exposed by `freeradius_exporter` (which uses the `freeradius_total_access_*` family). If readers swap the textfile collector for the exporter, they'll need to rewrite the alert/Grafana expressions to match — worth flagging in a future revision but not a correctness error today.
- The `radacct` columns (`nasipv6address`, `framedipv6prefix`, `delegatedipv6prefix`, `acctstoptime`, `acctstarttime`, `acctinputoctets`, `acctoutputoctets`) and `radpostauth` columns (`username`, `reply`, `authdate`) match the FreeRADIUS 3.0.x SQL schema for MySQL.
- `radclient -x [::1]:18121 status mysecret` syntax is correct (bracketed IPv6 literal, `status` packet type, `-x` for verbose output).
- The status virtual server config matches FreeRADIUS 3.0 syntax (`server status { listen { type = status ... } }`).
- The Prometheus alerting rules and PromQL expressions are syntactically valid.
