# Validation Summary: How to Reduce Duplicate Peer Forwarding in OpenSearch Trace Pipelines

## Status
validated

## Post Type
Technical configuration guide.

## Technologies Covered
- OpenSearch and Trace Analytics indexes.
- OpenSearch Data Prepper pipelines, trace processors, and core Peer Forwarder.
- OpenTelemetry spans and OTLP ingestion.
- YAML configuration and TLS.

## Sources Consulted
- Trace Peer Forwarder processor reference: https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/processors/trace-peer-forwarder/
- Pinned processor implementation linked by the post (retrieved through the corresponding raw GitHub URL): https://github.com/opensearch-project/data-prepper/blob/0c8acd7ffc0328b1f9dbd9bc7161ed673a59be42/data-prepper-plugins/trace-peer-forwarder-processor/src/main/java/org/opensearch/dataprepper/plugins/processor/TracePeerForwarderProcessor.java
- OTel trace source configuration: https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/sources/otel-trace-source/
- OTel trace processor reference: https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/processors/otel-traces/
- Service map processor reference: https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/processors/service-map/
- Core Peer Forwarder discovery, security, and metrics: https://docs.opensearch.org/latest/data-prepper/managing-data-prepper/peer-forwarder/
- Data Prepper global configuration: https://docs.opensearch.org/latest/data-prepper/managing-data-prepper/configuring-data-prepper/
- Pipeline source configuration: https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/sources/pipeline/
- OpenSearch sink configuration: https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/sinks/opensearch/
- Remote forwarding implementation: https://github.com/opensearch-project/data-prepper/blob/main/data-prepper-core/src/main/java/org/opensearch/dataprepper/core/peerforwarder/RemotePeerForwarder.java
- Peer forwarding HTTP service: https://github.com/opensearch-project/data-prepper/blob/main/data-prepper-core/src/main/java/org/opensearch/dataprepper/core/peerforwarder/server/PeerForwarderHttpService.java
- Trace processor registration and identification keys: https://github.com/opensearch-project/data-prepper/blob/main/data-prepper-plugins/otel-trace-raw-processor/src/main/java/org/opensearch/dataprepper/plugins/processor/oteltrace/OTelTraceRawProcessor.java
- Service map registration and identification keys: https://github.com/opensearch-project/data-prepper/blob/main/data-prepper-plugins/service-map-stateful/src/main/java/org/opensearch/dataprepper/plugins/processor/ServiceMapStatefulProcessor.java
- OpenTelemetry tracing API and span identity: https://opentelemetry.io/docs/specs/otel/trace/api/

## Issues Found
- The raw-output completeness check used unique span IDs alone. Changed it to unique `(traceId, spanId)` pairs so that spans from different traces are distinguished. OpenTelemetry identifies a span through its span context, which includes both identifiers. No pipeline configuration changes were needed.

## Review Notes
- Parsed the YAML with PyYAML and checked all three pipeline names, both fan-out destinations, reciprocal child source references, and entry processor placement. There are no terminal commands in the post.
- Confirmed source port, TLS option spelling, and `output_format: opensearch`; confirmed sink connection fields and both Trace Analytics index types. Certificates, endpoint, credentials, and global peer discovery remain deployment prerequisites as stated.
- Confirmed that `trace_peer_forwarder` supplies `traceId` as its routing key and passes records through without computing trace groups or service relationships. The raw and map processors use the same key. Moving forwarding ahead of the split is the documented optimization, not record or indexing deduplication.
- Verified current processor names directly in plugin annotations because some documentation examples still use the deprecated aliases `otel_trace_raw` and `service_map_stateful`.
- Confirmed `local_node` processes locally, peer routing uses a hash ring, and membership changes can affect placement. The HTTP receiver uses pipeline and processor identifiers, supporting the consistent-graph rollout guidance.
- Source code confirms record counters including `recordsSuccessfullyForwarded`, `recordsToBeForwarded`, and `recordsFailedForwarding`, plus request success/failure counters. It also confirms local fallback on forwarding failures; failure to write to the fallback buffer can still drop records. Network bytes and CPU require suitable deployment monitoring.
- The advice to measure records and bytes instead of demanding an exact request-count reduction is appropriate because batching and local ownership affect requests.
- `service_map` remains supported for the illustrated static Trace Analytics service map. The documentation also describes `otel_apm_service_map` for time-based service maps; migrating to that different topology is outside this post's scope.
- The post intentionally assumes a compatible Data Prepper release rather than claiming a minimum version. Documentation and main-branch source checks do not establish compatibility with every historical release.
- Verified both technical links in the post; the pinned GitHub implementation was accessible through raw.githubusercontent.com when the browser fetch failed.
- Review consisted of documentation/source inspection and local YAML validation. No multi-node Data Prepper/OpenSearch deployment or runtime traffic benchmark was executed, so performance and output completeness still require the staging checks described in the post.
