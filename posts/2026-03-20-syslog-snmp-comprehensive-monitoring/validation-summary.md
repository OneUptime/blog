# Validation Summary: How to Set Up Syslog and SNMP Together for Comprehensive Monitoring

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Syslog
- rsyslog
- SNMP polling
- SNMP traps
- Net-SNMP snmptrapd
- Cisco IOS / IOS XE SNMP and syslog configuration
- Prometheus SNMP Exporter
- Grafana Loki / Elasticsearch
- Grafana dashboards and annotations

## Sources Consulted
- rsyslog imudp module documentation: https://docs.rsyslog.com/doc/configuration/modules/imudp.html
- rsyslog imtcp module documentation: https://docs.rsyslog.com/doc/configuration/modules/imtcp.html
- rsyslog omfile dynaFile documentation: https://docs.rsyslog.com/doc/reference/parameters/omfile-dynafile.html
- rsyslog omfile createDirs documentation: https://docs.rsyslog.com/doc/reference/parameters/omfile-createdirs.html
- rsyslog legacy `$template` documentation: https://www.rsyslog.com/doc/reference/templates/templates-legacy.html
- Net-SNMP snmptrapd.conf manual: https://www.net-snmp.org/docs/man/snmptrapd.conf.html
- Net-SNMP snmpcmd logging options manual: https://www.net-snmp.org/docs/man/snmpcmd.html
- Cisco supported IOS SNMP traps documentation: https://www.cisco.com/c/en/us/support/docs/ip/simple-network-management-protocol-snmp/13506-snmp-traps.html
- Cisco IOS SNMP command reference for SNMP and OSPF traps: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/snmp/command/nm-snmp-cr-book/nm-snmp-cr-s3.html
- Cisco IOS SNMP command reference for trap-source/host behavior: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/snmp/command/nm-snmp-cr-book/nm-snmp-cr-s5.html
- Cisco IOS logging source-interface command reference: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/esm/command/esm-cr-book/esm-cr-a1.html
- Prometheus SNMP Exporter documentation: https://github.com/prometheus/snmp_exporter
- Grafana Loki data source documentation: https://grafana.com/docs/grafana/latest/datasources/loki/configure-loki-data-source/
- Grafana Loki query editor and annotations documentation: https://grafana.com/docs/grafana/latest/datasources/loki/query-editor/
- Local CLI verification: `systemctl --help`, `ss --help`, and `rsyslogd -N1` with rsyslog 8.2312.0.

## Issues Found
- The post described SNMP only as pull-based polling even though it also configures SNMP traps. I split the description into SNMP polling and SNMP traps, and adjusted the takeaway to distinguish metrics polling from trap notifications.
- The architecture diagram sent Prometheus/PRTG into a node labeled "Grafana Loki or Elasticsearch", which conflated metrics collection, log storage, and dashboards. I updated the diagram so syslog and SNMP traps flow to log storage and then Grafana, while SNMP polling flows to the monitoring system and Grafana.
- The rsyslog example used legacy `$template` and dynamic-file selector syntax, and included `systemctl restart rsyslog` inside the rsyslog configuration block. I replaced the logging rule with current RainerScript `template(...)` and `action(type="omfile" dynaFile=...)` syntax, added `createDirs="on"`, bound the TCP listener to the same IPv4 address as UDP, and moved the restart command into a separate shell block.
- The snmptrapd snippet said `logOption f /var/log/snmptraps.log` logged traps to syslog, but Net-SNMP logging options show `f` logs to a file. I changed the comment to "Log traps to a file" and clarified that the community line is access control.
- The Cisco OSPF trap command used `snmp-server enable traps ospf state-change`. Cisco's IOS command reference documents the OSPF transition trap form as `snmp-server enable traps ospf cisco-specific state-change`, so I corrected the command.
- The Prometheus SNMP Exporter example used `module: [cisco_wlc]` for routers and switches and omitted the current `auth` parameter. The SNMP Exporter documentation recommends `auth: [public_v2]` and `module: [if_mib]` as the starter configuration for switches, access points, and routers, so I updated the snippet.

## Review Notes
- The examples still use SNMPv2c community string `public`, which is functional for a lab but should be restricted with ACLs or replaced with SNMPv3 in production.
- Device-specific SNMP Exporter modules may be useful for vendor metrics beyond interface counters, but `if_mib` is the correct generic starting point for the listed router and switch targets.
- Firewall, SELinux, and service permissions must allow UDP/TCP 514, UDP 162, and UDP 161 paths in a real deployment.
