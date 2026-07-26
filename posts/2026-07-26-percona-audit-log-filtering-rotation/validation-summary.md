# Validation Summary: Percona Audit Log Filtering and Rotation Without Filling the Disk

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Percona Server for MySQL 8.4
- Audit Log Filter component (`component_audit_log_filter`)
- MySQL SQL and component UDFs
- Audit filter JSON definitions
- MySQL option-file configuration
- Audit log rotation, pruning, and monitoring

## Sources Consulted

- [Install the audit log filter](https://docs.percona.com/percona-server/8.4/install-audit-log-filter.html)
- [Audit Log Filter overview](https://docs.percona.com/percona-server/8.4/audit-log-filter-overview.html)
- [Audit Log Filter quickstart](https://docs.percona.com/percona-server/8.4/audit-log-filter-quickstart.html)
- [Write audit_log_filter definitions](https://docs.percona.com/percona-server/8.4/write-filter-definitions.html)
- [Audit Log Filter definition fields](https://docs.percona.com/percona-server/8.4/audit-log-filter-definition-fields.html)
- [Filter the Audit Log Filter logs](https://docs.percona.com/percona-server/8.4/filter-audit-log-filter-files.html)
- [Audit log filter functions, options, and variables](https://docs.percona.com/percona-server/8.4/audit-log-filter-variables.html)
- [Manage the Audit Log Filter files](https://docs.percona.com/percona-server/8.4/manage-audit-log-filter.html)
- [Upgrade from plugins to components](https://docs.percona.com/percona-server/8.4/upgrade-components.html)
- [Percona Server for MySQL 8.4.10-10 release notes](https://docs.percona.com/percona-server/8.4/release-notes/8.4.10-10.html)

## Issues Found

- The post described Percona Server 8.4.9-9 as a released build. Percona's 8.4.10-10 release notes state that 8.4.9-9 was not released and that 8.4.10-10 was the next build. Updated the version-specific statements to identify 8.4.10-10 as the first released build containing the validation and `event_mode` changes documented for the unreleased 8.4.9-9 line.
- The filter setup and deployment examples omitted `audit_log_filter_flush()`. Added the flush call after defining and assigning each filter because the official installation guide and quickstart require it to reload persisted filter definitions and account assignments into the component.
- The session-lifecycle explanation did not account for flush behavior. Clarified that on 8.4.10-10 and later, a flush detaches existing sessions from their filters until they reconnect or run `CHANGE_USER`, and advised coordinating reconnects to avoid an audit gap.
- The post stated without a version qualifier that `SYNCHRONOUS` calls `fsync()` for each audited event. Clarified that this behavior applies to 8.4.10-10 and later; through 8.4.8-8, the setting did not issue the per-event `fsync()` and behaved like `SEMISYNCHRONOUS`.

## Review Notes

- The component installation script, component URN, table checks, filter UDF syntax, host-wildcard version caveat, filter validation caveats, rotation and pruning variables, 4096-byte rounding behavior, retention guidance, option-file names, status variables, and `ASYNCHRONOUS`/`PERFORMANCE` behavior agree with the official Percona Server 8.4 documentation.
- The five official documentation links originally included in the post are valid and point to the intended Percona Server 8.4 topics.
- Percona's current feature reference uses “8.4.9-9” for several code-line behavior changes even though that server build was not released. The post now distinguishes the documentation label from the first build in which users could actually receive those changes, 8.4.10-10.
