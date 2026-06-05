# Validation Summary: How to Monitor F5 BIG-IP Load Balancer Pool Health and Throughput

## Status
validated

## Post Type
Technical tutorial / monitoring guide

## Technologies Covered
- F5 BIG-IP
- SNMP / SNMPv2c
- F5 BIG-IP system and local traffic MIBs
- OpenTelemetry Collector contrib SNMP receiver
- OpenTelemetry OTLP exporter

## Sources Consulted
- OpenTelemetry Collector contrib SNMP receiver documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/receiver/snmpreceiver
- OpenTelemetry Collector receiver registry: https://opentelemetry.io/docs/collector/components/receiver/
- F5 BIG-IP external monitoring documentation: https://techdocs.f5.com/kb/en-us/products/big-ip_ltm/manuals/product/bigip-external-monitoring-implementations-11-6-0/12.html
- F5 External Monitoring of BIG-IP Systems guide, MIB file descriptions: https://techdocs.f5.com/content/kb/en-us/products/big-ip_ltm/manuals/product/bigip-external-monitoring-implementations-12-0-0/_jcr_content/pdfAttach/download/file.res/External_Monitoring_of_BIG-IP_Systems__Implementations.pdf
- F5-BIGIP-LOCAL-MIB derived OID references for virtual server, pool, and pool member objects: https://oidref.com/
- F5-BIGIP-SYSTEM-MIB derived OID references for memory and TMM counters: https://oidref.com/

## Issues Found
1. Incorrect F5 virtual server OIDs: The post used OIDs under `ltmVirtualServ` configuration/table branches for several stat metrics. Updated the virtual server stat OIDs to the `ltmVirtualServStatEntry` branch, including name, current connections, total connections, bytes in, and bytes out.

2. Incorrect F5 pool OIDs: The post used pool configuration table OIDs for pool statistics and an incorrect availability OID. Updated pool stat name/current-connections to `ltmPoolStatEntry` and pool availability to `ltmPoolStatusAvailState`.

3. Deprecated/incorrect pool member status OID: The post referenced old pool member table fields for status. Updated the status metric to `ltmPoolMbrStatusAvailState`, which the MIB references identify as the current replacement for deprecated pool member availability fields.

4. Incorrect pool member throughput/current-connection OIDs: Updated pool member current connections and bytes in/out to the `ltmPoolMemberStatEntry` branch and changed the displayed member identifier to node name.

5. Incorrect system CPU usage OID: The listed `1.3.6.1.4.1.3375.2.1.1.2.1.44.0` OID is memory total, not CPU usage. Replaced the example metric with `bigip.system.memory_total` and retained `bigip.system.memory_used`.

6. Invalid SNMP receiver attribute shape: The original config nested `oid` values directly inside metric `column_oids.attributes`. Current SNMP receiver docs define reusable receiver-level `attributes`, with metric column OIDs referencing them by name. Moved attribute OIDs to the receiver-level `attributes` block and updated the metric references.

7. Incomplete status enumeration: The current pool member availability enum includes `5 = gray (unlicensed)`. Added that value to the alerting section.

8. Multi-device example consistency: Added placeholder `attributes` blocks to the multiple receiver examples so they match the corrected receiver schema.

## Review Notes
- YAML snippets parse successfully with PyYAML.
- The local environment did not have `otelcol` or `otelcol-contrib` installed, so I could not run `otelcol validate`; validation was performed against the current SNMP receiver schema documentation and YAML parsing.
- The SNMP receiver is listed as a contrib receiver with alpha stability for metrics, so future Collector releases may change behavior or schema details.
