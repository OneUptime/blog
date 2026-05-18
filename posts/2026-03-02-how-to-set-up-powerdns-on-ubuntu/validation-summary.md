# Validation Summary: How to Set Up PowerDNS on Ubuntu

## Status
validated

## Post Type
Tutorial / Step-by-step installation guide

## Technologies Covered
- PowerDNS Authoritative Server (auth-49)
- MySQL (as gmysql backend)
- PowerDNS HTTP API (v1)
- PowerDNS-Admin (Flask web UI)
- Gunicorn (WSGI server)
- systemd
- Nginx (reverse proxy)
- Ubuntu 22.04 / 24.04
- systemd-resolved (disabling stub listener)

## Sources Consulted
- [PowerDNS Authoritative Server settings reference](https://doc.powerdns.com/authoritative/settings.html)
- [PowerDNS Authoritative Server HTTP API: Zone](https://doc.powerdns.com/authoritative/http-api/zone.html)
- [PowerDNS Authoritative Server installation docs](https://doc.powerdns.com/authoritative/installation.html)
- [PowerDNS APT repository (repo.powerdns.com)](https://repo.powerdns.com/) — confirmed FD380FBB-pub.asc is still the active signing key, and auth-49 is available for jammy/noble
- [PowerDNS-Admin GitHub repository](https://github.com/PowerDNS-Admin/PowerDNS-Admin) — confirmed requirements.txt, FLASK_APP/FLASK_CONF, gunicorn entry point `powerdnsadmin:create_app()`
- [PowerDNS-Admin development.py config](https://github.com/PowerDNS-Admin/PowerDNS-Admin/blob/master/configs/development.py) — verified SQLA_DB_* variable names
- PowerDNS-Admin Ubuntu install wiki — confirmed need for `yarn install --pure-lockfile` and `flask assets build`

## Issues Found

1. **Missing PowerDNS-Admin database and user creation.** The post referenced `pdnsadmin` user and `powerdns_admin` database in the PowerDNS-Admin config (`SQLA_DB_USER`, `SQLA_DB_NAME`) but never created them. As written, the `flask db upgrade` command would fail with an "Unknown database 'powerdns_admin'" error. Fixed by adding the additional `CREATE DATABASE` / `CREATE USER` / `GRANT` statements to the existing MySQL setup block (no new section added — just extended the existing heredoc).

2. **Missing frontend asset build for PowerDNS-Admin.** The original post installed `nodejs npm` but never invoked `yarn install` or `flask assets build`, both of which are required by PowerDNS-Admin to generate its static assets. Without them, the running app serves a broken UI. Fixed by (a) installing yarn globally via npm in the dependency step, and (b) appending the `yarn install --pure-lockfile` and `flask assets build` commands to the database initialization step.

## Review Notes

- **PowerDNS auth version**: The post pins to `auth-49` (4.9). Per repo.powerdns.com, 4.9 is currently in "critical fixes only" maintenance — stable production is 5.0.x. The 4.9 packages still install correctly and the configuration in the post is compatible, so the post is not wrong; it is just lagging the current stable. A future update could bump the repo line to `auth-50` (or `auth-51`) and the `PDNS_VERSION` in the PowerDNS-Admin config to match.
- **Schema file path**: The post uses `/usr/share/doc/pdns-backend-mysql/schema.mysql.sql` while newer Debian/Ubuntu packaging often places it at `/usr/share/pdns-backend-mysql/schema/schema.mysql.sql`. This is mitigated by the preceding `find /usr/share -name schema.mysql.sql` command in the post, so users can adjust the path if needed.
- **`disabled` value in the PATCH request**: Correctly given as a JSON boolean (`false`), not the string `"false"`, which is what the PowerDNS API expects.
- **Zone `kind: "Native"`**: Valid per the HTTP API docs (Native, Master, Slave, Producer, Consumer are the accepted values).
- **`webserver-allow-from=127.0.0.1`**: Valid — the setting accepts both single IPs and CIDR ranges.
- **PowerDNS-Admin project status**: The PowerDNS-Admin project itself has been under uncertain maintenance lately (latest tagged release v0.4.2 in early 2024). It still works, but readers deploying this fresh might want to evaluate active forks.
- **PowerDNS-Admin `production.py`**: Copied from `development.py`, which exports `SQLA_DB_USER`/`SQLA_DB_NAME` as `pda`/`pda` by default. The post correctly overrides them to `pdnsadmin`/`powerdns_admin`.
- **systemd unit `ExecStart`**: `gunicorn ... "powerdnsadmin:create_app()"` is the correct entry point per the project's documentation.
