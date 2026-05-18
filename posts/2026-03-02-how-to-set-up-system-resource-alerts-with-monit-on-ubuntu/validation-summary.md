# Validation Summary: How to Set Up System Resource Alerts with monit on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- monit (process supervision and monitoring)
- Ubuntu / systemd
- Nginx, PostgreSQL, Redis (as example monitored services)
- SMTP (Gmail relay example) for alert delivery
- monit HTTPD web interface

## Sources Consulted
- Monit official manual: https://mmonit.com/monit/documentation/monit.html
- Monit man page (Debian/Ubuntu): https://manpages.debian.org/testing/monit/monit.1.en.html
- Monit Wiki – PostgreSQL example: https://mmonit.com/wiki/Monit/PostgreSQL
- Ubuntu `monit` package documentation (`/etc/monit/monitrc`, `/etc/monit/conf.d/`)

## Issues Found
1. **`sudo monit -I` mislabeled as "Run a manual check cycle now."**
   - `-I` is the foreground/no-detach flag (used by init systems), not a "run checks once" command.
   - Replaced with `sudo monit validate`, which is the documented way to trigger an immediate check of all services.

2. **`sudo monit alert` does not exist.**
   - There is no `alert` subcommand in the monit CLI. Documented subcommands are: `start`, `stop`, `restart`, `monitor`, `unmonitor`, `reload`, `validate`, `status`, `summary`, `report`, `quit`, `procmatch`.
   - Removed that line from the "Testing Alert Configuration" section.

3. **`sudo monit -v` mischaracterized as a way to "set a threshold that will definitely trigger."**
   - `-v` is just verbose/diagnostic output; it does not change thresholds.
   - Rewrote the section to explain the actual approach: lower a real threshold in the config (e.g. `if memory usage > 1% then alert`), reload, and watch the next cycle fire. Suggested `sudo monit -Iv` for foreground+verbose diagnostic output while debugging mail delivery.

## Review Notes
- The `pgsql` protocol keyword used in the PostgreSQL check is correct — it is the documented monit protocol name for PostgreSQL.
- Both `ping` and `icmp` keywords are accepted in `check host` blocks per the monit manual, so the `if failed ping count 5 with timeout 5 seconds then alert` syntax is valid.
- The PostgreSQL PID file path `/var/run/postgresql/14-main.pid` is the Debian/Ubuntu cluster-wrapper PID file path and matches PostgreSQL 14. Readers using a different major version (e.g. 15, 16) will need to adjust the number.
- The Redis PID file path `/var/run/redis/redis-server.pid` works because `/var/run` is a symlink to `/run` on systemd-based Ubuntu.
- The SSL certificate check (`check file ssl-cert ... if timestamp > 60 days then alert`) alerts on file mtime age, not on actual certificate expiry — readers should be aware this is a proxy, not a real expiry check, but the syntax itself is correct.
- The Gmail SMTP example uses port 587 with `tlsv12`, which works for SMTP submission with STARTTLS. App Passwords (rather than account passwords) are required for Gmail, but that is outside the scope of this monit-focused post.
