# Validation Summary: How to Set Up Nagios NCPA Agent Monitoring on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Nagios Core
- Nagios NCPA
- NCPA REST API
- NRDP passive checks
- firewalld
- systemd

## Sources Consulted
- Nagios NCPA v3 Agent Installation Instructions: https://assets.nagios.com/downloads/nagiosxi/docs/Installing-NCPA.pdf
- Nagios NCPA configuration documentation: https://www.nagios.org/ncpa/help/3.x/configuration.html
- Nagios NCPA active checks documentation: https://www.nagios.org/ncpa/help/3.x/active.html
- Nagios NCPA API reference: https://www.nagios.org/ncpa/help/3.x/api.html
- Nagios NCPA getting started guide: https://www.nagios.org/ncpa/getting-started.php
- Nagios RPM repository instructions for RHEL: https://repo.nagios.com/?repo=rpm-rhel
- Nagios RHEL 9 repository metadata: https://repo.nagios.com/nagios/9/repodata/
- NagiosEnterprises NCPA repository: https://github.com/NagiosEnterprises/ncpa

## Issues Found
- The RHEL 9 repository RPM URL pointed at the Nagios 7 repository path. Updated it to the current RHEL 9 repository RPM shown in the official Nagios repository instructions.
- The NCPA service commands used `ncpa_listener`, which applies to older NCPA service layouts. Updated the start and restart commands to `ncpa` for current NCPA v3 packages.
- The passive-check configuration snippet placed NRDP transport settings under `[passive checks]` and used obsolete-looking `nrdp_url` and `nrdp_token` names. Updated the snippet to use `[passive] handlers = nrdp` and `[nrdp] parent` / `token`.
- The Nagios command definition split token, metric, and extra options across separate arguments, which made quoted query arguments and disk paths fragile. Updated it to the official flexible `$ARG1$` pattern.
- The CPU service used `--aggregate avg`, but `check_ncpa.py` does not expose an `--aggregate` CLI option. Updated it to pass `aggregate=avg` with `-q`.
- The disk service did not quote the `disk/logical/|` metric. Updated the service definition so the pipe character is protected when expanded into the plugin command.
- The optional `dnf install ncpa-plugin` command did not match the current Nagios RHEL 9 repository metadata. Removed it and kept the officially documented `check_ncpa.py` download.

## Review Notes
The post now matches current NCPA v3 documentation for RHEL 9 repository setup, service management, active checks, API usage, and NRDP passive-check configuration.
