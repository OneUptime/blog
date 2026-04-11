# Validation Summary: How to Monitor MySQL with Nagios

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- Nagios Core / Nagios XI
- check_mysql plugin (from monitoring-plugins)
- check_mysql_health plugin (by Gerhard Lausser / ConSol)

## Sources Consulted
- ConSol check_mysql_health documentation: https://omd.consol.de/docs/plugins/check_mysql_health/
- check_mysql_health source code (mode list): https://github.com/lausser/check_mysql_health
- Monitoring Plugins check_mysql man page: https://www.monitoring-plugins.org/doc/man/check_mysql.html
- Debian monitoring-plugins-standard package: https://packages.debian.org/sid/monitoring-plugins-standard

## Issues Found

### 1. Invalid `check_mysql_health` mode name: `connection-usage`
- **What was wrong:** The post used `--mode connection-usage` in the command examples and Nagios service definition. `connection-usage` is not a valid mode for `check_mysql_health`. The plugin would return UNKNOWN status with this mode name.
- **What was changed:** Replaced `connection-usage` with `threads-connected`, which is the correct mode for monitoring the percentage of `max_connections` in use.
- **Why:** Verified against the check_mysql_health source code and official ConSol documentation. The `threads-connected` mode checks connected threads as a percentage of `max_connections`, matching the intent of the examples.

### 2. Incorrect Debian/Ubuntu package name: `nagios-plugins-mysql`
- **What was wrong:** The post used `sudo apt-get install -y nagios-plugins-mysql`. The package `nagios-plugins-mysql` does not exist on Debian/Ubuntu (it is an RPM/Fedora package name).
- **What was changed:** Replaced `nagios-plugins-mysql` with `monitoring-plugins-standard`, which is the correct Debian/Ubuntu package providing the `check_mysql` plugin.
- **Why:** On Debian/Ubuntu, the `check_mysql` plugin is part of the `monitoring-plugins-standard` package. The old `nagios-plugins` name was a transitional package that has been replaced by the `monitoring-plugins` family.

## Review Notes
- The post uses Nagios 3 paths (`/etc/nagios3/`, `nagios3` service name). Nagios Core 4.x has been current for many years, but the paths are internally consistent within the post and would work for a Nagios 3 Debian installation.
- The check_mysql_health download URL (`labs.consol.de`) was the historical distribution point. The project is now primarily hosted on GitHub at https://github.com/lausser/check_mysql_health. The version 2.3.2 referenced in the post is dated; newer versions are available.
- The Nagios service definitions omit common directives like `use generic-service` and `contact_groups`. This is acceptable for a tutorial but readers would need to add these or use templates for a working configuration.
- The `slave-lag` mode name uses the older MySQL terminology ("slave"). MySQL 8.0.22+ uses "replica" terminology, but the check_mysql_health plugin retains the `slave-lag` mode name for compatibility.
