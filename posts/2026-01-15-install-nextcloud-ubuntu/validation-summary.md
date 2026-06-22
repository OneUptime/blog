# Validation Summary: How to Install Nextcloud on Ubuntu

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- Nextcloud (self-hosted cloud storage platform)
- Ubuntu 22.04 / 24.04 LTS
- Apache 2.4 and Nginx web servers
- PHP 8.3 (FPM) and its extensions
- MariaDB / MySQL and PostgreSQL
- Redis (caching and file locking)
- Let's Encrypt / Certbot (TLS)
- UFW and Fail2Ban (security hardening)
- `occ` command-line tool
- Bash backup/restore scripting and cron

## Sources Consulted
- Nextcloud Administration Manual — Using the occ command: https://docs.nextcloud.com/server/stable/admin_manual/occ_command.html
- Nextcloud Administration Manual — System & maintenance (security) commands: https://docs.nextcloud.com/server/stable/admin_manual/occ_system.html
- Nextcloud server downloads / releases: https://download.nextcloud.com/server/releases/
- Nextcloud installation & nginx configuration documentation (example server block)
- Nextcloud online Security Scan tool: https://scan.nextcloud.com

## Issues Found
- **Invalid `occ` command (`security:scan`).** Under the "Security Scan" section, the post instructed readers to run `sudo -u www-data php /var/www/nextcloud/occ security:scan` as a "built-in security check." This command does not exist — the `occ security:` namespace only contains `bruteforce:*` and `certificates:*` subcommands; there is no `security:scan`. I replaced the invalid command with a reference to Nextcloud's external online Security Scan tool (https://scan.nextcloud.com) and kept the two valid commands that followed (`db:add-missing-indices` and `integrity:check-core`).

## Review Notes
- All other `occ` commands used in the post were verified as valid: `maintenance:install`, `maintenance:mode`, `maintenance:repair`, `config:system:set`, `config:app:get`, `background:cron`, `app:list/enable/disable/update/check-code`, `files:scan`, `files:cleanup`, `db:add-missing-indices/columns/primary-keys`, `db:convert-filecache-bigint`, `security:certificates`, `integrity:check-core`, `status`, `upgrade`, and `list`.
- Version-specific note: the download example pins `NEXTCLOUD_VERSION="29.0.0"` and the update example references `30.0.0`. These are used as placeholders and the post explicitly tells readers to "verify the version number on the Nextcloud website," so they were left as-is. Newer Nextcloud major versions exist as of the review date, but the procedure remains accurate.
- PHP 8.3 and the listed extensions are appropriate for the Nextcloud versions discussed; the required/recommended extension set matches official guidance.
- Database collation (`utf8mb4_general_ci`), the Redis Unix-socket config (`port => 0`), and the nginx server block largely follow Nextcloud's official recommendations.
- Minor, non-blocking observations (not changed, as they are not technical errors): `X-XSS-Protection "1; mode=block"` is a legacy header that modern guidance often sets to `0`; `opcache.file_cache = /tmp/opcache` assumes the directory exists/is writable; and the nginx `listen 443 ssl http2;` form is deprecated in favor of a separate `http2 on;` directive in nginx 1.25.1+, though it still works on the 1.18+ baseline the post targets.
