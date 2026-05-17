# Validation Summary: How to Set Up Nagios for Infrastructure Monitoring on Ubuntu

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Nagios Core 4.4.14 (source install)
- Nagios Plugins 2.4.6
- NRPE (Nagios Remote Plugin Executor)
- Apache 2 (httpd) with PHP and CGI for the Nagios web UI
- Ubuntu (apt package manager, systemd, htpasswd)
- Postfix / mailutils for email notifications

## Sources Consulted
- Nagios Core source repository and Changelog: https://github.com/NagiosEnterprises/nagioscore
- Nagios Core sample commands.cfg template: https://raw.githubusercontent.com/NagiosEnterprises/nagioscore/nagios-4.5.11/sample-config/template-object/commands.cfg.in
- Nagios Core download index: https://assets.nagios.com/downloads/nagioscore/releases/
- Nagios Plugins download index: https://nagios-plugins.org/download/
- Nagios Core installation KB: https://support.nagios.com/kb/article/nagios-core-installing-nagios-core-from-source-96.html
- Nagios Plugins documentation (check_http, check_load, check_procs, check_disk, check_users)
- Ubuntu package metadata for `apache2` (apache2-utils is a Depends, so htpasswd is present) and `libmcrypt-dev`
- Nagios object configuration reference (host/service/contact options, notification options w,u,c,r,f,s and d,u,r,f,s)

## Issues Found
1. **Unnecessary `libmcrypt-dev` build dependency** — `libmcrypt-dev` was included in the apt install list, but PHP removed the mcrypt extension in PHP 7.2 (2018) and Nagios Core itself does not require mcrypt. On Ubuntu 22.04+/24.04+ this package is in `universe` and adds nothing useful for a Nagios install. Removed it from the dependency list.
2. **Non-existent `check_https` command** — The HTTPS service definition used `check_command check_https`, but `check_https` is not defined in the default Nagios Core `commands.cfg` (verified against the upstream sample-config template). Using it as-written would cause `nagios -v` to fail with an "unable to find command" error. Changed to `check_command check_http!-S`, which uses the standard `check_http` command and passes the SSL flag (defaults to port 443).

## Review Notes
- The post pins `NAGIOS_VERSION="4.4.14"` (the final 4.4.x release) and `PLUGINS_VERSION="2.4.6"`. As of the post date, current stable releases are Nagios Core 4.5.11 and Nagios Plugins 2.4.12. The pinned versions still build and function, and the post explicitly tells the reader to check the Nagios downloads page for the latest, so these were left unchanged.
- `command[check_mem]=/usr/lib/nagios/plugins/check_free_mem.sh ...` references a non-standard plugin — `check_free_mem.sh` is not shipped by the `monitoring-plugins`/`nagios-plugins` package. The `.sh` extension makes it reasonably clear this is a user-supplied script, so the line was left as an illustrative example, but readers should know they need to provide this script themselves (or use a contrib check such as `check_mem` from `monitoring-plugins-contrib`).
- `apache2-utils` (which provides `htpasswd`) is a hard `Depends` of the `apache2` package on Ubuntu, so the `htpasswd` step works without explicitly listing it.
- The notification option letters used in the contact definition (`w,u,c,r,f,s` for services and `d,u,r,f,s` for hosts) are all valid per the Nagios object reference.
- `make install-init` on Nagios Core 4.4+ correctly installs a systemd unit on systemd-based Ubuntu, so `systemctl enable --now nagios` and `systemctl reload nagios` work as written.
- The `check_load` thresholds in the NRPE config are quite tight but match Nagios's default sample values and the `-r` (per-CPU) flag is used, so they behave reasonably on multi-core systems.
