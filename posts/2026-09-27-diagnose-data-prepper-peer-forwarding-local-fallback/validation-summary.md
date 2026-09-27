# Validation Summary: How to Diagnose Data Prepper Peer Forwarding That Falls Back to Local Processing

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- OpenSearch and Data Prepper Peer Forwarder
- OpenTelemetry traces, trace-group enrichment, and service maps
- Static, DNS, and AWS Cloud Map discovery
- HTTP, TLS, and mutual TLS
- Record counters, request counters, and receive buffers

## Sources Consulted
- [Peer Forwarder documentation](https://docs.opensearch.org/latest/data-prepper/managing-data-prepper/peer-forwarder/) — discovery modes, metrics, receive-buffer configuration, TLS, and authentication.
- [Configuring OpenSearch Data Prepper](https://docs.opensearch.org/latest/data-prepper/managing-data-prepper/configuring-data-prepper/) — configuration filename, peer listener, discovery settings, and TLS options.
- [RemotePeerForwarder.java at the post's pinned commit](https://github.com/opensearch-project/data-prepper/blob/0c8acd7ffc0328b1f9dbd9bc7161ed673a59be42/data-prepper-core/src/main/java/org/opensearch/dataprepper/core/peerforwarder/RemotePeerForwarder.java) — routing, batching, counter increments, fallback paths, and dropped-record logging. Retrieved through GitHub's raw-content endpoint.
- [PeerForwarderHttpService.java at the same commit](https://github.com/opensearch-project/data-prepper/blob/0c8acd7ffc0328b1f9dbd9bc7161ed673a59be42/data-prepper-core/src/main/java/org/opensearch/dataprepper/core/peerforwarder/server/PeerForwarderHttpService.java) — destination pipeline/plugin lookup, buffer writes, and incoming-record counting.
- [ResponseHandler.java at the same commit](https://github.com/opensearch-project/data-prepper/blob/0c8acd7ffc0328b1f9dbd9bc7161ed673a59be42/data-prepper-core/src/main/java/org/opensearch/dataprepper/core/peerforwarder/server/ResponseHandler.java) — exact HTTP error and counter mappings.
- [Trace analytics with Data Prepper](https://docs.opensearch.org/latest/data-prepper/common-use-cases/trace-analytics/) — stateful trace processing, service maps, OpenSearch sinks, and optional trace-group enrichment.
- [OTel trace processor](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/processors/otel-traces/) — root-span caching and descendant-span flush interval.
- [Service map processor](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/processors/service-map/) — service relationship evaluation window.

## Issues Found
1. **Missing destination incorrectly associated with HTTP 422.** The table directed readers to destination pipeline/plugin availability for `requestsUnprocessable` / HTTP 422. In the pinned implementation, a missing target throws `NoPeerForwarderTargetException`, which maps to HTTP 400 and `badRequests`; HTTP 422 and `requestsUnprocessable` map to `NullPointerException`. Added the HTTP 400 row and corrected the HTTP 422 row, explicitly scoping both mappings to the referenced implementation.
2. **Fallback buffer path was overgeneralized.** The post described failed forwarded records as returning through the local receive buffer without distinguishing batching failures. The source returns records that fail batching directly for local processing, while failed request submission, sending, or responses use the receive buffer. Clarified the distinction while preserving the warning that failed local-buffer writes can drop records.

## Review Notes
- This is a technical guide despite having no executable commands or configuration examples. The ratio is explicitly a conceptual text example, not runnable PromQL; real queries require exported metric names and range selectors.
- Verified the six record counters, documented metric prefix, discovery modes, Cloud Map filters and permissions, endpoint gauge, and TLS/mTLS guidance against official documentation. The ratio should be evaluated over matching scopes and intervals.
- Source inspection confirms HTTP 413 for buffer size overflow and HTTP 408 for buffer-write timeout. These are receiver-side conditions and should be distinguished from connection failures.
- Counter names do not guarantee completed processing or indexing: in the pinned source, the local counter increments for directly returned records and successful fallback buffer writes. It does not increment for failed fallback buffer writes, so the documentation's simple local-count sum is not an unconditional invariant. The article appropriately avoids asserting that equality and calls for buffer-error evidence.
- Trace-group state depends on root-span information; service-map evaluation uses configured windows. A split-ingress trace is a useful repair check, and restoring connectivity does not by itself reprocess already indexed incomplete records.
- Buffer sizing and bounded-burst recovery checks are sound operational guidance when downstream indexing limits throughput.
- Both technical links in the original article point to the intended official resources. The source link is pinned to a commit rather than a release, so exact logs and response mappings must still be checked against the deployed version.
- Validation used documentation and source inspection; no live multi-node Data Prepper deployment or failure-injection test was run.
