# Validation Summary: How to Diagnose Dotted OpenTelemetry Attribute Mapping Conflicts in Data Prepper

## Status
validated

## Post Type
Technical troubleshooting guide with OpenSearch REST API examples.

## Technologies Covered
- OpenSearch mappings, index templates, Bulk API, and index migration
- OpenSearch Data Prepper trace sources, codecs, OpenSearch sink, and dead-letter queues
- OpenTelemetry span attributes and OTLP
- OpenSearch Dashboards trace analysis

## Sources Consulted
- [OpenTelemetry common specification](https://opentelemetry.io/docs/specs/otel/common/): attribute keys, values, and uniqueness.
- [Data Prepper OTel trace source](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/sources/otel-trace-source/): supported output formats, default, and preserved dotted attributes in OTel-format documents.
- [Data Prepper OTLP source](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/sources/otlp-source/): unified source defaults and per-signal format settings.
- [Pinned OpenSearch-format codec implementation](https://github.com/opensearch-project/data-prepper/blob/0c8acd7ffc0328b1f9dbd9bc7161ed673a59be42/data-prepper-plugins/otel-proto-common/src/main/java/org/opensearch/dataprepper/plugins/otel/codec/OTelProtoOpensearchCodec.java): inspected through the corresponding raw GitHub file; verified prefixing and dot replacement.
- [Data Prepper OpenSearch sink](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/sinks/opensearch/): trace index types and DLQ support.
- [Disable objects mapping parameter](https://docs.opensearch.org/latest/mappings/mapping-parameters/disable-objects/): default dotted-path expansion, scalar/object conflicts, literal dotted fields, and creation-time restriction.
- [Get field mapping API](https://docs.opensearch.org/latest/api-reference/index-apis/get-field-mapping/): endpoint syntax and field wildcards.
- [Create index API](https://docs.opensearch.org/latest/api-reference/index-apis/create-index/): explicit mappings at index creation.
- [Index document API](https://docs.opensearch.org/latest/api-reference/document-apis/index-document/): POST requests with generated document IDs.
- [Bulk API](https://docs.opensearch.org/latest/api-reference/document-apis/bulk/): per-item outcomes and error inspection.
- [Create or update index mappings API](https://docs.opensearch.org/latest/api-reference/index-apis/put-mapping/): mapping retrieval examples, incompatible type changes, reindexing, and aliases.
- [Index templates](https://docs.opensearch.org/latest/im-plugin/index-templates/): templates apply when indexes are created and do not alter existing indexes.

## Issues Found
No technical issues found.

## Review Notes
- README.md was left unchanged. The post is technically relevant and includes valid REST request examples.
- Confirmed that the pinned codec transforms a span attribute named `http.method` into `span.attributes.http@method`. Its transformation also maps `a.b` and `a@b` to the same key, supporting the collision warning.
- Confirmed that `otel_trace_source` defaults to `opensearch`, whereas unified `otlp` defaults to `otel`. The documented sink index type for OTel trace output is `trace-analytics-plain-raw`.
- The diagnostic index maps `attributes.http` as a keyword. Under default dot expansion, indexing `attributes.http.method` requires an object at that same path and is expected to fail. Increasing a field-count limit cannot reconcile those incompatible structures.
- Checked the HTTP request syntax and JSON bodies. These are OpenSearch console-style requests, not shell commands. No live OpenSearch cluster or Data Prepper pipeline was used; runtime error wording and end-to-end replay were not tested.
- The `disable_objects` advice is deliberately release-dependent. Current documentation supports the described behavior and prohibits changing it after index creation; the post appropriately asks readers to verify their deployed release.
- The warning about additional normalization is relevant when a transform also touches generated prefix dots. Applying only the same dot-to-`@` replacement twice to an already normalized attribute key is idempotent.
- `http.method` is useful here as an illustrative incoming key; the post does not prescribe it as the current HTTP semantic-convention attribute name.
- The post's documentation links resolved to the intended references. The pinned GitHub source was retrieved successfully from raw.githubusercontent.com after the browser fetch failed.
