# Validation Summary: How to Configure the Google Cloud Pub/Sub Receiver

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- Google Cloud Pub/Sub
- Google Cloud Logging
- Google Cloud CLI
- Kubernetes / GKE
- OneUptime OTLP ingestion

## Sources Consulted
- OpenTelemetry Collector Contrib `googlecloudpubsubreceiver` README and package docs: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/receiver/googlecloudpubsubreceiver
- OpenTelemetry Collector Contrib `googlecloudpubsubreceiver` source README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/googlecloudpubsubreceiver
- OpenTelemetry Collector Contrib Google Cloud LogEntry encoding extension docs: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/extension/encoding/googlecloudlogentryencodingextension
- OpenTelemetry Collector internal telemetry docs: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector receiver registry: https://opentelemetry.io/docs/collector/components/receiver/
- Google Cloud Pub/Sub exactly-once delivery docs: https://cloud.google.com/pubsub/docs/exactly-once-delivery
- Google Cloud Pub/Sub dead-letter topics docs: https://cloud.google.com/pubsub/docs/dead-letter-topics
- Google Cloud CLI `gcloud pubsub subscriptions update` reference: https://docs.cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/update

## Issues Found
- The receiver was named `googlepubsub` throughout the examples, but the actual OpenTelemetry Collector Contrib receiver type is `googlecloudpubsub`. Updated all receiver names and pipeline references.
- The post claimed broad JSON/raw/protobuf/custom parsing directly in the receiver. Current receiver built-ins are OTLP protobuf encodings, with other formats handled through encoding extensions. Updated examples to use `otlp_proto_log`, `otlp_proto_metric`, and `google_cloud_logentry_encoding`.
- Several unsupported receiver fields were used, including `credentials_file`, `consumer`, `num_goroutines`, `max_extension`, `synchronous`, `logs`, `metrics`, `dead_letter_topic`, and `max_delivery_attempts`. Replaced these with supported fields such as `flow_control` and subscription-level Pub/Sub configuration.
- The post described receiver-level exactly-once processing semantics. Pub/Sub exactly-once delivery is a pull-subscription feature, not a receiver setting. Reworded claims and moved the command to subscription configuration.
- The Cloud Logging example attempted to map LogEntry JSON fields using non-existent receiver options. Replaced it with the supported Google Cloud LogEntry encoding extension.
- The production filtering example used outdated filter processor structure. Updated it to OTTL-style `log_record` conditions.
- The internal telemetry examples used the deprecated/ignored `service.telemetry.metrics.address` setting. Updated them to current `readers.pull.exporter.prometheus` configuration.
- Several metric names were invented or stale. Replaced them with current Collector internal telemetry names and the receiver's documented custom metrics.
- The architecture diagram implied separate subscriptions for horizontal scaling, which would duplicate work. Updated it to show multiple collectors consuming from a shared pull subscription.
- The Kubernetes example used an old Collector image tag. Updated it to `otel/opentelemetry-collector-contrib:0.153.0`, the current version observed during review.

## Review Notes
- `gcloud` is not installed in this workspace, so CLI flags were checked against Google Cloud's official command reference instead of local `--help`.
- YAML snippets were parsed successfully with PyYAML after edits.
- The `googlecloudpubsub` receiver is a community-provided OpenTelemetry Contrib component and is currently beta for traces, metrics, and logs.
