# Validation Summary: How to Set Up Ceph Metrics in Zabbix

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- Ceph (storage cluster, manager Prometheus module)
- Zabbix (monitoring platform, HTTP agent, external checks, API, templates, triggers)
- Rook (Kubernetes Ceph operator)
- Prometheus (metrics endpoint / preprocessing)
- Kubernetes (service patching)
- jq (JSON parsing in shell scripts)

## Sources Consulted
- Zabbix API documentation for item preprocessing types (type 22 = Prometheus pattern, type 23 = Prometheus to JSON): https://www.zabbix.com/documentation/6.0/en/manual/api/reference/item/object
- Zabbix external checks documentation (key format): https://www.zabbix.com/documentation/current/en/manual/config/items/itemtypes/external
- Zabbix item key format documentation: https://www.zabbix.com/documentation/current/en/manual/config/items/item/key
- Zabbix trigger expression documentation: https://www.zabbix.com/documentation/current/en/manual/config/triggers/expression
- Zabbix XML export/import templates: https://www.zabbix.com/documentation/current/en/manual/xml_export_import/templates
- Ceph Prometheus module documentation (port 9283, enable command): https://docs.ceph.com/en/quincy/mgr/prometheus/
- Ceph status JSON output format (Quincy/Reef): https://docs.ceph.com/en/latest/rados/operations/monitoring/
- Rook Ceph monitoring documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Monitoring/ceph-monitoring/

## Issues Found

1. **Preprocessing type ID was wrong (Step 2)**: The blog used preprocessing `"type": 23` (Prometheus to JSON) instead of `"type": 22` (Prometheus pattern). Type 22 extracts a single metric value, which is what's needed here. Changed to `22`.

2. **Preprocessing params format was wrong (Step 2)**: The blog used `"params": "ceph_health_status\n\n\\1"` which mixes regex back-reference syntax (`\1`) with Prometheus pattern preprocessing. The correct format for Prometheus pattern is `"<pattern>\n<output>"`. Changed to `"ceph_health_status\nvalue"`.

3. **External check key format was wrong (Step 4)**: The blog used `external["/usr/lib/zabbix/externalscripts/ceph_metrics.sh","health"]` as the item key. Zabbix external check keys use just the script name (without full path or `external` prefix), as Zabbix automatically looks in the ExternalScripts directory. Changed to `ceph_metrics.sh[health]` and `ceph_metrics.sh[osd_up]`.

4. **Missing item type in XML template (Step 4)**: The template XML items were missing the `<type>` element. External check items require `<type>EXTERNAL_CHECK</type>` for Zabbix to process them correctly. Added to both items.

5. **Trigger expression used wrong key (Step 4)**: The trigger expression referenced the old incorrect key format. Updated to match the corrected item key: `{Ceph Cluster:ceph_metrics.sh[health].str(HEALTH_OK)}=0`.

6. **Incorrect version claim for Prometheus support (Step 5)**: The blog stated "Zabbix 6.0+ supports native Prometheus scraping" but Prometheus preprocessing has been available since Zabbix 4.2 (enhanced in 6.0). Updated the text to reflect the correct version history.

7. **Missing caveat for Rook service patching (Step 1)**: Added a comment noting that the Rook operator may revert manual service patches during reconciliation, and suggesting more durable alternatives (separate NodePort service or ServiceMonitor) for production use.

## Review Notes
- The Ceph-specific commands and JSON paths (`.health.status`, `.osdmap.num_up_osds`, `.pgmap.bytes_total`, etc.) are correct for modern Ceph versions (Quincy/Reef).
- The default Ceph Prometheus module port (9283) is correct.
- The shell script in Step 3 uses shell variable expansion inside a double-quoted jq filter, which works but is not the most idiomatic approach. Using `jq --arg metric "$METRIC"` with single-quoted jq would be safer against injection. This is a best-practice concern rather than a functional bug, so it was left as-is.
- The Zabbix graph.create API call in Step 6 is structurally correct.
- The trigger expression uses the legacy Zabbix trigger syntax (`{host:key.function()}=N`). Zabbix 5.4+ introduced a new expression syntax (`function(/host/key)`), but the legacy format is still supported for backward compatibility.
