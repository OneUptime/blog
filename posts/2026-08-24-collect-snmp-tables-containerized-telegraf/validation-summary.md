# Validation Summary: How to Collect SNMP Tables in Containerized Telegraf with `gosmi` and Custom MIB Paths

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered

- Telegraf 1.39.3
- Telegraf SNMP input and `gosmi` MIB translation
- SNMPv2c and SNMPv3
- SMI/MIB table and index handling
- Docker and Docker Compose
- TOML and YAML configuration

## Sources Consulted

- [Telegraf v1.39.3 release](https://github.com/influxdata/telegraf/releases/tag/v1.39.3)
- [Telegraf v1.39.3 SNMP input documentation](https://github.com/influxdata/telegraf/blob/v1.39.3/plugins/inputs/snmp/README.md)
- [Telegraf agent `snmp_translator` documentation](https://docs.influxdata.com/telegraf/v1/configuration/agent/#snmp)
- [Telegraf v1.39.3 input initialization and translator propagation](https://github.com/influxdata/telegraf/blob/v1.39.3/agent/agent.go)
- [Telegraf v1.39.3 SNMP field initialization and conversions](https://github.com/influxdata/telegraf/blob/v1.39.3/plugins/common/snmp/field.go)
- [Telegraf v1.39.3 table discovery and index handling](https://github.com/influxdata/telegraf/blob/v1.39.3/plugins/common/snmp/table.go)
- [Telegraf v1.39.3 `gosmi` translator implementation](https://github.com/influxdata/telegraf/blob/v1.39.3/plugins/common/snmp/translator_gosmi.go)
- [Telegraf v1.39.3 MIB path loader](https://github.com/influxdata/telegraf/blob/v1.39.3/plugins/common/snmp/mib_loader.go)
- [Telegraf environment-variable configuration](https://github.com/influxdata/telegraf/blob/v1.39.3/docs/CONFIGURATION.md#environment-variables)
- [Telegraf commands and flags](https://docs.influxdata.com/telegraf/v1/commands/)
- [Official Telegraf Docker image](https://hub.docker.com/_/telegraf)
- [Docker Compose service reference](https://docs.docker.com/reference/compose-file/services/)
- [Docker Compose variable interpolation](https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/)
- [`docker compose run` reference](https://docs.docker.com/reference/cli/docker/compose/run/)
- [Docker networking overview](https://docs.docker.com/engine/network/)
- [RFC 2578: Structure of Management Information Version 2](https://datatracker.ietf.org/doc/html/rfc2578)
- [RFC 2863: The Interfaces Group MIB](https://datatracker.ietf.org/doc/html/rfc2863)
- [RFC 3414: SNMPv3 User-based Security Model](https://datatracker.ietf.org/doc/html/rfc3414)
- [RFC 3417: Transport Mappings for SNMP](https://datatracker.ietf.org/doc/html/rfc3417)

## Issues Found

- The post said the agent-level `snmp_translator` setting applies to all SNMP plugin types. In Telegraf 1.39.3, the agent propagates this setting to the `inputs.snmp` and `inputs.snmp_trap` plugins; `processors.snmp_lookup` always uses `gosmi`. The sentence was narrowed to the two SNMP input plugins.
- The Telegraf container-install link used the obsolete `#install-telegraf-using-docker` fragment. It was updated to the current `#download-and-install-telegraf` section.

## Review Notes

- The `telegraf:1.39.3` official image tag exists and matches the version reviewed.
- In Telegraf 1.39.3, `netsnmp` is deprecated and scheduled for removal in 1.40.0, so explicitly selecting `gosmi` is appropriate.
- A fully translation-independent numeric field test is clearest when the field has an explicit `name` and does not use a MIB-dependent `enum` or `displayhint` conversion. A numeric table-level OID still requires MIB metadata for column and index discovery, as the post states.
- `docker compose run` creates a one-off container on the service's declared networks; it does not reuse the running service container's network namespace or IP address. The command remains suitable for the connectivity test described.
