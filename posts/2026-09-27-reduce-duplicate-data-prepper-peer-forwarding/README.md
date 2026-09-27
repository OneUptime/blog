# How to Reduce Duplicate Peer Forwarding in OpenSearch Trace Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenSearch, OpenTelemetry, Observability

Description: Place trace_peer_forwarder before trace pipeline fan-out and verify reduced peer traffic without losing raw spans or service maps.

---

A typical Data Prepper trace pipeline sends every span into a raw-trace branch and a service-map branch. Both branches perform stateful work using the trace ID. In a multi-node deployment, that arrangement can forward the same logical span to its peer separately for each branch.

The `trace_peer_forwarder` processor moves trace routing ahead of the fan-out. The selected node then supplies both branches locally. This reduces redundant peer traffic while preserving the two different outputs.

## Confirm the optimization applies

Use this approach when an entry pipeline feeds trace-processing branches on the same Data Prepper cluster and core Peer Forwarder is already configured. A single-node deployment has no remote forwarding traffic to eliminate.

The [processor reference](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/processors/trace-peer-forwarder/) describes forwarding once before the split. The [processor implementation](https://github.com/opensearch-project/data-prepper/blob/0c8acd7ffc0328b1f9dbd9bc7161ed673a59be42/data-prepper-plugins/trace-peer-forwarder-processor/src/main/java/org/opensearch/dataprepper/plugins/processor/TracePeerForwarderProcessor.java) identifies events by `traceId` and otherwise passes them through.

This is not document deduplication. It does not remove repeated OTLP deliveries, Kafka replays, or duplicate indexing caused by unstable document IDs. Its target is duplicated network forwarding in the pipeline topology.

## Move routing before the branch

Here is a pipeline layout using current processor names. It assumes a Data Prepper release supporting `trace_peer_forwarder` and the source's `output_format` option. Configure real certificates and an OpenSearch writer account before deployment.

```yaml
entry-pipeline:
  source:
    otel_trace_source:
      port: 21890
      ssl: true
      sslKeyCertChainFile: /etc/data-prepper/otel-cert.pem
      sslKeyFile: /etc/data-prepper/otel-key.pem
      output_format: opensearch
  processor:
    - trace_peer_forwarder: {}
  sink:
    - pipeline:
        name: raw-pipeline
    - pipeline:
        name: map-pipeline

raw-pipeline:
  source:
    pipeline:
      name: entry-pipeline
  processor:
    - otel_traces: {}
  sink:
    - opensearch:
        hosts: ["https://opensearch.internal.example:9200"]
        cert: /etc/data-prepper/opensearch-ca.pem
        username: trace-writer
        password: REPLACE_WITH_SECRET
        index_type: trace-analytics-raw

map-pipeline:
  source:
    pipeline:
      name: entry-pipeline
  processor:
    - service_map: {}
  sink:
    - opensearch:
        hosts: ["https://opensearch.internal.example:9200"]
        cert: /etc/data-prepper/opensearch-ca.pem
        username: trace-writer
        password: REPLACE_WITH_SECRET
        index_type: trace-analytics-service-map
```

The two child `source.pipeline.name` values must reference `entry-pipeline`. The entry's two sink names must match the child pipeline names. Keep this graph identical on all peers.

Core peer discovery and transport security still belong in `data-prepper-config.yaml`. Adding the processor while discovery remains `local_node` does not create cross-node routing.

## Understand why the later processors remain

Keep both `otel_traces` and `service_map`. The forwarding processor does not calculate trace-group fields or service relationships. It only establishes placement before those calculations.

With a stable peer set and unchanged trace IDs, the downstream processors receive events on their selected owner. There is no reason to ship another copy to a different node for the same trace. The raw and map branches still receive separate logical copies and retain their own buffers, state, and sink work.

Do not globally disable trace-ID peer forwarding to force a lower network count. Other pipelines might ingest records through a different path. A lower forwarding count is useful only when those records still reach the correct processing node.

## Measure records and bytes, not only requests

Capture a baseline using the same node count, trace mix, Collector batching, and OpenSearch load as the candidate deployment. Record peer-forwarder forwarded-record counts, successful and failed requests, network bytes, CPU, and ingestion latency.

Then send the same bounded trace fixture through the changed topology. For traces requiring remote routing, expect fewer redundant forwarded copies. Do not require HTTP request counts to fall by exactly half: request batching, locally owned records, timeouts, and traffic distribution affect that metric.

Verify both outputs independently. Compare the unique `(traceId, spanId)` pairs in the raw index against the fixture. Check that the service map retains the expected caller-to-callee relationships after the configured processing window. If network traffic drops because the map branch became disconnected, the optimization has failed.

## Roll out without hiding routing failures

Apply the graph consistently across peers and watch for requests targeting absent pipelines or incompatible processor layouts during the transition. Use a staging deployment or controlled rollout appropriate to the release and your tolerance for incomplete traces.

Membership changes remain relevant: adding a node can move the hash-ring destination for later spans. Failed forwarding may also fall back to local processing. Neither behavior is cured by moving the forwarding stage earlier.

Compare failures, latency, and output completeness before accepting the rollout. If peer traffic remains unchanged, check whether the test mostly selects local owners, whether the new configuration was loaded, and whether another trace ingress path bypasses the entry processor.

## Conclusion

Place `trace_peer_forwarder` before the raw/map split to reduce redundant peer transfers. Keep the stateful processors and verify complete outputs; the success criterion is lower forwarding cost for the same usable trace data.
