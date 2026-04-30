# Validation Summary: How to Use Grafana to Visualize SNMP and NetFlow Data

## Status
validated

## Post Type
Guide

## Technologies Covered
- Grafana
- InfluxDB OSS 2.x
- Telegraf
- SNMP
- NetFlow
- IPFIX
- Flux

## Sources Consulted
- InfluxDB OSS v2 install docs: https://docs.influxdata.com/influxdb/v2/install/
- InfluxDB OSS v2 setup docs: https://docs.influxdata.com/influxdb/v2/get-started/setup/
- InfluxDB OSS v2 bucket creation docs: https://docs.influxdata.com/influxdb/v2/admin/buckets/create-bucket/
- Telegraf SNMP input plugin docs: https://docs.influxdata.com/telegraf/v1/input-plugins/snmp/
- Telegraf NetFlow input plugin docs: https://docs.influxdata.com/telegraf/v1/input-plugins/netflow/
- Telegraf InfluxDB v2 output plugin docs: https://docs.influxdata.com/telegraf/v1/output-plugins/influxdb_v2/
- Telegraf configuration and metric filtering docs: https://docs.influxdata.com/telegraf/v1/configuration/
- Telegraf converter processor docs: https://docs.influxdata.com/telegraf/v1/processor-plugins/converter/
- Grafana Debian/Ubuntu install docs: https://grafana.com/docs/grafana/latest/setup-grafana/installation/debian/
- Grafana start server docs: https://grafana.com/docs/grafana/latest/setup-grafana/start-restart-grafana/
- Grafana sign-in docs: https://grafana.com/docs/grafana/latest/setup-grafana/sign-in-to-grafana/
- Grafana InfluxDB data source docs: https://grafana.com/docs/grafana/latest/datasources/influxdb/
- Grafana add InfluxDB data source walkthrough: https://grafana.com/docs/learning-paths/influxdb-data-source/add-data-source/
- Cisco SNMP CPU utilization guidance for `cpmCPUTotal5minRev`: https://www.cisco.com/c/en/us/support/docs/ip/simple-network-management-protocol-snmp/15215-collect-cpu-util-snmp.html

## Issues Found
- The original InfluxDB installation section used `influx setup` after installing only the server package. InfluxDB OSS v2 documents that the `influx` CLI is packaged separately from `influxd`, so I replaced that flow with the current repository install path and UI-based initial setup.
- The original instructions created only the `network` bucket, but the NetFlow output wrote to a `netflow` bucket. I updated the setup instructions to create the second bucket.
- The SNMP example defined `hostname` as a field and then attempted to inherit it as a tag in the interface table. Telegraf only inherits tags, so I added `is_tag = true`.
- The SNMP example relied on the deprecated default `agent_host` tag behavior. I set `agent_host_tag = "source"` to use the current tag name documented by Telegraf.
- The Cisco CPU OID used a hard-coded `.7` index. Cisco documents `cpmCPUTotal5minRev` as table-backed and indexed by `cpmCPUTotalIndex`, so I changed the example to `.1` and added a note that the index may need to be adjusted per device.
- The SNMP table configuration mixed `IF-MIB::ifXTable` with `IF-MIB::ifDescr`, which belongs to a different interface table. Telegraf documents omitting the table OID when selecting specific columns, so I removed the table OID and kept the explicit field OIDs.
- The two `outputs.influxdb_v2` blocks would have written all metrics to both buckets. I added `namedrop` and `namepass` filters so SNMP data goes to `network` and NetFlow data goes to `netflow`.
- The NetFlow section added a new Telegraf service input but did not restart Telegraf afterward. I added the restart command.
- The top-talkers query grouped by `src`, but Telegraf's NetFlow plugin exposes `src` as a field by default, not a tag. I added a `processors.converter` rule so Grafana can group by source IP as shown.
- The top-talkers query filtered only `in_bytes`, which would miss IPFIX examples that use fields such as `in_total_bytes`. I updated the query to accept both field names.
- The Grafana navigation path referenced the older sidebar layout. I updated it to the current `Connections > Data sources > Add new data source` flow.

## Review Notes
- InfluxDB's OSS v2 documentation is still maintained, but the docs explicitly note that InfluxDB 3 Core is the latest stable InfluxDB release. This post remains technically valid because it intentionally uses Flux queries and Grafana's InfluxDB 2.x support.
- Converting `src` into a tag makes the top-talkers example work, but it also increases series cardinality. Large NetFlow deployments may want a more conservative tag strategy.
- The post still uses textual SNMP OIDs. That is valid per Telegraf documentation, but some environments may prefer numeric OIDs or explicitly managed MIB files to avoid translator issues.
