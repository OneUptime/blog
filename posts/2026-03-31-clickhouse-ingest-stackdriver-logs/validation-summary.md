# Validation Summary: How to Ingest Stackdriver Logs into ClickHouse

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Google Cloud Logging (Stackdriver)
- Google Cloud Pub/Sub
- Google Cloud Functions (1st gen, Python runtime)
- OpenTelemetry Collector (googlecloudpubsub receiver, clickhouse exporter)
- ClickHouse (MergeTree, LowCardinality, TTL, HTTP interface)
- `gcloud` CLI (logging sinks, pubsub topics)
- SQL (ClickHouse dialect)

## Sources Consulted
- gcloud logging sinks create reference: https://cloud.google.com/sdk/gcloud/reference/logging/sinks/create
- Google Cloud Logging export configuration: https://cloud.google.com/logging/docs/export/configure_export_v2
- OpenTelemetry Collector googlecloudpubsub receiver: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/googlecloudpubsubreceiver
- OpenTelemetry Collector ClickHouse exporter: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/clickhouseexporter
- ClickHouse HTTP interface (auth headers): https://clickhouse.com/docs/en/interfaces/http
- Cloud Functions 1st gen Pub/Sub tutorial: https://cloud.google.com/functions/1stgendocs/tutorials/pubsub-1st-gen
- ClickHouse LowCardinality: https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality
- ClickHouse TTL: https://clickhouse.com/docs/en/guides/developer/ttl
- ClickHouse MergeTree partitioning: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/custom-partitioning-key

## Issues Found
No technical issues found.

## Review Notes
- The `gcloud logging sinks create` example uses `resource.type="gke_container"` as the log filter. This is valid, but note that modern GKE workloads are generally emitted under `resource.type="k8s_container"`. `gke_container` is still a legitimate resource type (used by older clusters and some monitoring paths), so the example is not wrong — just a point of awareness if readers are on current GKE.
- The Cloud Function example is written for 1st-gen background-triggered Pub/Sub functions (signature `(event, context)`, base64-encoded `event['data']`). 2nd-gen Cloud Functions use a CloudEvent-based signature; if a reader is on 2nd gen, the signature would differ. The post does not specify a generation, which is acceptable given 1st gen is still fully supported.
- The ClickHouse exporter endpoint `tcp://clickhouse:9000` is valid; `clickhouse://` and `http(s)://` are also supported forms in current versions.
- The Pub/Sub topic is created *after* the sink in the shell example. This is functionally fine (the sink can reference a topic that doesn't yet exist), but readers typically want the topic (and the sink writer-identity IAM grant) in place before messages start flowing to avoid the initial dead-letter window. Not a correctness issue.
