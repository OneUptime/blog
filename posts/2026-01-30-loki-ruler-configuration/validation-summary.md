# Validation Summary: How to Build Loki Ruler Configuration

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Grafana Loki
- Loki Ruler
- LogQL
- Alertmanager
- Prometheus remote write
- Amazon S3
- Google Cloud Storage

## Sources Consulted
- Grafana Loki configuration parameters: https://grafana.com/docs/loki/latest/configure/
- Grafana Loki alerting and recording rules: https://grafana.com/docs/loki/latest/alert/
- Grafana Loki HTTP API reference: https://grafana.com/docs/loki/latest/reference/loki-http-api/
- Grafana Loki metric queries / LogQL range aggregations: https://grafana.com/docs/loki/latest/query/metric_queries/

## Issues Found
- The basic configuration described `ruler.storage.local.directory` as temporary rule storage and `rule_path` as an API path prefix. Updated the comments to match Loki's configuration reference: storage is the backend rule source, and `rule_path` stores temporary rule files.
- `enable_alertmanager_v2` was described as enabling alerting functionality. Updated the comment to clarify that it selects Alertmanager API v2.
- The GCS example described `service_account` as a file path. Updated it to show JSON key content, which is what Loki's `gcs.service_account` field expects.
- Added a note that local ruler storage is read-only for the Ruler API. Local files can be evaluated, but API-based create/update/delete operations require a writable backend such as S3 or GCS.
- Updated recording-rule remote write examples from deprecated `remote_write.client` to the current `remote_write.clients` map.
- Removed the `X-Scope-OrgID` header from the Mimir remote write example because Loki drops `X-Scope-OrgID` entries specified under remote write client `headers`; Loki has a dedicated `add_org_id_header` setting for tenant IDs.
- Changed the Alertmanager URL comment to avoid implying that a comma-separated URL list alone is the HA discovery mechanism.
- Corrected the troubleshooting advice that implied `enable_api: true` is required for rules to be evaluated. It is required for the Ruler API, not for basic evaluation from configured rule storage.

## Review Notes
The post still uses the commonly documented `ruler.storage` examples. Loki's current configuration reference marks this block as deprecated in favor of `ruler_storage` CLI/YAML options, while the official alerting examples still show `ruler.storage`. A future refresh could modernize all storage examples around `ruler_storage` once the official examples are aligned.
