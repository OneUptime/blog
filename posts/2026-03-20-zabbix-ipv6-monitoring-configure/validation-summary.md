# Validation Summary: How to Configure Zabbix for IPv6 Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Zabbix (server, agent, agent2, proxy)
- IPv6 networking
- ICMP / ICMPv6
- SNMP (IF-MIB, IP-MIB)
- Zabbix JSON-RPC API
- systemd
- `ss` / `zabbix_get` CLI utilities

## Sources Consulted
- Zabbix 7.0 manual — Server and Agent configuration parameters: https://www.zabbix.com/documentation/current/en/manual/appendix/config/zabbix_server and https://www.zabbix.com/documentation/current/en/manual/appendix/config/zabbix_agentd
- Zabbix 7.0 manual — Trigger expression syntax: https://www.zabbix.com/documentation/current/en/manual/config/triggers/expression
- Zabbix 7.0 manual — History/trigger functions (`last`, `count`): https://www.zabbix.com/documentation/current/en/manual/appendix/functions/history
- Zabbix 7.0 manual — `icmpping` item key: https://www.zabbix.com/documentation/current/en/manual/config/items/itemtypes/simple_checks
- Zabbix 7.0 API docs — Authentication / Bearer token: https://www.zabbix.com/documentation/current/en/manual/api
- Zabbix 7.0 frontend sections — Data collection → Hosts: https://www.zabbix.com/documentation/current/en/manual/web_interface/frontend_sections/data_collection/hosts
- Zabbix 6.0 / 6.4 release notes regarding deprecation of `{host:key.function()}` expression syntax and `auth` JSON field.

## Issues Found
1. **Outdated trigger expression syntax.** The post used the legacy `{host:key.function()}=0` form (e.g., `{web-01:icmpping[...].last()}=0` and `{web-01:icmpping[...].count(#5,0,"eq")}>=3`). This syntax was removed in Zabbix 6.0. Updated to the current `last(/host/key)=0` / `count(/host/key,#5,"eq",0)>=3` form, also correcting the argument order for `count()` (operator before pattern).

2. **Deprecated API authentication.** Both API examples passed the token via the JSON body `"auth"` field, which is deprecated since Zabbix 6.4. Updated to use the recommended `Authorization: Bearer $ZABBIX_TOKEN` HTTP header, and changed `Content-Type` to the documented `application/json-rpc`.

3. **Unsupported `ListenIP=::` shorthand.** The post claimed `ListenIP=::` alone listens on both IPv4 and IPv6. Official Zabbix docs do not document this dual-stack behavior; `ListenIP` takes a comma-separated list. Replaced with `ListenIP=0.0.0.0,::` (explicitly covering both families) in both server and agent configs.

4. **Outdated UI navigation.** Changed "Configuration → Hosts → Create host" to "Data collection → Hosts → Create host" to match the Zabbix 7.0 frontend reorganization (current LTS in 2026).

5. **Invalid IPv6 placeholder addresses.** The post used strings like `2001:db8::server`, `2001:db8::zabbix-server`, and `2001:db8::router`, which contain non-hexadecimal characters and are not parseable IPv6 literals. Replaced with valid example addresses (`2001:db8::1`, `2001:db8::fe`) so copy-paste doesn't silently break configs.

## Review Notes
- The `icmpping[<target>,<packets>,<interval>,<size>,<timeout>]` key and parameters (`3,200,1024`) are valid per Zabbix 7.0 docs.
- `ServerActive=2001:db8::1` without brackets is valid when no port is specified. A comment was added noting that `[2001:db8::1]:10051` (with brackets) is required when specifying a port.
- The `ss -6 -tlnp` and `zabbix_get -s <ipv6> -p 10050 -k system.hostname` commands are correct.
- The host-interface payload (`type:1, main:1, useip:1, ip, dns, port`) is correct for an Agent interface; SNMP interfaces (type 2) would additionally require a `details` object, which is out of scope for the agent example shown.
- The post does not specify a Zabbix version; updates assume Zabbix 7.0 LTS (current in 2026). Operators on 5.x will still see the old syntax work, but the current docs and the Zabbix 6.0+ engine require the new forms.
