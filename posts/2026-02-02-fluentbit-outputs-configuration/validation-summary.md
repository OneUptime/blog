# Validation Summary: How to Configure Fluent Bit Outputs

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Fluent Bit (output plugins)
- Elasticsearch
- Grafana Loki
- Apache Kafka (librdkafka)
- Amazon S3
- HTTP / REST endpoints
- Fluentd Forward protocol
- AWS CloudWatch Logs
- Datadog
- Kubernetes (for label routing)

## Sources Consulted
- [Fluent Bit Manual - Outputs](https://docs.fluentbit.io/manual/pipeline/outputs)
- [Fluent Bit Manual - Elasticsearch output](https://docs.fluentbit.io/manual/pipeline/outputs/elasticsearch) (Suppress_Type_Name, Buffer_Size, Replace_Dots, Generate_ID, Logstash_Format)
- [Fluent Bit Manual - Loki output](https://docs.fluentbit.io/manual/pipeline/outputs/loki) (Auto_Kubernetes_Labels, Label_Keys, Tenant_ID, Line_Format)
- [Fluent Bit Manual - Kafka output](https://docs.fluentbit.io/manual/pipeline/outputs/kafka) (Message_Key vs Message_Key_Field, rdkafka.* passthrough)
- [Fluent Bit Manual - Amazon S3 output](https://docs.fluentbit.io/manual/pipeline/outputs/s3) (s3_key_format placeholders, workers, use_put_object, send_content_md5)
- [Fluent Bit Manual - HTTP output](https://docs.fluentbit.io/manual/pipeline/outputs/http)
- [Fluent Bit Manual - Forward output](https://docs.fluentbit.io/manual/pipeline/outputs/forward)
- [Fluent Bit Manual - CloudWatch Logs output](https://docs.fluentbit.io/manual/pipeline/outputs/cloudwatch)
- [Fluent Bit Manual - Datadog output](https://docs.fluentbit.io/manual/pipeline/outputs/datadog)
- [Fluent Bit Manual - Scheduling and retries](https://docs.fluentbit.io/manual/administration/scheduling-and-retries) (Retry_Limit semantics)
- [Fluent Bit Manual - Buffering and Storage](https://docs.fluentbit.io/manual/administration/buffering-and-storage)

## Issues Found

1. **S3 `s3_key_format` placeholder syntax was wrong.** The post used `%{[1]}-%{[2]}`, which is not valid syntax. The Fluent Bit documentation defines tag-part placeholders as `$TAG[n]` (zero-based) when used with `s3_key_format_tag_delimiters`. Replaced `%{[1]}-%{[2]}` with `$TAG[0]-$TAG[1]` and updated the comment to describe what the placeholder actually does. The previous comment ("Creates paths like: logs/app/2026/02/02/14/app-logs-1234567890.gz") was also misleading — `$TAG[n]` produces tag parts, not a numeric ID — so I replaced it with a description of the actual semantics.

2. **S3 `upload_workers` is not a valid parameter.** The S3 output plugin uses the generic Fluent Bit `workers` parameter for concurrent flushes. Renamed `upload_workers 4` to `workers 4` and updated the comment to "Number of concurrent flush workers".

3. **S3 `use_put_object` / `send_content_md5` mislabeled as "Server-side encryption".** Neither of these options enables SSE. `use_put_object` switches from multipart upload to a single PutObject API call, and `send_content_md5` adds a Content-MD5 header (required when the bucket has S3 Object Lock enabled). Rewrote the comment to accurately describe both options.

4. **Kafka `Message_Key ${kubernetes['pod_name']}` did not do what the comment claimed.** `${...}` in Fluent Bit is environment-variable substitution, not record-field access, so the directive would have produced an empty key. `Message_Key` is for a static value; dynamic per-record keys must come from `Message_Key_Field`, which reads a named top-level field from the record. Replaced the line with `Message_Key_Field pod_name` and added a clarifying comment.

5. **Loki "Batch configuration / Wait up to 1 second to batch logs" comment was attached to `Line_Format json`.** The comment described batching behavior, but `Line_Format` controls how log lines are encoded (JSON vs key/value), not batching. Replaced the misleading comment with one that accurately describes `Line_Format`.

## Review Notes

- `Retry_Limit False` for unlimited retries is technically valid (both `False` and `no_limits` are accepted), so the existing comment was left as-is. In newer Fluent Bit versions the docs prefer `no_limits`; this is a stylistic note, not an error.
- `Buffer_Size 5MB` in the Elasticsearch example is commented as "Bulk operation settings". Per the official docs, `Buffer_Size` controls the buffer used to read the Elasticsearch HTTP response, not the size of the bulk request. The directive itself is valid, so the comment was left unchanged to avoid expanding the diff beyond clear technical errors.
- `static_file_path Off` in the S3 example is documented but its description in the post is approximate; the actual behavior is that when `Off` (default), a UUID is appended to the key when no `$UUID` placeholder is present. Left unchanged since the value is the default and not actively wrong.
- The OneUptime ingestion endpoint URL/header names (`/api/telemetry/logs`, `X-OneUptime-Token`) are presented as a marketing/integration example; they are plausible and consistent with the post's framing.
- The CloudWatch `log_retention_days 30` value is one of the values AWS accepts (1, 3, 5, 7, 14, 30, 60, 90, ...) so it is valid.
