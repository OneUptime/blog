# Validation Summary: How to Keep Each Trace on One Data Prepper Node with Peer Forwarding

## Status
validated

## Post Type
Guide with configuration examples and a trace-affinity verification procedure.

## Technologies Covered
- OpenSearch Data Prepper core Peer Forwarder
- OpenTelemetry traces, OTLP, and Collector tail sampling
- Data Prepper `otel_traces` and `service_map` processors
- OpenSearch trace analytics indexes and Query DSL
- DNS discovery, Kubernetes networking, and TLS
- YAML and JSON configuration

## Sources Consulted
- [Data Prepper Peer Forwarder reference](https://docs.opensearch.org/latest/data-prepper/managing-data-prepper/peer-forwarder/)
- [Trace analytics with Data Prepper](https://docs.opensearch.org/latest/data-prepper/common-use-cases/trace-analytics/)
- [OTel trace processor](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/processors/otel-traces/)
- [Service map processor](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/processors/service-map/)
- [PeerForwarderClient implementation at the post's pinned commit](https://github.com/opensearch-project/data-prepper/blob/0c8acd7ffc0328b1f9dbd9bc7161ed673a59be42/data-prepper-core/src/main/java/org/opensearch/dataprepper/core/peerforwarder/client/PeerForwarderClient.java)
- [HashRing implementation at the post's pinned commit](https://github.com/opensearch-project/data-prepper/blob/0c8acd7ffc0328b1f9dbd9bc7161ed673a59be42/data-prepper-core/src/main/java/org/opensearch/dataprepper/core/peerforwarder/HashRing.java)
- [RemotePeerForwarder implementation](https://github.com/opensearch-project/data-prepper/blob/main/data-prepper-core/src/main/java/org/opensearch/dataprepper/core/peerforwarder/RemotePeerForwarder.java)
- [Official raw-span index template](https://github.com/opensearch-project/data-prepper/blob/main/data-prepper-plugins/opensearch/src/main/resources/otel-v1-apm-span-index-template.json)
- [OpenSearch term query](https://docs.opensearch.org/latest/query-dsl/term/term/)
- [Kubernetes DNS for Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)
- [OpenTelemetry Collector tail sampling processor](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/tailsamplingprocessor)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)

## Issues Found
No technical issues found.

## Review Notes
- Both YAML examples parse successfully. The discovery modes, endpoint fields, peer port, and TLS fields match the Peer Forwarder reference. They are configuration fragments requiring real endpoints, certificates, and deployment-specific trust, as the post states.
- Confirmed that trace processors use the fixed `traceId` identification key and that `local_node` does not route between nodes. The warning about preserving trace IDs is correct; these processors do not expose a configurable replacement routing key.
- The pinned client source serializes the pipeline name and processor ID with the events. The pinned hash-ring source rebuilds its routing map when peer membership changes. These support matching pipeline layouts and the membership-change caveat. Both source files were retrieved successfully from GitHub's raw-content endpoint.
- The entry pipeline and two processing branches match the official trace analytics example. Core peer forwarding belongs in server configuration. The event-model processor names are appropriate for Data Prepper 2.x and later.
- The search request body parses as JSON. The example trace ID is a valid nonzero 32-character hexadecimal value, and the official span template maps `traceId` as `keyword`, making the exact-term query appropriate. The index wildcard covers the documented span index family. Use the actual fixture ID; a fixture exceeding 100 spans would require additional result retrieval.
- Forwarding, received-record, and local-processing counters are documented. Local processing can also occur after forwarding failures, so failure counters should be considered when interpreting a staging experiment. The post already avoids guaranteeing affinity through failures.
- Checking correlated trace-group and service-map output is necessary: aggregate forwarding counters and complete indexed spans alone do not identify the processing node for every span.
- The Kubernetes warning correctly distinguishes a virtual Service address from direct peer addresses. Collector tail sampling separately requires all spans of a trace to reach the same Collector instance.
- `service_map` remains documented for the topology covered here. Its output is static; the newer `otel_apm_service_map` processor provides time-based maps and is outside this post's stated scope.
- No terminal commands or deprecated configuration options appear in the post. README.md was left unchanged. Verification consisted of documentation/source inspection and local YAML/JSON parsing; no live Data Prepper/OpenSearch cluster, TLS handshake, or synthetic distributed-trace experiment was run.
