# Validation Summary: How to Track Incident Metrics MTTR MTTD and MTBF

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Monitoring
- Cloud Monitoring alerts and incidents
- Cloud Monitoring custom metrics
- BigQuery
- BigQuery bq CLI
- Python Google Cloud client libraries
- SRE incident metrics: MTTR, MTTD, and MTBF

## Sources Consulted
- Google Cloud Monitoring incidents for metric-based alerting policies: https://docs.cloud.google.com/monitoring/alerts/incidents-events
- Google Cloud Monitoring API, projects.alerts resource: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.alerts
- Google Cloud Monitoring API, projects.alerts.list method: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.alerts/list
- Google Cloud Monitoring gRPC reference, AlertService: https://docs.cloud.google.com/monitoring/api/ref_v3/rpc/google.monitoring.v3
- Google Cloud Monitoring custom metrics API guide: https://docs.cloud.google.com/monitoring/custom-metrics/creating-metrics
- BigQuery schema and bq mk documentation: https://docs.cloud.google.com/bigquery/docs/schemas
- BigQuery table creation documentation: https://docs.cloud.google.com/bigquery/docs/tables

## Issues Found
- The post claimed incidents should be fetched by listing alert policies and querying Cloud Logging audit-log payloads for incident state changes. I changed the example to use Cloud Monitoring's documented REST alerts API, because official documentation exposes alerting incident records as read-only alerts under `projects.alerts` and the latest checked Python client package did not expose an `AlertServiceClient`.
- The post described each incident as having an acknowledgment timestamp available for calculations. I removed that claim from the API-based workflow because the documented alerts resource provides `openTime`, `closeTime`, and state, but not an acknowledgment timestamp field.
- The MTTD example calculated time from alert open to acknowledgment, which is not MTTD and depended on a timestamp not available in the documented alerts API. I changed it to calculate MTTD from an externally supplied issue start timestamp to the alert open timestamp.
- The BigQuery export example did not include MTTD even though the post discusses tracking MTTD. I added an `mttd_minutes` field to the row and table schema.
- The custom metric example used `datetime.utcnow()` without importing `datetime`. I added the import and used timezone-aware UTC timestamps.
- The post implied Cloud Monitoring alone provides all raw data needed for MTTD. I clarified that Monitoring provides alert open and close times, while true MTTD also needs an issue start time from logs, synthetic checks, SLO data, or incident records.

## Review Notes
The Cloud Monitoring alerts API is documented as Public Preview, so readers should verify API availability and client-library support in their environment before relying on it for production reporting.
