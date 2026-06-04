# Validation Summary: How to Run Zabbix in Docker for Network Monitoring

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker Compose
- Zabbix 7.0 LTS
- PostgreSQL
- Zabbix Server, Web Frontend, Agent 2, Proxy, and SNMP traps containers
- Zabbix JSON-RPC API
- SNMP monitoring and trap handling
- Webhook media types

## Sources Consulted
- Zabbix 7.0 documentation: Installation from containers - https://www.zabbix.com/documentation/7.0/en/manual/installation/containers
- Zabbix 7.0 API overview and authorization methods - https://www.zabbix.com/documentation/7.0/en/manual/api
- Zabbix 7.0 user.login API reference - https://www.zabbix.com/documentation/7.0/en/manual/api/reference/user/login
- Zabbix 7.0 host.create API reference - https://www.zabbix.com/documentation/7.0/en/manual/api/reference/host/create
- Zabbix 7.0 media type object API reference - https://www.zabbix.com/documentation/7.0/en/manual/api/reference/mediatype/object
- Zabbix webhook media configuration - https://www.zabbix.com/documentation/7.0/en/manual/config/notifications/media/webhook
- Docker Compose file reference - https://docs.docker.com/reference/compose-file/
- Docker Compose version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Hub: zabbix/zabbix-server-pgsql - https://hub.docker.com/r/zabbix/zabbix-server-pgsql
- Docker Hub: zabbix/zabbix-agent2 - https://hub.docker.com/r/zabbix/zabbix-agent2
- Docker Hub: zabbix/zabbix-snmptraps - https://hub.docker.com/r/zabbix/zabbix-snmptraps

## Issues Found
- The Compose example mounted the SNMP traps volume but did not enable SNMP trap processing in the Zabbix server. Added `ZBX_ENABLE_SNMP_TRAPS: "true"` to the `zabbix-server` service, matching the official container documentation.
- The SNMP trap configuration example overwrote `/etc/snmp/snmptrapd.conf` and referenced `/usr/sbin/zabbix_trap_receiver.pl`, while the official Zabbix SNMP traps container supports persistent custom configuration through `/var/lib/zabbix/snmptrapd_config/snmptrapd_custom.conf` and already includes its default trap handler. Updated the command to write community settings to the supported custom configuration file and added the required named volume.
- The Zabbix API examples used the deprecated JSON-RPC `auth` property. Updated authenticated calls to use the `Authorization: Bearer YOUR_AUTH_TOKEN` header and changed the API content type to `application/json-rpc`, following the Zabbix 7.0 API documentation.
- The post directed users to `Administration > Media types`, but Zabbix 7.0 documents webhook media configuration under `Alerts > Media types`. Updated the navigation path.
- The proxy Compose snippet used a named volume without showing the corresponding top-level volume declaration. Added `proxy-data` to the snippet so it can be copied into a Compose file without an undefined-volume error.
- The Compose file included the legacy top-level `version` property. Removed it because the current Docker Compose Specification treats it as backward-compatible metadata rather than the recommended way to select a schema.

## Review Notes
The example still uses placeholder credentials and a simple Slack webhook script for demonstration. For production, secrets should be moved out of the Compose file, webhook media should also be assigned to user media and actions, and the Docker socket mount for Agent 2 should be assessed carefully because it grants significant host visibility.
