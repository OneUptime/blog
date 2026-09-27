# How to Size Data Prepper Buffers for Bursty OpenSearch Trace Ingestion

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenSearch, OpenTelemetry, Performance

Description: Estimate Data Prepper trace buffer capacity from burst backlog, measured event memory, and drain rate across every pipeline branch.

---

A buffer can absorb a short trace burst, but it cannot compensate for a sink that is permanently slower than ingestion. Size Data Prepper buffers from the backlog you expect to accumulate, then verify that the JVM and downstream OpenSearch cluster can drain that backlog within the required latency.

For modern event-model trace pipelines, think in span events rather than OTLP requests. A single incoming request can decode into many spans, and the number of spans per request is not fixed.

## Establish the units first

The default `bounded_blocking` buffer is memory based. Its `buffer_size` limits records, while `batch_size` controls the maximum number returned by a read. Current documentation lists defaults of 12,800 and 200 respectively, but explicit values make a capacity experiment reproducible. See [bounded blocking](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/buffers/bounded-blocking/).

The upstream [buffer implementation](https://github.com/opensearch-project/data-prepper/blob/0c8acd7ffc0328b1f9dbd9bc7161ed673a59be42/data-prepper-plugins/blocking-buffer/src/main/java/org/opensearch/dataprepper/plugins/buffer/blockingbuffer/BlockingBuffer.java) holds capacity permits until records are checkpointed. Consequently, capacity can remain occupied by records already read and still in processing. Queue length alone understates that work.

Distinguish these quantities in your measurements:

| Quantity | Unit |
|---|---|
| Source request rate | OTLP requests per second |
| Decoded ingestion rate | Span records per second |
| Buffer capacity | Records |
| Sink bulk-size limit | MiB |
| JVM heap use | Bytes |

Converting between them requires observed batch sizes and event sizes.

## Calculate burst backlog per node

For an approximate constant-rate burst:

```text
new backlog = max(0, burst arrival rate - processing rate) × burst seconds
required capacity ≈ existing occupied capacity + new backlog + margin
```

Suppose one node receives 8,000 spans per second during a 15-second burst and sustainably processes 5,000 per second. The burst adds:

```text
(8,000 - 5,000) × 15 = 45,000 span records
```

If 5,000 records are already queued or in flight, a 60,000-record experiment leaves 10,000 records of additional margin. This is an illustrative starting point, not a production recommendation.

Use the busiest node's measurements. Dividing cluster traffic evenly by replica count can underestimate the effect of large traces, consistent-hash skew, and failed forwarding. Record the burst duration distribution, not just the highest one-second rate.

## Budget memory across the pipeline graph

A trace entry pipeline commonly fans out to raw-span and service-map pipelines. Inventory each bounded buffer, peer-forwarder queues, stateful trace caches, service-map state, bulk serialization, and runtime overhead.

Measure incremental heap growth under representative records. If retaining a record costs approximately 2 KiB in a particular stage, 60,000 records represent about 117 MiB at that stage:

```text
60,000 × 2,048 / 1,048,576 ≈ 117 MiB
```

That estimate excludes the rest of the application. Serialized OTLP payload size is not a reliable substitute for retained Java object size. Large attributes, events, and links can materially change memory usage.

Do not assume that summing capacities gives an exact heap prediction: branches may share some objects while processors allocate additional ones. Measure the complete graph and retain enough headroom for garbage collection and peak serialization work.

## Change capacity separately from concurrency

For the illustrative raw-span stage, start with an explicit fragment:

```yaml
raw-pipeline:
  workers: 4
  source:
    pipeline:
      name: entry-pipeline
  buffer:
    bounded_blocking:
      buffer_size: 60000
      batch_size: 500
  processor:
    - otel_traces: {}
  # Keep the configured OpenSearch sink below this fragment.
```

This is not a complete pipeline; retain the existing sink and the connected entry pipeline. The values are experiment parameters.

Increasing `batch_size` does not increase buffer capacity. Raising `workers` can increase concurrency, CPU usage, and simultaneous sink pressure. Change one variable at a time so the result has an identifiable cause.

The OpenSearch sink's `bulk_size` is a byte limit, not a span count. Keep that separate from the buffer batch size and monitor whether larger batches cause indexing rejections or longer pauses.

## Test recovery as well as survival

After the burst ends, the pipeline needs spare throughput to empty its backlog. If normal traffic is 3,000 records per second and processing remains 5,000, a 45,000-record backlog takes approximately:

```text
45,000 / (5,000 - 3,000) = 22.5 seconds
```

That estimate excludes changing service time and retries. If normal arrivals equal processing capacity, the backlog does not drain; another burst starts from a worse position.

Track `capacityUsed` and `bufferUsage` for each bounded buffer, JVM heap and GC, source timeouts, peer-forwarding failures, processor latency, and sink errors. The [trace source reference](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/sources/otel-trace-source/) distinguishes oversized requests and timeout counters. Check both: a single decoded request can exceed a buffer's capacity even before sustained overload occurs.

## Decide when memory is the wrong buffer

If the required outage window exceeds the memory budget, evaluate durable buffering and source retry behavior. The [Kafka buffer](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/buffers/kafka/) provides Kafka-backed persistence, with its own broker capacity, retention, offset, and compatibility requirements.

Increasing an in-memory queue does not make it durable across process loss. Test restart and downstream-outage behavior explicitly before claiming an ingestion recovery guarantee.

## Conclusion

Size for occupied records plus measured burst backlog, then verify memory and drain time across the complete pipeline. A useful buffer absorbs bounded demand while allowing the system to return to its normal operating state.
