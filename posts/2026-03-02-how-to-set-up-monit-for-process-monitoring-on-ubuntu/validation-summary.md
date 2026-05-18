# Validation Summary: How to Set Up Monit for Process Monitoring on Ubuntu

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Monit (process supervision tool)
- Ubuntu (apt, systemd)
- Common service monitoring targets: nginx, MySQL/MariaDB, PostgreSQL, SSH, Redis, Elasticsearch
- Monit HTTPD web interface
- Monit alert events and reminder configuration

## Sources Consulted
- Official Monit Manual: https://mmonit.com/monit/documentation/monit.html
  - PROCESS / EXISTENCE TESTS section (process check syntax)
  - FILE TESTS / TIMESTAMP TEST section (timestamp/changed semantics)
  - CONNECTION TESTS section (protocol mysql, pgsql, ssh, http, https, icmp)
  - HTTPD / TCP PORT section (HTTPD interface configuration)
  - ALERT MESSAGES section (valid alert event list)
  - Setting an Error Reminder section (`with reminder on N cycles`)
  - Arguments section (`monit monitor` vs forcing a check)
- Ubuntu package documentation for `monit` (conf.d / conf-enabled drop-in directories)

## Issues Found

1. **Invalid file test syntax: `if not changed for 10 minutes then alert`** (File and Directory Monitoring section).
   - Monit's file timestamp test syntax is `IF <TIMESTAMP|MTIME|ATIME|CTIME> <operator> <value> [unit]`. There is no `IF NOT CHANGED FOR ...` form.
   - **Fixed:** changed to `if timestamp > 10 minutes then alert`, which alerts when the file's mtime is older than 10 minutes (i.e., the log has stopped growing).

2. **Invalid alert event: `on { restart, nonexist }`** (Alerting Configuration Examples section).
   - `restart` is not in Monit's alert event list. Triggered actions (start/stop/restart) raise the `action` event.
   - **Fixed:** changed to `on { action, nonexist }`.

3. **Misleading comment: "Force an immediate check" for `sudo monit monitor nginx`** (Controlling Monit section).
   - The `monit monitor <name>` command enables monitoring of a service (e.g., after `unmonitor`); it does not force an immediate check. The next scheduled cycle handles the test.
   - **Fixed:** rewrote the comment as "Re-enable monitoring for a service (after unmonitor)" to reflect what the command actually does.

## Review Notes

- `if not exist then restart` is valid — Monit accepts both `IF NOT EXIST` and `IF DOES NOT EXIST`.
- `set alert ... reminder on 10 cycles` is accepted but the canonical form in the manual is `with reminder on 10 cycles`. Left as-is since it parses correctly.
- The PostgreSQL pidfile path (`/var/run/postgresql/15-main.pid`) is correct for PostgreSQL 15 on Ubuntu; readers on a different major version will need to adjust the version prefix. Worth noting as a version-specific caveat but not a technical error.
- `protocol mysql`, `protocol pgsql`, `protocol ssh`, `protocol http`, and `protocol https` are all valid Monit connection test protocols.
- The HTTPD configuration (`set httpd port 2812 and use address localhost / allow localhost / allow admin:secretpassword`) is valid syntax.
- The `if X restarts within Y cycles then alert` example uses `then alert`, which is valid; many real-world configs use `then unmonitor` instead so Monit stops fighting a broken service. Either is correct.
