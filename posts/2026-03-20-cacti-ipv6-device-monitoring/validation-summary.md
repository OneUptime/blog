# Validation Summary: How to Configure Cacti for IPv6 Device Monitoring

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cacti
- Spine
- Net-SNMP
- SNMP
- IPv6
- RRDtool
- MySQL
- PHP

## Sources Consulted
- Cacti upstream README: https://github.com/Cacti/cacti
- Cacti device hostname field and SNMP settings implementation: https://github.com/Cacti/cacti/blob/main/include/global_form.php
- Cacti SNMP transport logic: https://github.com/Cacti/cacti/blob/main/lib/snmp.php
- Cacti global SNMP timeout/retry settings: https://github.com/Cacti/cacti/blob/main/include/global_settings.php
- Cacti installer notes about `php-snmp`: https://github.com/Cacti/cacti/blob/main/lib/installer.php
- Cacti required and optional PHP extensions: https://github.com/Cacti/cacti/blob/main/lib/utility.php
- Cacti documentation, single-OID graphing: https://github.com/Cacti/documentation/blob/master/Graph-a-Single-SNMP-OID.md
- Cacti documentation, Ubuntu/Debian installation: https://github.com/Cacti/documentation/blob/master/Installing-Under-Ubuntu-Debian.md
- Spine README: https://github.com/Cacti/spine
- Spine default configuration file: https://github.com/Cacti/spine/blob/main/spine.conf.dist
- Net-SNMP agent specification and IPv6 transport syntax: https://www.net-snmp.org/docs/man/snmpcmd.html
- Net-SNMP IP-MIB reference: https://www.net-snmp.org/docs/mibs/ip.html
- RFC 4293, IP-MIB: https://datatracker.ietf.org/doc/rfc4293/
- RFC 4001, `InetVersion` indexing (`ipv6(2)`): https://datatracker.ietf.org/doc/rfc4001/

## Issues Found
- The post incorrectly treated `php-snmp` as a prerequisite for IPv6 polling. Current Cacti upstream guidance warns against relying on `php-snmp` for IPv6 devices, so the post was corrected to prefer Spine or the external Net-SNMP tools.
- The `include/config.php` snippet used nonexistent `$config['snmp_timeout']` and `$config['snmp_retries']` settings. These values are Cacti settings stored in the database and exposed in the UI, so the section was rewritten to point to the correct Cacti settings locations.
- The manual install example used an outdated `cacti-1.2.25` tarball flow and omitted current source-install requirements such as Composer and the required PHP modules. The install commands were updated to a current `1.2.x` checkout and to include the required dependency packages and `config.php.dist` copy step.
- The IPv6 hostname guidance mixed correct Cacti bracket notation with inaccurate PHP-SNMP transport claims. The post was corrected to match Cacti’s actual device field guidance and to remove the unsupported PHP-specific explanation.
- The Spine section mixed shell verification commands into the `spine.conf` file example and used the wrong default config path. It was corrected to use a valid `/etc/spine.conf` snippet and separate explanatory text.
- The graphing section used a symbolic OID path that did not match Cacti’s own documented single-OID graph workflow. It was corrected to use the `SNMP - Generic OID Template` and the numeric OID `1.3.6.1.2.1.4.31.1.1.4.2`, which is `ipSystemStatsHCInReceives` for the `ipv6(2)` row.
- The troubleshooting section included a PHP heredoc example that would not be appropriate for current IPv6 guidance and used an invalid example IPv6 firewall source address (`2001:db8::cacti`). Those examples were replaced with valid Net-SNMP and firewall examples.

## Review Notes
- The package-based `cacti` install path can vary by distribution, especially for log locations and bundled dependencies. Where the post references `/var/www/html/cacti`, it now does so in the context of a source installation.
- Cacti’s separate documentation repository still contains some older distro-specific examples, so source code and current upstream README behavior were used as the primary authority where the docs were stale or incomplete.
