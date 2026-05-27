# Validation Summary: How to Monitor Cloud Interconnect Link Utilization and Health in GCP

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Google Cloud Interconnect
- Cloud Monitoring metrics, dashboards, and alerting policies
- Google Cloud CLI (`gcloud`)
- Terraform `google_monitoring_dashboard`
- Cloud Router BGP status
- Google Cloud Compute Python client library
- BigQuery for metric history analysis

## Sources Consulted
- Google Cloud Interconnect monitoring guide: https://docs.cloud.google.com/network-connectivity/docs/interconnect/how-to/monitoring
- Google Cloud Monitoring metrics reference for Cloud Interconnect: https://docs.cloud.google.com/monitoring/api/metrics_gcp_i_o#interconnect
- Google Cloud Monitoring monitored resource types: https://docs.cloud.google.com/monitoring/api/resources
- `gcloud alpha monitoring policies create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/alpha/monitoring/policies/create
- Cloud Monitoring aggregation documentation: https://docs.cloud.google.com/monitoring/api/v3/aggregation
- `gcloud compute interconnects get-diagnostics` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/interconnects/get-diagnostics
- Compute Engine `interconnects.getDiagnostics` REST reference: https://docs.cloud.google.com/compute/docs/reference/rest/v1/interconnects/getDiagnostics
- `gcloud compute routers get-status` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/routers/get-status
- Compute Engine `routers.getRouterStatus` REST reference: https://docs.cloud.google.com/compute/docs/reference/rest/v1/routers/getRouterStatus
- Python `RoutersClient.get_router_status` reference: https://cloud.google.com/python/docs/reference/compute/latest/google.cloud.compute_v1.services.routers.RoutersClient
- Cloud Monitoring metric export architecture guide: https://docs.cloud.google.com/architecture/monitoring-metric-export

## Issues Found
- The post used the obsolete/incorrect `compute.googleapis.com` namespace for Interconnect metrics. Updated examples to use the current `interconnect.googleapis.com` namespace.
- Several metric type names were incorrect, including link byte counters, optical power, operational status, and attachment sent counters. Updated them to current metric names such as `network/interconnect/sent_bytes_count`, `network/interconnect/link/rx_power`, `network/interconnect/link/operational`, and `network/attachment/sent_bytes_count`.
- The post implied Partner Interconnect exposes physical Interconnect metrics. Added the documented distinction that Dedicated Interconnect reports Interconnect and attachment metrics, while Partner Interconnect reports attachment metrics.
- The `gcloud monitoring time-series list` example filtered on a non-existent `resource.labels.interconnect_name` label and showed raw integer DELTA values for utilization. Updated it to filter on `resource.labels.interconnect`, use `ALIGN_RATE`, and display `doubleValue`.
- The `date -u -v-1H` example was BSD/macOS-specific. Replaced it with the GNU-compatible `date -u -d "1 hour ago"` form used in Google Cloud Linux shells.
- Dashboard metric filters used incorrect metric types and a numeric mean aligner for a boolean operational metric. Updated filters and used `ALIGN_FRACTION_TRUE` for the boolean operational status metric.
- Alert policy commands used unsupported flags such as `--condition-comparison`, `--condition-threshold-value`, and `--condition-duration`. Replaced them with the documented `--if`, `--duration`, and `--aggregation` flags.
- Bandwidth and optical-power alerts used incorrect metric names and omitted required alignment for DELTA byte counters. Updated them to use current metric names and appropriate aligners.
- The BGP section called `get-status` output "Cloud Router metrics." Reworded this to "Cloud Router status" because the command returns runtime status, not Cloud Monitoring metrics.
- Removed an unused `json` import from the Python sample.
- The capacity-planning section incorrectly used a Cloud Logging sink to export Cloud Monitoring metric data. Replaced it with a Monitoring API / `gcloud monitoring time-series list` export pattern and adjusted the sample BigQuery query to match an exported time-series schema.

## Review Notes
The optical threshold table is vendor/transceiver-specific. Google Cloud diagnostics exposes current optical power plus state and recommends setting warnings relative to a known-good value; future revisions could make that caveat more explicit.
