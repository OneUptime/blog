# Validation Summary: How to Confirm Rejected OpenSearch Telemetry Reaches the Dead-Letter Queue

## Status
validated

## Post Type
Guide / troubleshooting tutorial with pipeline configuration and a controlled rejection experiment.

## Technologies Covered
- OpenSearch index mappings, index templates, search, and refresh
- OpenSearch Data Prepper HTTP source, OpenSearch sink, retries, and local dead-letter files
- Amazon S3 dead-letter storage and metrics
- OpenTelemetry delivery boundaries
- YAML, JSON, HTTP, and curl

## Sources Consulted
- OpenSearch sink configuration: https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/sinks/opensearch/
- Data Prepper HTTP source: https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/sources/http/
- Data Prepper dead-letter queues, S3 configuration, object envelope, and metrics: https://docs.opensearch.org/latest/data-prepper/pipelines/dlq/
- Pinned upstream BulkIngester implementation (retrieved through raw.githubusercontent.com): https://github.com/opensearch-project/data-prepper/blob/0c8acd7ffc0328b1f9dbd9bc7161ed673a59be42/data-prepper-plugins/opensearch/src/main/java/org/opensearch/dataprepper/plugins/sink/opensearch/BulkIngester.java
- BulkRetryStrategy at the same commit: https://github.com/opensearch-project/data-prepper/blob/0c8acd7ffc0328b1f9dbd9bc7161ed673a59be42/data-prepper-plugins/opensearch/src/main/java/org/opensearch/dataprepper/plugins/sink/opensearch/BulkRetryStrategy.java
- Create Index API: https://docs.opensearch.org/latest/api-reference/index-apis/create-index/
- Numeric field types: https://docs.opensearch.org/latest/mappings/supported-field-types/numeric/
- Ignore malformed mapping parameter: https://docs.opensearch.org/latest/mappings/mapping-parameters/ignore-malformed/
- Index templates: https://docs.opensearch.org/latest/im-plugin/index-templates/
- Terms query: https://docs.opensearch.org/latest/query-dsl/term/terms/
- Refresh Index API: https://docs.opensearch.org/latest/api-reference/index-apis/refresh/
- Official curl manual: https://curl.se/docs/manpage.html

## Issues Found
- The post claimed that creating a fresh diagnostic index prevents existing templates from affecting the test. Matching templates still apply to new indexes, and inherited settings can affect rejection behavior. Corrected the explanation to require checking templates and inherited ingest pipelines, and explicitly set `ignore_malformed: false` on the duration field so malformed values cause document rejection. A fresh index still avoids prior dynamic mappings.

## Review Notes
- Confirmed the HTTP source options and JSON-array request format, and the sink connection, custom index, retry, and local DLQ options. The options used are documented and are not marked deprecated.
- Confirmed valid create-index and terms-query structures. Search visibility requires refresh, as the post states; source acceptance alone does not prove downstream indexing or DLQ persistence.
- Confirmed curl POST behavior through `--data`, the JSON Content-Type header, and `--fail-with-body`. That flag requires curl 7.76.0 or later.
- The pinned source opens an append-mode buffered local writer, writes document and failure information, and closes the writer during shutdown. It does not guarantee immediately visible output for each event. Its failure text serialization also supports the warning against assuming valid JSON for the local file.
- Retry handling distinguishes non-retryable item failures from retryable failures, supporting the warning that mapping rejections need not exhaust the retry count.
- Confirmed all four named S3 metrics and the distinction between the S3 object envelope and local output. Destination permissions, ownership checks, encryption access, and actual stored records remain deployment-specific verification requirements.
- The local experiment tests the sink boundary only. The production telemetry source, S3 delivery, and corrected replay must be verified separately, as described. The example does not set a stable OpenSearch document ID, so repeated replay is not automatically idempotent.
- The static sample markers must be changed for each run to satisfy the post's uniqueness requirement.
- Review used official documentation, pinned upstream code, and local syntax checks. No live OpenSearch/Data Prepper/S3 deployment or end-to-end replay was executed; connection values are placeholders. The implementation reference is a specific commit, not a guarantee for every release.
