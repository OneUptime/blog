# Validation Summary: How to Monitor RHEL Hosts with Zabbix SNMP Templates

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Zabbix
- SNMP and Net-SNMP
- firewalld
- HOST-RESOURCES-MIB
- IF-MIB
- UCD-SNMP-MIB

## Sources Consulted
- Zabbix Documentation: SNMP agent items: https://www.zabbix.com/documentation/current/en/manual/config/items/itemtypes/snmp
- Zabbix Integrations: Linux by SNMP template: https://www.zabbix.com/integrations/linux
- Zabbix Integrations: ICMP Ping template: https://www.zabbix.com/integrations/ping
- Net-SNMP snmpd.conf manual page: https://ecos.sourceware.org/docs-latest/ref/net-snmp-agent-manpages-snmpd.conf.html
- Net-SNMP daemon configuration tutorial: https://www.net-snmp.org/tutorial/tutorial-5/demon/snmpd.html
- Net-SNMP UCD-SNMP-MIB reference: https://www.net-snmp.org/docs/mibs/ucdavis.html
- RFC 2790: Host Resources MIB: https://www.rfc-editor.org/rfc/rfc2790.html
- RFC 2863: The Interfaces Group MIB: https://www.rfc-editor.org/rfc/rfc2863
- firewalld rich language manual page: https://firewalld.org/documentation/man-pages/firewalld.richlanguage.html
- Red Hat Enterprise Linux 9 documentation: Configuring firewalld: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- Red Hat Enterprise Linux 9 documentation: Managing software with DNF: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_installing-rhel-9-content_managing-software-with-the-dnf-tool

## Issues Found
- The Net-SNMP configuration overwrote `snmpd.conf`, then added `view` and `access notConfigGroup` directives without defining the matching VACM group in the shown file. Replaced that with the documented `rocommunity COMMUNITY SOURCE OID` form, using `.1` to grant read-only access to the needed OID tree from the Zabbix server and localhost.
- The post referred to the built-in template as "Linux SNMP". Updated it to the current official template name, "Linux by SNMP".
- The custom item instructions used the older item type label "SNMPv2 agent". Updated this to the current Zabbix item type, "SNMP agent"; the SNMP version remains configured on the host SNMP interface.

## Review Notes
The SNMPv2c examples are technically valid for a restricted monitoring network, but SNMPv3 is preferable when authentication and encryption are required. The post intentionally keeps the example scoped to SNMPv2c because that matches the Zabbix template setup described.
