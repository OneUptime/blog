# Validation Summary: How to Set Up SNMP Traps for Network Event Alerting

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- SNMP traps and informs
- Cisco IOS / IOS XE SNMP trap configuration
- Net-SNMP `snmptrapd`
- Net-SNMP `snmptrap`
- Bash trap handler scripts
- Zabbix SNMP trap ingestion

## Sources Consulted
- RFC 3416, Version 2 of the Protocol Operations for SNMP: https://www.rfc-editor.org/rfc/rfc3416.html
- RFC 3418, SNMPv2-MIB definitions: https://www.rfc-editor.org/rfc/rfc3418.html
- RFC 2863, Interfaces Group MIB linkUp/linkDown notifications: https://datatracker.ietf.org/doc/html/rfc2863
- RFC 4273, BGP4-MIB notifications: https://datatracker.ietf.org/doc/html/rfc4273
- Net-SNMP `snmptrapd.conf` manual: https://www.net-snmp.org/docs/man/snmptrapd.conf.html
- Net-SNMP `snmptrap` manual: https://www.net-snmp.org/docs/man/snmptrap.html
- Cisco IOS SNMP Support Command Reference, `snmp-server enable traps`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/snmp/command/nm-snmp-cr-book/nm-snmp-cr-s4.html
- Cisco IOS SNMP Support Command Reference, `snmp-server trap timeout` and `snmp-server trap-source`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/snmp/command/nm-snmp-cr-book/nm-snmp-cr-s5.html
- Cisco supported IOS SNMP traps reference: https://www.cisco.com/c/en/us/support/docs/ip/simple-network-management-protocol-snmp/13506-snmp-traps.html
- Cisco IF-MIB linkUp/linkDown trap behavior: https://www.cisco.com/en/US/docs/ios/interface/configuration/guide/ir_ifmibs_external_docbase_0900e4b180c3c511_4container_external_docbase_0900e4b181b7465e.html
- Zabbix current SNMP trap documentation: https://www.zabbix.com/documentation/current/en/manual/config/items/itemtypes/snmptrap

## Issues Found
- The BGP trap table and handler used only the deprecated `bgpBackwardTransition` notification name. Updated the table to the current RFC 4273 `bgpBackwardTransNotification` name and kept legacy matching in the handler.
- The environmental temperature trap table entry used the informal `envMonTemperature` name. Updated it to the Cisco notification name `ciscoEnvMonTemperatureNotification`.
- The Cisco `snmp-server trap-timeout` example described normal trap delivery retries. Traps are unconfirmed; the Cisco timeout applies to traps queued for route lookup/retransmission. Updated the command to current `snmp-server trap timeout 30` syntax and clarified the comment.
- The `snmptrapd.conf` write used `cat > /etc/snmp/snmptrapd.conf`, which fails for non-root shells even when other commands use `sudo`. Replaced it with `sudo tee`.
- The handler script only matched symbolic MIB names and the deprecated BGP notification name. Added numeric OID matching for `snmpTrapOID`, `linkDown`, current BGP backward transition notification, and legacy BGP backward transition notification. Added an `ifIndex` fallback when `ifDescr` is absent.
- The executable-bit command targeted `/usr/local/bin` without privilege escalation. Updated it to `sudo chmod +x`.
- The monitoring tools section incorrectly implied that platforms such as Grafana have built-in SNMP trap receivers and used a nonstandard Zabbix config filename. Reworded it to describe ingestion through receivers such as `snmptrapd`/SNMPTT and replaced the Zabbix snippet with `StartSNMPTrapper`, `SNMPTrapperFile`, and the `snmptrap.fallback` item key.
- The listener verification command used `ss -p` without `sudo`, which may hide the owning process. Updated it to `sudo ss -lunp`.

## Review Notes
- The post intentionally uses SNMPv2c and the `public` community as an example. Production deployments should use a non-default community, source restrictions, or SNMPv3 where supported.
- The custom handler log is not a complete Zabbix trap receiver format. The Zabbix section now points to a Zabbix-formatted trap file rather than implying the earlier custom log can be consumed directly.
