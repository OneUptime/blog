# Validation Summary: How to Set Up Icinga2 for Infrastructure Monitoring on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Icinga2 (monitoring daemon)
- Icinga DB (modern results backend, replaces IDO)
- Icinga Web 2 (web dashboard) and icingaweb2-module-icingadb
- MySQL / mysql_secure_installation
- Redis (bundled via icingadb-redis on port 6380)
- monitoring-plugins (check plugins package)
- Apache2 + PHP (web server stack)
- msmtp / msmtp-mta (email relay for notifications)
- Icinga2 DSL (object/template/apply configuration language)
- icingacli (CLI for Icinga Web 2)
- Icinga2 agent / cluster (node wizard, CA signing, Endpoint/Zone)
- Ubuntu apt/gpg keyring repository setup

## Sources Consulted
- Icinga DB Installation on Ubuntu — https://icinga.com/docs/icinga-db/latest/doc/02-Installation/Ubuntu/
- Icinga 2 Features documentation — https://icinga.com/docs/icinga2/latest/doc/14-features/
- Icinga 2 CLI Commands — https://icinga.com/docs/icinga2/latest/doc/11-cli-commands/
- Icinga 2 Installation on Ubuntu — https://icinga.com/docs/icinga-2/latest/doc/02-installation/02-Ubuntu/
- packages.icinga.com Ubuntu dists index — https://packages.icinga.com/ubuntu/dists/
- Icinga Web 2 monitoring module CLI (ListCommand) source
- Icinga community thread on icingadb-redis default port 6380

## Issues Found

1. **Fictional schema import command** — The post used `sudo icingadb-schema --import-mysql-scheme`, which is not a real command (no such binary or flag exists). Replaced with the documented schema import: `sudo mysql -u root -p icingadb < /usr/share/icingadb/schema/mysql/schema.sql`. The comment was also updated from "Run database migrations" to "Import the Icinga DB schema into MySQL" to reflect what actually happens.

2. **Mischaracterized `icingadb-redis` package** — The comment described it as "the MySQL connector for Icinga DB". The package is actually the bundled Redis server instance used by Icinga DB (listening on 127.0.0.1:6380 by default), not a MySQL connector. Updated the comment to accurately describe what the package provides.

3. **Wrong description of the `command` feature** — The post claimed `sudo icinga2 feature enable command` enables "built-in check plugins". That feature actually enables the external command pipe at `/var/run/icinga2/cmd/icinga2.cmd`, used by external tools to send commands to the daemon. Check plugins live in the separate `monitoring-plugins` package and need no feature toggle. Updated the comment to describe the feature accurately.

## Review Notes

- The `command` feature is deprecated upstream and scheduled for removal (replaced by the REST API). It is still functional and useful for the older Icinga Web 2 monitoring module, but a fully modern IcingaDB + icingadb-web stack does not require it. Left enabled per the post's intent (compatible with the `icingacli monitoring` commands used later).
- `php-imagick` is listed among the PHP extensions; it is optional (used for PDF/image export). Not technically wrong, just non-essential.
- Repository setup, `lsb_release -cs` codename interpolation, `icinga2 daemon -C` validation, `icinga2 ca sign <name>` signing, `apply Service` / `apply Notification ... to Service` DSL syntax, the 24x7 time period reference, the `template Host` / `import` template inheritance, and the `icingacli monitoring list hosts` and `icingacli monitoring downtime schedule` subcommand syntaxes all check out against current Icinga documentation.
- Gmail SMTP example in `/etc/msmtprc` will require an app password (Gmail no longer accepts account passwords for SMTP) — the post already says `your-app-password`, which is correct.
