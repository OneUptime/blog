# Validation Summary: How to Set Up Ceph Metrics in Splunk

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (Ceph manager Prometheus module)
- Splunk Observability Cloud / Splunk Enterprise
- Splunk OpenTelemetry Collector (Helm chart)
- Prometheus receiver (OpenTelemetry Collector)
- Splunk HEC (HTTP Event Collector) exporter
- SPL (Search Processing Language)
- Splunk REST API (saved searches / alerts)
- Kubernetes / Helm

## Sources Consulted
- Ceph Prometheus Module documentation: https://docs.ceph.com/en/latest/mgr/prometheus/
- Splunk OTel Collector Helm chart repository: https://github.com/signalfx/splunk-otel-collector-chart
- Splunk HEC exporter documentation: https://help.splunk.com/en/splunk-observability-cloud/manage-data/splunk-distribution-of-the-opentelemetry-collector/get-started-with-the-splunk-distribution-of-the-opentelemetry-collector/collector-components/exporters/splunk-hec-exporter
- Splunk OTLP exporter documentation: https://help.splunk.com/en/splunk-observability-cloud/manage-data/splunk-distribution-of-the-opentelemetry-collector/get-started-with-the-splunk-distribution-of-the-opentelemetry-collector/collector-components/exporters/otlp-exporter
- Splunk savedsearches.conf documentation: https://docs.splunk.com/Documentation/Splunk/9.1.2/Admin/Savedsearchesconf
- Splunk REST API tutorials (saved searches): https://help.splunk.com/en/splunk-cloud-platform/leverage-rest-apis/rest-api-tutorials/10.2.2510/rest-api-tutorials/creating-searches-using-the-rest-api

## Issues Found
1. **Step 4 - Incorrect exporter name in description**: The text said "use the OTLP exporter with the HTTP Event Collector" but the configuration block uses the `splunk_hec` exporter, which is a distinct component from the OTLP exporter. Changed "OTLP exporter" to "Splunk HEC exporter" to match the actual configuration shown.

2. **Step 6 - Missing scheduling parameters for Splunk alert**: The curl command to create a saved search alert was missing `is_scheduled=1` and `cron_schedule` parameters. Without these, the saved search would be created but would never run automatically, making it non-functional as an alert. Added `is_scheduled=1` and `cron_schedule=*/5 * * * *` to ensure the alert runs every 5 minutes.

## Review Notes
- The Ceph MGR Prometheus module default port (9283) is correct.
- The Helm chart repository URL and chart name for the Splunk OTel Collector are correct.
- The Prometheus receiver YAML structure for the Helm values file follows the expected schema.
- The Ceph metric names used in the relabel config (`ceph_health_status`, `ceph_osd_up`, `ceph_osd_in`, `ceph_pool_bytes_used`, `ceph_pool_max_avail`, `ceph_mon_quorum_status`, `ceph_osd_apply_latency_ms`) are valid Ceph Prometheus metrics.
- The SPL queries use `mstats` which is correct for querying Splunk's metrics index, and the dot-notation metric names (e.g., `ceph.health_status`) are consistent with how the Splunk OTel Collector stores Prometheus metrics.
- The Ceph health status values (0=OK, 1=WARN, 2=ERR) used in the SPL `case` expression are correct.
- The Kubernetes service DNS name `rook-ceph-mgr.rook-ceph.svc.cluster.local` is the standard format for Rook-Ceph deployments.
