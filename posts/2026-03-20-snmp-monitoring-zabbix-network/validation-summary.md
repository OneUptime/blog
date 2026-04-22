# Validation Summary: How to Configure SNMP Monitoring in Zabbix for Network Devices

## Status
validated

## Post Type
Tutorial / how-to guide

## Technologies Covered
- Zabbix 7.0 LTS
- SNMPv2c and SNMPv3
- Net-SNMP tools (`snmpget`, `snmptrapd`)
- Zabbix API
- Zabbix SNMP templates and low-level discovery
- MySQL
- Nginx and PHP-FPM

## Sources Consulted
- Zabbix 7.0 installation from packages: https://www.zabbix.com/documentation/7.0/en/manual/installation/install_from_packages
- Zabbix official 7.0 Ubuntu repository package listing: https://repo.zabbix.com/zabbix/7.0/ubuntu/pool/main/z/zabbix-release/
- Zabbix 7.0 API overview and authorization methods: https://www.zabbix.com/documentation/7.0/en/manual/api
- Zabbix `host.create` API reference: https://www.zabbix.com/documentation/7.0/en/manual/api/reference/host/create
- Zabbix host interface object reference: https://www.zabbix.com/documentation/7.0/en/manual/api/reference/hostinterface/object
- Zabbix templates out of the box: https://www.zabbix.com/documentation/7.0/en/manual/config/templates_out_of_the_box
- Zabbix standardized templates for network devices: https://www.zabbix.com/documentation/7.0/en/manual/config/templates_out_of_the_box/network_devices
- Zabbix SNMP integration/template reference: https://www.zabbix.com/integrations/snmp
- Zabbix `Network Generic Device by SNMP` template source: https://git.zabbix.com/projects/ZBX/repos/zabbix/browse/templates/net/generic_snmp?at=release/7.0
- Zabbix SNMP agent item documentation: https://www.zabbix.com/documentation/7.0/en/manual/config/items/itemtypes/snmp
- Zabbix SNMP trap item documentation: https://www.zabbix.com/documentation/7.0/en/manual/config/items/itemtypes/snmptrap
- IETF IF-MIB, RFC 2863: https://www.rfc-editor.org/rfc/rfc2863

## Issues Found
- The installation snippet used an older repository package and skipped required MySQL database creation, schema import, `DBPassword` configuration, and Nginx frontend configuration. Updated the commands to use the current Zabbix 7.0 release package, create/import the database, set `DBPassword`, configure Nginx, and restart services.
- The Zabbix 7.0 UI path and template name were outdated. Changed `Configuration > Hosts > Create Host` to `Data collection > Hosts > Create host` and replaced `Network Interfaces SNMPv2` with `Network Generic Device by SNMP`, while noting vendor-specific templates such as `Cisco IOS SNMP`.
- The API example used the deprecated JSON-RPC `auth` property, did not include SNMP interface details, and did not link a template. Updated it to use the `Authorization: Bearer` header, `application/json-rpc`, SNMPv2 interface details with the community macro, and a template ID placeholder.
- The SNMP macro section treated `{$SNMP_VERSION}` as a Zabbix template macro. Removed it and clarified that SNMP version and credentials are configured on the host SNMP interface, optionally using user macros in those interface fields.
- The custom interface item used 32-bit `ifInOctets` while describing a 64-bit value and bandwidth. Changed it to `ifHCInOctets`, added the matching Zabbix item key, and added preprocessing to calculate bits per second.
- The custom trigger expression used an incorrect item key and old expression style. Replaced it with the Zabbix 7.x expression `last(/core-router-01/net.if.status[ifOperStatus.1])=2`.
- The SNMP trap section only configured `snmptrapd` and referenced a non-specific Perl receiver path. Added the required Zabbix server trapper settings, trap file path, official Bash trap handler pattern, and `Log` type of information for the trap item.
- The `snmpget` example left a community string containing `!` unquoted. Quoted the community string and used the fully qualified `SNMPv2-MIB::sysDescr.0` object.

## Review Notes
The examples still use placeholder group and template IDs because those IDs are instance-specific in Zabbix. SNMPv2c remains useful on trusted private networks, but production deployments should prefer SNMPv3 where devices support it.
