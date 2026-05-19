# Validation Summary: How to Monitor Ubuntu with SNMP and Cacti

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Ubuntu (server)
- Net-SNMP (snmpd, snmpwalk, snmpget, net-snmp-create-v3-user)
- Cacti (1.2.27, web UI, spine poller)
- SNMPv2c and SNMPv3
- Apache2
- PHP 8.3
- MariaDB
- RRDtool
- HOST-RESOURCES-MIB, IF-MIB, UCD-SNMP-MIB

## Sources Consulted
- Net-SNMP snmpd.conf documentation: http://www.net-snmp.org/docs/man/snmpd.conf.html
- Net-SNMP snmpcmd man page: http://www.net-snmp.org/docs/man/snmpcmd.html
- Cacti installation documentation: https://docs.cacti.net/
- Cacti downloads: https://www.cacti.net/downloads/
- Ubuntu package archive for PHP 8.3 (verifying which php8.3-* packages exist)
- PHP 8.0 release notes (JSON extension is always available, separate package removed): https://www.php.net/manual/en/migration80.new-features.php
- net-snmp-create-v3-user man page (requires snmpd to be stopped before use)
- Standard SMI OID assignments (mib-2: 1.3.6.1.2.1, ucdavis/UCD-SNMP-MIB: 1.3.6.1.4.1.2021)

## Issues Found

1. **Duplicate `-v` flag in `snmpget` command** — The original line read `snmpget -v 2c -c monitoring_secret -v 192.168.1.50 .1.3.6.1.2.1.1.1.0`. The second `-v` would attempt to interpret `192.168.1.50` as a SNMP version string, causing the command to fail. Removed the stray `-v` and updated the comment from "Test with verbose output" to "Test a specific OID (sysDescr)", which is what the command actually does.

2. **`php8.3-json` package does not exist** — Since PHP 8.0 the JSON extension is always available as part of the core and the separate `php-json` / `php8.x-json` package was removed. Including it in the `apt install` line causes the install to fail on Ubuntu (no installation candidate). Removed `php8.3-json` from the LAMP-stack prerequisites; JSON support is provided automatically by the base `php8.3` package.

3. **`net-snmp-create-v3-user` requires snmpd to be stopped first** — The utility writes the new v3 user to `/var/lib/snmp/snmpd.conf`. If snmpd is running it will not see the new credential (and on some systems the file write will conflict). Added an explicit `sudo systemctl stop snmpd` before the create step and changed the trailing `restart` to `start` so the daemon comes back up cleanly with the new user.

## Review Notes

- The `view systemonly` directives are syntactically correct but are not referenced from the `rocommunity` line, so they have no effect in the configuration as shown. The `rocommunity ... 10.0.0.0/24` line falls through to the default view. This is not technically wrong (the config will load and work), but the views are dead code; a future improvement would be to add `-V systemonly` to the rocommunity directive to actually enforce the restriction.
- Cacti 1.2.27 is a real released version; newer point releases in the 1.2.x line may exist by the time a reader runs this, but the manual-install procedure is unchanged.
- The OID `.1.3.6.1.2.1.2` covers the classic IF-MIB interfaces group from MIB-II; for high-capacity interface counters readers may additionally want to allow `.1.3.6.1.2.1.31` (ifMIB/ifXTable).
- The `Apache Virtual Host` example uses port 80 only — production deployments should add TLS, but this is a deliberate simplification.
- Default Cacti credentials (admin/admin) are stated correctly for first login; Cacti forces a password change on first login as the post notes.
