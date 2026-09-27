# How to Diagnose Data Prepper Peer Forwarding That Falls Back to Local Processing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenSearch, OpenTelemetry, Troubleshooting

Description: Distinguish healthy local ownership from failed Data Prepper peer forwarding using discovery, transport errors, and record counters.

---

Spans can keep appearing in OpenSearch even when Data Prepper nodes stop forwarding to one another. The processing path can fall back to the local node, preserving some ingestion while splitting state needed for trace groups and service maps. Diagnose that degraded state before increasing processor timeouts or changing trace sampling.

The first question is whether local processing was expected. A node should process traces that it owns. A single-node installation using `local_node` also has no reason to send peer requests.

## Start with record counters

The documented core Peer Forwarder metrics use the prefix `core.peerForwarder`. Exported names may be normalized by the metrics backend, so locate the actual series before writing an alert.

Compare these counters over the same interval:

| Counter | Diagnostic meaning |
|---|---|
| `recordsToBeProcessedLocally` | Records selected for local ownership |
| `recordsToBeForwarded` | Records selected for a remote peer |
| `recordsSuccessfullyForwarded` | Records forwarded successfully |
| `recordsFailedForwarding` | Records that could not be forwarded |
| `recordsActuallyProcessedLocally` | Local work, including fallback processing |
| `recordsReceivedFromPeers` | Incoming records from other nodes |

The [metric definitions](https://docs.opensearch.org/latest/data-prepper/managing-data-prepper/peer-forwarder/) explain why a high local-processing count alone is not an incident. The actionable pattern is failed forwarding combined with unexpected local work, transport errors, or incomplete correlation.

A useful investigation ratio is:

```text
failed forwarding fraction =
  increase(recordsFailedForwarding) /
  increase(recordsToBeForwarded)
```

Treat a zero denominator as no attempted forwarding, not a healthy measured success rate. Counter resets, asynchronous batching, and different scrape times mean short-window arithmetic need not balance perfectly.

## Check whether remote routing was enabled

Inspect the effective `data-prepper-config.yaml` in the running container, not only the file in source control. Confirm that the chosen discovery mode is `static`, `dns`, or `aws_cloud_map` and that the mounted configuration is the expected revision.

For static discovery, compare the endpoint list across all peers. For DNS, resolve the discovery name inside each pod and compare its returned addresses. For Cloud Map, verify namespace, service name, query filters, region, and discovery permissions. A restrictive instance attribute filter can produce an apparently valid but incomplete peer set.

Check the `peerEndpoints` gauge alongside discovery logs. A nonzero value does not prove that the endpoints are reachable or that every peer sees the same set. Record the actual addresses before changing anything.

## Separate transport failure from receiver pressure

Use the request counters and the relevant logs to choose the next check:

| Observation | Next evidence to collect |
|---|---|
| Connection refused or timeout | Listener, advertised port, network policy, firewall, peer health |
| TLS handshake failure | Certificate validity, hostname, trust configuration, client authentication |
| `requestsTooLarge` / HTTP 413 | Forwarded request size and peer receive-buffer capacity |
| `requestTimeouts` / HTTP 408 | Receive-buffer pressure and downstream processing latency |
| `requestsUnprocessable` / HTTP 422 | Destination pipeline/plugin availability and release compatibility |

An OTLP source health check tests a different listener. Likewise, an HTTP 200 from the OpenSearch cluster proves nothing about Data Prepper peer reachability.

Perform a TLS connection check from the same network context as Data Prepper, using the peer hostname and CA configuration. If mutual TLS is enabled, include an appropriate client certificate. Do not solve a production handshake error by leaving certificate verification disabled.

## Read the fallback messages in context

The upstream [RemotePeerForwarder implementation](https://github.com/opensearch-project/data-prepper/blob/0c8acd7ffc0328b1f9dbd9bc7161ed673a59be42/data-prepper-core/src/main/java/org/opensearch/dataprepper/core/peerforwarder/RemotePeerForwarder.java) contains several fallback paths: inability to batch records, inability to submit or send requests, and unsuccessful forwarding responses. Check the source for the deployed version when investigating an exact log message.

Fallback is not unlimited protection. In the referenced implementation, failed forwarded records are written back to the local receive buffer; if that write fails, a log explicitly reports dropped records. Therefore, distinguish “processed on the wrong owner” from “failed to re-enter the local processing path.”

Capture the first transport error, subsequent fallback message, and any local-buffer error together. A dashboard displaying indexed documents can conceal both partial correlation and partial loss.

## Repair the cause and run a split-ingress test

After fixing discovery or connectivity, send a known trace whose root and child spans enter through different nodes. Check that failed-forwarding counters stop increasing, successful-forwarding counters resume, and corresponding peers receive records.

Verify the trace's raw spans and trace-group fields in OpenSearch. Allow the configured processor windows to elapse before judging service-map output. Existing incomplete traces do not automatically become complete because the network was repaired; replay or later enrichment behavior depends on the pipeline and retained source data.

For a buffer-pressure failure, record queue growth and sink latency before raising capacities. If OpenSearch indexing is the limiting stage, a larger receive buffer mainly delays saturation. Use a bounded burst test and check recovery time as well as peak throughput.

## Conclusion

Local processing is healthy when the node owns the trace. It is degraded when remote routing fails and work falls back locally. Combine record counters, discovery membership, request errors, and a known trace to prove which condition exists and whether the repair restored correlation.
