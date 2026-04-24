# Validation Summary: How to Configure PRTG for IPv6 Network Monitoring

## Status
validated

## Post Type
Guide

## Technologies Covered
- Paessler PRTG Network Monitor
- IPv6
- SNMP
- ICMP ping monitoring
- PRTG remote probes
- IP-MIB / RFC 4293 counters

## Sources Consulted
- Paessler PRTG Manual: IPv6 Support - https://www.paessler.com/manuals/prtg/ipv6_support
- Paessler PRTG Manual: Add a Device - https://www.paessler.com/manuals/prtg/add_a_device
- Paessler PRTG Manual: Device Settings - https://www.paessler.com/manuals/prtg/device_settings
- Paessler PRTG Manual: Ping Sensor - https://www.paessler.com/manuals/prtg/ping_sensor.htm
- Paessler PRTG Manual: Ping v2 Sensor - https://www.paessler.com/manuals/prtg/ping_v2_sensor
- Paessler PRTG Manual: SNMP Traffic Sensor - https://www.paessler.com/manuals/prtg/snmp_traffic_sensor
- Paessler PRTG Manual: Auto-Discovery - https://www.paessler.com/manuals/prtg/auto-discovery
- Paessler PRTG Manual: Add an Auto-Discovery Group - https://www.paessler.com/manuals/prtg/add_an_auto-discovery_group
- Paessler PRTG Manual: SNMP Custom Advanced Sensor - https://www.paessler.com/manuals/prtg/snmp_custom_advanced_sensor
- Paessler PRTG Manual: Notification Triggers Settings - https://www.paessler.com/manuals/prtg/notification_triggers_settings
- Paessler PRTG Manual: Notification Templates - https://www.paessler.com/manuals/prtg/notification_templates
- Paessler PRTG Manual: Install a Remote Probe - https://www.paessler.com/manuals/prtg/install_a_remote_probe
- RFC 4293: Management Information Base for the Internet Protocol (IP) - https://www.rfc-editor.org/rfc/rfc4293
- Net-SNMP snmpcmd manual - https://www.net-snmp.org/docs/man/snmpcmd.html

## Issues Found
- The post implied that PRTG automatically chooses IPv6 transport from the entered address or hostname. I corrected this to require `IP Version: IPv6` in device settings, which is how PRTG officially selects IPv6 transport.
- The IPv6 address examples `2001:db8::router1`, `2001:db8::switch1`, and `2001:db8::device` were invalid IPv6 literals. I replaced them with valid documentation-prefix examples.
- The ping section claimed there might be a separate `Ping IPv6` sensor or an IPv6 channel flag. I corrected this because PRTG uses the standard `Ping` or `Ping v2` sensor and applies IPv6 based on the device IP version.
- The SNMP section suggested setting SNMP version and community directly as part of `SNMP Traffic` sensor creation. I corrected this to use the device's inherited `Credentials for SNMP Devices`, which matches the manual.
- The auto-discovery section incorrectly described IPv6 subnet scanning with `/64`. I corrected it to the supported IPv6 method: an auto-discovery group with a list of individual IPv6 addresses or DNS names.
- The custom SNMP example used the wrong sensor type (`SNMP Custom String OID`) for numeric counters and listed incorrect IP-MIB OIDs. I changed this to `SNMP Custom Advanced` and corrected the IPv6 IP-MIB counters to `ipSystemStatsHCInReceives` at `1.3.6.1.2.1.4.31.1.1.4.2` and `ipSystemStatsHCOutTransmits` at `1.3.6.1.2.1.4.31.1.1.31.2`, with `Delta (counter)` value types.
- The notifications section used the wrong setup path and implied a tag filter directly inside notification creation. I corrected it to create a notification template under account settings and apply a state trigger on the relevant IPv6 device or group.
- The remote probe section used an incorrect web UI path and made an unsupported claim about probe-to-core IPv4/IPv6 selection. I corrected the setup flow to the documented remote-probe installer path and approval process.
- The troubleshooting section referred to the PRTG server rather than the monitoring probe, and it implied that DNS should return AAAA instead of A. I corrected this to focus on the probe system, proper IPv6 device settings, and a reachable AAAA record when using hostnames.

## Review Notes
- The post is now technically sound for current Paessler documentation, but it remains implicitly focused on PRTG Network Monitor / probe-based monitoring rather than every PRTG deployment model.
- IPv6 support in PRTG is sensor-specific. The post now reflects that by describing IPv6-capable sensors instead of implying blanket support across all sensors.
- The `snmpget` troubleshooting example uses Net-SNMP syntax for IPv6 transport and is appropriate as an external verification step, not a built-in PRTG command.
