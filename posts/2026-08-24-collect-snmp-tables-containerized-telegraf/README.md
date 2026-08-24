# Collect SNMP Tables in Telegraf with `gosmi` and Custom MIBs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Telegraf, SNMP, Docker, Network Monitoring, MIB

Description: Package custom MIBs with containerized Telegraf, select the built-in `gosmi` translator, and map SNMP table rows into stable tagged metrics.

---

Telegraf's SNMP input polls individual OIDs and complete tables. In a container, numeric SNMP traffic can work while textual OIDs fail because the image cannot see your vendor MIBs or their imported dependencies. The fix is to mount a complete, readable MIB tree at a container path and point Telegraf's `gosmi` translator at that path.

Current InfluxData documentation encourages migration from the deprecated `netsnmp` translator to the built-in `gosmi` backend.

## Select `gosmi` Globally

The translator is an agent setting and applies to both SNMP input plugins (`inputs.snmp` and `inputs.snmp_trap`):

```toml
[agent]
  snmp_translator = "gosmi"
```

Do not install `snmptranslate` and assume Telegraf uses it. That external program belongs to the deprecated `netsnmp` backend. Diagnose the same backend that production runs.

## Mount the MIB Directory Read-Only

A Compose service can expose configuration and MIBs without baking secrets into an image:

```yaml
services:
  telegraf:
    image: telegraf:1.39.3
    restart: unless-stopped
    volumes:
      - ./telegraf.conf:/etc/telegraf/telegraf.conf:ro
      - ./mibs:/opt/telegraf/mibs:ro
    environment:
      SNMP_COMMUNITY: "${SNMP_COMMUNITY}"
```

Pin an exact image version compatible with the configuration instead of relying on a moving tag. Ensure every imported vendor and standard MIB is present beneath the mounted paths and readable by the container's Telegraf process.

The plugin's `path` setting is used by `gosmi` and is shared across all instances of all SNMP plugin types. Keep it consistent:

```toml
[[inputs.snmp]]
  agents = ["udp://switch-01.example.com:161"]
  version = 2
  community = "${SNMP_COMMUNITY:?SNMP_COMMUNITY is required}"
  path = [
    "/usr/share/snmp/mibs",
    "/opt/telegraf/mibs",
  ]
  timeout = "5s"
  retries = 3
  agent_host_tag = "source"
```

For sensitive or untrusted networks, prefer SNMPv3 authentication and privacy over a v2c community string.

## Define the Table and Its Identity

Collect a complete table with a textual, module-qualified OID:

```toml
  [[inputs.snmp.field]]
    oid = "SNMPv2-MIB::sysName.0"
    name = "sysName"
    is_tag = true

  [[inputs.snmp.table]]
    oid = "IF-MIB::ifTable"
    name = "interface"
    inherit_tags = ["sysName"]

    [[inputs.snmp.table.field]]
      oid = "IF-MIB::ifDescr"
      name = "ifDescr"
      is_tag = true

    [[inputs.snmp.table.field]]
      oid = "IF-MIB::ifOperStatus"
      name = "oper_status"
      conversion = "enum"
```

A table emits one metric per row. Index columns are normally added as tags automatically; `index_as_tag = true` is available when the table lacks usable indexes or they are excluded. Choose stable identity tags and avoid promoting volatile values to tags.

Nested table fields are only required for columns that need renaming, tagging, conversion, or selective collection. With a table-level `oid`, all columns are collected by default. To collect only chosen columns, omit the table `oid` and define the desired nested field OIDs.

The `enum` and `displayhint` conversions are supported by `gosmi`. Confirm that converting an integer status into its MIB label matches the schema expected by your queries.

## Validate MIB Resolution Inside the Container

Run the same image, mounts, configuration, user, DNS, and network as production:

```bash
docker compose run --rm telegraf \
  telegraf --config /etc/telegraf/telegraf.conf --test --input-filter snmp
```

Inspect errors for an unknown module, unresolved import, missing symbol, or permission failure. A MIB file named correctly can still fail when one of its `IMPORTS` modules is absent or has a mismatched module declaration.

A known numeric scalar OID, or explicit numeric table-column OIDs with the table-level `oid` omitted, can isolate translation from transport. A numeric table-level OID still needs MIB translation to discover its columns and indexes. If the numeric field works but the textual OID fails, focus on MIB loading. If both fail, check container DNS, routing, UDP/161 reachability, ACLs, version, credentials, timeout, and retries.

## Keep the Container Network in Scope

`localhost` inside the container is the container, not the Docker host or switch. Use resolvable device names or addresses reachable from the container network. SNMP polling normally sends UDP requests to port 161; publishing container ports is unnecessary for an outbound poller.

Capture packets on the appropriate host or container interface during diagnosis, and distinguish no response from a translation error. Avoid logging SNMPv3 passwords or community values.

## Official Documentation

- [SNMP input plugin](https://docs.influxdata.com/telegraf/v1/input-plugins/snmp/)
- [Telegraf agent `snmp_translator` setting](https://docs.influxdata.com/telegraf/v1/configuration/agent/#snmp)
- [Install and run the official Telegraf container](https://docs.influxdata.com/telegraf/v1/install/#download-and-install-telegraf)
- [Docker Compose file reference](https://docs.docker.com/reference/compose-file/)

## Conclusion

Containerized SNMP table collection is reliable when translation inputs are part of the deployment artifact: select `gosmi`, mount the complete MIB dependency tree read-only, use one consistent shared path, and test textual and numeric OIDs from inside the real container network. Then shape table indexes and tags for a stable, low-cardinality metric schema.
