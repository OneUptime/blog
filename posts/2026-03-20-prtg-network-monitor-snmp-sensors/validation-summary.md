# Validation Summary: How to Configure PRTG Network Monitor with SNMP Sensors

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- PRTG Network Monitor
- Simple Network Management Protocol (SNMP)
- Net-SNMP (`snmpd`, `snmpwalk`)
- Linux server SNMP configuration
- HOST-RESOURCES-MIB
- UCD-SNMP-MIB

## Sources Consulted
- Paessler PRTG Manual: Add a Device - https://www.paessler.com/manuals/prtg/add_a_device
- Paessler PRTG Manual: SNMP Traffic Sensor - https://www.paessler.com/manuals/prtg/snmp_traffic_sensor
- Paessler PRTG Manual: SNMP CPU Load Sensor - https://www.paessler.com/manuals/prtg/snmp_cpu_load_sensor
- Paessler PRTG Manual: SNMP Custom Sensor - https://www.paessler.com/manuals/prtg/snmp_custom_sensor
- Paessler PRTG Manual: Monitoring via SNMP - https://www.paessler.com/manuals/prtg/monitoring_via_snmp
- Paessler Knowledge Base: use sensor “SNMP CPU Load” to query the Paloalto firewall CPU load - https://helpdesk.paessler.com/en/support/solutions/articles/76000074206-use-sensor-snmp-cpu-load-to-query-the-paloalto-firewall-cpu-load
- Net-SNMP `snmpd.conf` man page - https://www.net-snmp.org/docs/man/snmpd.conf.html
- Net-SNMP `snmpd.examples` man page - https://www.net-snmp.org/docs/man/snmpd.examples.html
- Net-SNMP `snmpwalk` man page - https://www.net-snmp.org/docs/man/snmpwalk.html
- Net-SNMP UCD-SNMP MIB reference - https://net-snmp.sourceforge.io/docs/mibs/ucdavis.html
- RFC 2790: Host Resources MIB - https://datatracker.ietf.org/doc/html/rfc2790

## Issues Found
- The Net-SNMP listener directive was written as `agentAddress`; I changed it to `agentaddress` to match the documented directive name in `snmpd.conf`.
- The SNMP Traffic sensor description claimed the sensor creates utilization, error, and discard data by default. I corrected this to match Paessler's documentation: the default channels are traffic in/out/total, while errors and discards are optional additional channels.
- The SNMP CPU Load section said PRTG reads `UCD-SNMP-MIB::ssCpuUser` and related OIDs. I corrected this to `HOST-RESOURCES-MIB::hrProcessorLoad`, which is the source Paessler uses for the built-in SNMP CPU Load sensor.
- The custom sensor was named `SNMP Custom Value`, which does not match the current PRTG sensor name. I corrected it to `SNMP Custom`.
- The example OID `.1.3.6.1.4.1.2021.11.60.0` was mislabeled as CPU steal. I corrected the label to `UCD-SNMP-MIB::ssRawContexts`, which is the documented object behind that OID.
- The custom sensor setup listed generic value types like "integer, counter, gauge". I changed this to PRTG's documented `Value Type` choices and gave `Delta (counter)` as the correct example for `ssRawContexts`.
- The SNMP v3 example placed `createUser` in `/etc/snmp/snmpd.conf`. I corrected the example so `createUser` is shown in Net-SNMP's persistent config and `rouser` remains in `/etc/snmp/snmpd.conf`, which matches Net-SNMP documentation.
- The PRTG SNMP v3 field labels were not aligned with the documented UI. I corrected them to `Authentication Method`, `User Name`, `Password`, `Encryption Type`, and `Encryption Key`.
- The `snmpwalk` examples used the symbolic OID `system`, which depends on local MIB loading. I changed them to the numeric OID `1.3.6.1.2.1.1` so the commands work more reliably on default Net-SNMP client installs.

## Review Notes
- Paessler recommends SNMP v2c or SNMP v3 for SNMP traffic monitoring because SNMP v1 lacks 64-bit counters and can produce invalid traffic data on faster links.
- PRTG documents that SNMP v3 has higher performance overhead than SNMP v2c, so large deployments may need multiple probes if they standardize on SNMP v3.
- Net-SNMP documents `/var/net-snmp/snmpd.conf` as the default persistent file for `createUser`; some Linux distributions package this persistent store differently, so the summary in the post keeps the distinction conceptual rather than hard-coding a distro-specific path.
