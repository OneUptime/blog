# Validation Summary: How to Normalize Kubernetes Log Fields Before Indexing Them in OpenSearch

## Status
validated

## Post Type
Technical guide and configuration tutorial

## Technologies Covered

- Kubernetes container logging
- OpenTelemetry Collector Contrib and Kubernetes distributions
- OpenTelemetry File Log Receiver and container operator
- OpenTelemetry Kubernetes Attributes Processor
- OpenTelemetry semantic conventions and OTLP
- OpenSearch Data Prepper
- OpenSearch index templates, mappings, and search APIs

## Sources Consulted

- [OpenTelemetry Collector components for Kubernetes](https://opentelemetry.io/docs/platforms/kubernetes/collector/components/)
- [OpenTelemetry File Log Receiver](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md)
- [OpenTelemetry File Log Receiver component metadata](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/metadata.yaml)
- [OpenTelemetry container operator](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/container.md)
- [OpenTelemetry File Storage extension](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/storage/filestorage/README.md)
- [OpenTelemetry Kubernetes Attributes Processor](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/k8sattributesprocessor/README.md)
- [OpenTelemetry Kubernetes Attributes Processor component metadata](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/k8sattributesprocessor/metadata.yaml)
- [OpenTelemetry Kubernetes semantic conventions](https://opentelemetry.io/docs/specs/semconv/resource/k8s/)
- [OpenTelemetry deployment attributes](https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/)
- [OpenSearch Data Prepper OTLP source](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/sources/otlp-source/)
- [OpenSearch Data Prepper OTel logs source](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/sources/otel-logs-source/)
- [OpenSearch Data Prepper rename-keys processor](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/processors/rename-keys/)
- [OpenSearch Data Prepper OpenSearch sink and DLQ options](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/sinks/opensearch/)
- [OpenSearch index templates](https://docs.opensearch.org/latest/im-plugin/index-templates/)
- [OpenSearch dynamic mapping parameter](https://docs.opensearch.org/latest/mappings/mapping-parameters/dynamic/)
- [OpenSearch mapping explosion guidance](https://docs.opensearch.org/latest/mappings/mapping-explosion/)
- [OpenSearch flat object field type](https://docs.opensearch.org/latest/field-types/flat-object/)
- [OpenSearch field capabilities API](https://docs.opensearch.org/latest/api-reference/search-apis/field-caps/)
- [OpenSearch Search API](https://docs.opensearch.org/latest/api-reference/search-apis/search/)

## Issues Found

- The Collector snippets used the deprecated component aliases `filelog` and `k8sattributes`. Changed them to the current component IDs `file_log` and `k8s_attributes` in both declarations and pipeline references.
- The multiline explanation did not distinguish runtime-split CRI records from application-level multiline records. Clarified that the container operator recombines CRI partial records automatically, while application stack traces need a format-specific `recombine` rule.
- The durable-offset guidance did not state how the receiver and extension are connected. Clarified that `file_log.storage` must reference a configured `file_storage` extension whose directory is backed by persistent storage when offsets must survive restarts.
- The Collector-to-Data Prepper path did not project OTLP log events into the advertised top-level schema. Added an explicit unified `otlp` source format and `rename_keys` entries for the OTel envelope fields and resource attributes.
- The canonical contract allowed either `body` or `message`, but the mapping indexed only `body`. Standardized the contract on `body` and added a legacy `message`-to-`body` rename.
- The explicit mapping omitted `deployment.environment.name`, `k8s.cluster.name`, `k8s.deployment.name`, and the allow-listed `app.team` field. Added keyword mappings so `dynamic: false` does not leave those intended searchable fields only in `_source`.
- The phrase describing `_source` and `flat_object` implied equivalent non-indexed behavior. Clarified that `_source`-only retention and the limited query behavior of a mapped `flat_object` are different choices.
- The template was described as applying to an index or data stream, but the example lacks the top-level `data_stream` declaration required for a data-stream template. Narrowed the statement to ordinary indexes.
- The Data Prepper text incorrectly attributed rename-chain behavior to ingestion order. Corrected it to processor-entry order, which is what controls sequential renames.
- The field-capabilities check omitted several fields in the canonical contract. Expanded it to cover the environment, allow-listed label, span ID, and all Kubernetes fields.

## Review Notes

- `index.mapping.total_fields.limit` is valid, although `1000` is already the OpenSearch default.
- `dynamic: false` correctly retains unknown fields in `_source` without indexing or making them searchable. `dynamic: strict` rejects the entire indexing operation for an unknown field, so the post's DLQ warning is appropriate.
- For large clusters, a DaemonSet Collector should usually set `k8s_attributes.filter.node_from_env_var` using the Kubernetes Downward API so each agent watches only pods on its node.
- Connection-based pod association is useful for network receivers but generally has no peer connection context for locally tailed files; the UID association supplied by the container operator is the effective rule in this pipeline.
- Mapping `body` as `text` assumes the normalized body is a string. Pipelines that accept structured OpenTelemetry bodies must stringify them or map them separately before indexing.
