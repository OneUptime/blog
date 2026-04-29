# Validation Summary: How to Configure LibreNMS for IPv6 Device Discovery

## Status
validated

## Post Type
Guide

## Technologies Covered
- LibreNMS
- IPv6
- SNMP
- Net-SNMP CLI tools
- LibreNMS API
- BGP

## Sources Consulted
- LibreNMS Docs, Adding a Device: https://docs.librenms.org/Support/Adding-a-Device/
- LibreNMS Docs, Configuration: https://docs.librenms.org/Support/Configuration/
- LibreNMS Docs, Auto-Discovery Setup: https://docs.librenms.org/Extensions/Auto-Discovery/
- LibreNMS Docs, Discovery Support: https://docs.librenms.org/Support/Discovery%20Support/
- LibreNMS Docs, Poller Support: https://docs.librenms.org/Support/Poller%20Support/
- LibreNMS Docs, Alerting Rules: https://docs.librenms.org/Alerting/Rules/
- LibreNMS Docs, Alerting Macros: https://docs.librenms.org/Alerting/Macros/
- LibreNMS Docs, API Devices: https://docs.librenms.org/API/Devices/
- LibreNMS Docs, API Routing: https://docs.librenms.org/API/Routing/
- Net-SNMP Wiki FAQ, IPv6 command-line syntax: https://www.net-snmp.org/wiki/index.php/FAQ:Applications_28
- LibreNMS source, `DeviceAdd` command: https://raw.githubusercontent.com/librenms/librenms/master/app/Console/Commands/DeviceAdd.php
- LibreNMS source, `snmp-scan.py`: https://raw.githubusercontent.com/librenms/librenms/master/snmp-scan.py

## Issues Found
- The post used invalid IPv6 literals such as `2001:db8::router1`. I replaced them with valid documentation-prefix example addresses like `2001:db8::1`.
- The SNMP-over-IPv6 example used incorrect Net-SNMP host syntax. I changed it to `udp6:[2001:db8::1]:161`, which matches Net-SNMP's documented IPv6 CLI format.
- The CLI examples used older LibreNMS entrypoints such as `addhost.php`, `discovery.php`, and `poller.php`. I updated them to the current `./lnms device:add`, `./lnms device:discover`, and `./lnms device:poll` commands, and corrected the BGP module name to `bgp-peers`.
- The configuration snippet included `$config['ipv6'] = true;`, which is not a documented LibreNMS setting for enabling IPv6. I replaced it with the documented SNMP transport configuration and corrected autodiscovery settings to use `autodiscovery.*`, `discovery_by_ip`, and `snmp-scan.py`.
- The autodiscovery example used an enormous IPv6 `/32` range together with SNMP scanning, which is not a practical scan target. I changed the example to a small IPv6 range appropriate for SNMP scan examples.
- The post described interface statistics as "IPv6 interfaces" and implied BGP/routing data were always automatic. I corrected the wording to reflect LibreNMS's actual model: interface counters are per interface, IPv6 addresses are discovered separately, and BGP/routing depend on the relevant modules and device SNMP support.
- The API example filtered generic network devices and assumed an `.ip` field shape instead of using the documented IPv6 query mode. I replaced it with a documented `type=ipv6&query=...` device lookup example.

## Review Notes
- `config.php` is still supported, but current LibreNMS documentation prefers database-backed configuration through `lnms config:set` or the Web UI because `config.php` applies only to the local poller.
- Proactive SNMP scanning of large IPv6 prefixes is generally impractical; in real deployments, xDP, OSPFv3, BGP-based discovery, and targeted small management ranges are better fits for IPv6 environments.
- Routing-table collection is not enabled by default in LibreNMS; it requires the `route` discovery module and device SNMP support.
