# Validation Summary: How to Handle Right-to-Erasure Requests When Telemetry Data is in Storage

## Status
validated

## Post Type
Guide / implementation tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry semantic conventions
- OpenTelemetry Python tracing API
- OpenTelemetry Collector transform processor and OTTL
- OpenTelemetry Collector Elasticsearch exporter
- OpenTelemetry Collector AWS S3 exporter
- Elasticsearch / OpenSearch delete-by-query
- Grafana Tempo
- Jaeger with Cassandra storage
- AWS S3 / Boto3
- GDPR right to erasure

## Sources Consulted
- OpenTelemetry end-user semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/attributes/enduser/
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Collector processor registry: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/transformprocessor
- OpenTelemetry OTTL functions README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/pkg/ottl/ottlfuncs
- OpenTelemetry Collector Elasticsearch exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/elasticsearchexporter
- OpenTelemetry Collector AWS S3 exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/awss3exporter
- Elasticsearch delete-by-query API documentation: https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-delete-by-query.html
- OpenSearch delete-by-query API documentation: https://docs.opensearch.org/latest/api-reference/document-apis/delete-by-query/
- Grafana Tempo CLI documentation: https://grafana.com/docs/tempo/latest/operations/tempo_cli/
- Grafana Tempo compaction documentation: https://grafana.com/docs/tempo/latest/operations/compaction/
- Jaeger Cassandra schema: https://github.com/jaegertracing/jaeger/blob/main/internal/storage/v1/cassandra/schema/v004.cql.tmpl
- Boto3 S3 list_objects_v2 documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/list_objects_v2.html
- Boto3 S3 put_object documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/s3/bucket/put_object.html
- Official GDPR text, Regulation (EU) 2016/679: https://eur-lex.europa.eu/eli/reg/2016/679/oj?locale=EN
- European Commission right-to-erasure guidance: https://commission.europa.eu/law/law-topic/data-protection/rules-business-and-organisations/dealing-citizens/do-we-always-have-delete-personal-data-if-person-asks_en

## Issues Found
- The Collector configuration snippets referenced `otlp`, `batch`, and exporters without defining all required components. I added minimal receiver, processor, and exporter definitions so the snippets are internally consistent Collector configs.
- The Tempo section said selective deletion was not supported and listed only manual-style options. I updated the wording to clarify that Tempo does not delete individual spans or attributes through a normal query API, but recent versions provide `tempo-cli redact` for removing whole traces by trace ID from object storage.
- The Jaeger Cassandra script queried `tag_index` without the required `service_name` partition key and deleted from a `span_index` table that is not present in the current Jaeger Cassandra v1 schema. I changed the script to search per service using `(service_name, tag_key, tag_value)`, delete matching trace partitions from `traces`, and remove the matching `tag_index` partition.
- The S3 archive script used one `list_objects_v2` call, which only returns up to 1,000 keys. I changed it to use a Boto3 paginator so larger archives are scanned.
- The transform processor example used unqualified OTTL paths such as `attributes` and `body`. I updated them to current explicit `span.attributes` and `log.body` paths used in current transform processor documentation.
- The email redaction regex used `[A-Z|a-z]`, which treats `|` as a literal character inside the class. I corrected it to `[A-Za-z]`.
- The retention section said GDPR response is usually within 30 days. I changed this to "within one month" to match GDPR Article 12 wording.
- The Elasticsearch ILM example was fenced as YAML even though it is a console request with JSON body. I changed the code fence to `console`.

## Review Notes
The post is technically relevant and has been validated after corrections. Backend-specific erasure workflows remain operationally sensitive: exact Elasticsearch mappings, Jaeger services, Tempo version, object formats, legal exceptions, backups, and retention controls should still be verified for each deployment.
