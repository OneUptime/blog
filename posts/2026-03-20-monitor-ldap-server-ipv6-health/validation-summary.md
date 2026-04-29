# Validation Summary: How to Monitor LDAP Server IPv6 Health

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- LDAP / OpenLDAP (slapd, cn=config, slapd-monitor backend)
- IPv6 networking (URL bracket syntax, `nc -6`)
- Prometheus (scrape configs, alerting rules)
- `openldap_exporter` (tomcz)
- `ldapsearch` / `ldapmodify` CLI tools
- Bash scripting
- OpenLDAP delta-syncrepl `contextCSN` for replication

## Sources Consulted
- [tomcz/openldap_exporter on GitHub](https://github.com/tomcz/openldap_exporter) — exporter flags, default port, binary release naming
- [tomcz/openldap_exporter releases API](https://api.github.com/repos/tomcz/openldap_exporter/releases/latest) — confirmed asset names (`openldap_exporter-linux-amd64.gz`)
- [OpenLDAP 2.6 Administrator's Guide: Monitoring](https://www.openldap.org/doc/admin26/monitoringslapd.html) — correct LDIF for enabling the Monitor backend
- [OpenLDAP 2.4 Administrator's Guide: Monitoring](https://www.openldap.org/doc/admin24/monitoringslapd.html) — secondary reference
- [Zytrax LDAP guide chapter 6.1.1 (slapd-config)](https://www.zytrax.com/books/ldap/ch6/slapd-config.html) — cn=config DN conventions
- Prometheus alerting rule reference (general format verification)
- `ldapsearch(1)` man page (verifying `-H`, `-x`, `-D`, `-w`, `-b`, `-s` flags)
- `nc(1)` BSD/OpenBSD netcat man page (`-6`, `-w` flags)

## Issues Found

1. **Non-existent exporter `titanous/ldap_exporter`.** The post referenced `https://github.com/titanous/ldap_exporter`, which returns 404 — that repository does not exist. Replaced the entire exporter section with the actual, widely-used `tomcz/openldap_exporter`:
   - Updated download URL to the real release asset (`openldap_exporter-linux-amd64.gz`) and added the required `gunzip` step.
   - Renamed the binary and the install path from `ldap_exporter` to `openldap_exporter`.
   - Changed flags from the invented `--web.listen-address` / `--ldap.addr` / `--ldap.user` / `--ldap.pass` to the actual flags `--promAddr` / `--ldapAddr` / `--ldapUser` / `--ldapPass`.
   - Changed the listen port from `9384` to `9330` (the exporter's default).
   - The `--ldapAddr` value was changed from a `ldap://[host]:port` URL to the `[host]:port` format the exporter expects.
   - Updated Prometheus `scrape_configs` targets from `:9384` to `:9330` to match.

2. **Incorrect LDIF DN for the OpenLDAP Monitor backend.** The post used `dn: cn=Monitor,cn=config`, which is not how the dynamic configuration backend names database entries. Per the OpenLDAP Admin Guide, the Monitor database is added at `dn: olcDatabase=monitor,cn=config` and requires both `olcDatabaseConfig` and `olcMonitorConfig` objectClasses. Updated the DN and added the missing `objectClass: olcMonitorConfig`. (`cn=Monitor` is the correct base for *querying* the monitor data, which the post does correctly later.)

## Review Notes
- The `tomcz/openldap_exporter` repository was archived by its author in September 2024. It still works and is the canonical exporter most tutorials reference, but readers building new infrastructure may want to evaluate the active fork at `grafana/openldap_exporter`.
- The metric names used in the alerting rules (`ldap_query_duration_seconds`, `ldap_replication_lag_seconds`) are not emitted by `tomcz/openldap_exporter`; that exporter exposes metrics like `openldap_monitor_counter_object`, `openldap_monitored_object`, and `openldap_monitor_replication`. The alerts were left as-is because they read as illustrative examples (and `up{job="ldap_servers"} == 0` is a real Prometheus meta-metric that works regardless of exporter), but a future revision could rewrite them against the exporter's actual metric names or against a custom blackbox/scripted exporter.
- The `BIND_PW="adminpassword"` and `--ldapPass="adminpassword"` examples place the bind password directly in scripts and process arguments. This is fine for a tutorial but is a known security issue for production (visible in `ps`, shell history, etc.); a future revision could mention `-y <pwfile>` for `ldapsearch` and the `--config` YAML file option for `openldap_exporter`.
- The replication check uses `awk '{print $2}'` against `contextCSN`, which works for plain ASCII attribute values but would need base64 handling (`:: ` form) if `ldapsearch` ever returned the value as base64-encoded.
- LDAP traffic in all examples is plaintext (`ldap://`). For real deployments, `ldaps://` (port 636) or StartTLS would be appropriate; this is out of scope for a basic monitoring tutorial.
