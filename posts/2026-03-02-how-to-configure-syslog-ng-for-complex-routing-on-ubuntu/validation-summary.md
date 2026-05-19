# Validation Summary: How to Configure syslog-ng for Complex Routing on Ubuntu

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Ubuntu
- syslog-ng OSE
- Linux systemd services
- syslog routing, filtering, and forwarding
- rsyslog client forwarding
- TLS syslog forwarding

## Sources Consulted
- syslog-ng OSE documentation: source drivers and `network()` source options: https://syslog-ng.github.io/admin-guide/060_Sources/README.html
- syslog-ng OSE documentation: `system()` source options: https://syslog-ng.github.io/admin-guide/060_Sources/180_System/000_System_options
- syslog-ng OSE documentation: `systemd-journal()` source options: https://syslog-ng.github.io/admin-guide/060_Sources/190_systemd-journal/000_systemd-journal_options
- syslog-ng OSE documentation: global options: https://syslog-ng.github.io/admin-guide/090_Global_options/000_Global_options.html
- syslog-ng OSE documentation: `network()` destination options and TLS: https://syslog-ng.github.io/admin-guide/070_Destinations/150_Network/000_Network_destination_options
- syslog-ng OSE documentation: log path flags: https://syslog-ng.github.io/admin-guide/080_Log/000_Log_paths/003_Log_path_flags
- syslog-ng OSE documentation: filters: https://syslog-ng.github.io/admin-guide/080_Log/030_Filters/README
- Ubuntu Launchpad package page for `syslog-ng-core` on Ubuntu Noble: https://launchpad.net/ubuntu/noble/+package/syslog-ng-core
- Ubuntu 24.04 package metadata and extracted default `/etc/syslog-ng/syslog-ng.conf` from `syslog-ng-core_4.3.1-2build5`

## Issues Found
- The `flush_lines(0)` comment said syslog-ng flushes log files regularly even without new messages. Updated it to say it flushes each message immediately, matching the option's behavior.
- The `use_fqdn(no)` comment incorrectly described timestamp preservation. Updated it to describe short hostname behavior.
- The source example claimed that a plain `network(transport("tcp") port(12201))` source accepts GELF-formatted logs. syslog-ng's `network()` source receives syslog/plain network messages; GELF parsing is not enabled by that snippet. Renamed the example to a plain TCP syslog source on port 12201.
- The reload command described reload as guaranteed to lose no messages. Softened the comment to avoid an absolute guarantee.

## Review Notes
The complete central logging example was syntax-checked with the Ubuntu 24.04 `syslog-ng` 4.3.1 package extracted locally. The package still ships a default configuration using `@version: 3.38`, so the post's `@version: 3.38` examples are consistent with Ubuntu Noble packaging even though the installed binary version is 4.3.1.
