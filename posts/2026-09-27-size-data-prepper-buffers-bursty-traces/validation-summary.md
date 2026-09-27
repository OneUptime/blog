# Validation Summary: How to Size Data Prepper Buffers for Bursty OpenSearch Trace Ingestion

## Status
validated

## Post Type
Technical guide for capacity planning and performance tuning.

## Technologies Covered
- OpenSearch and the Data Prepper OpenSearch sink
- Data Prepper bounded blocking buffers, pipeline workers, and peer forwarding
- OpenTelemetry and OTLP trace ingestion
- JVM heap memory and garbage collection
- Apache Kafka-backed buffering
- YAML pipeline configuration

## Sources Consulted
- [Bounded blocking buffer](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/buffers/bounded-blocking/) — capacity and batch units, defaults, and in-memory storage.
- [BlockingBuffer.java at the post’s pinned commit](https://github.com/opensearch-project/data-prepper/blob/0c8acd7ffc0328b1f9dbd9bc7161ed673a59be42/data-prepper-plugins/blocking-buffer/src/main/java/org/opensearch/dataprepper/plugins/buffer/blockingbuffer/BlockingBuffer.java) — retrieved through raw.githubusercontent.com; checked semaphore acquisition, checkpoint release, oversized writes, read limits, and metric definitions.
- [OTel trace source](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/sources/otel-trace-source/) — span records, request-size limits, request timeouts, and oversized-request counters.
- [Data Prepper pipelines](https://docs.opensearch.org/latest/data-prepper/pipelines/pipelines/) — YAML structure, workers, and required pipeline components.
- [Trace analytics with Data Prepper](https://docs.opensearch.org/latest/data-prepper/common-use-cases/trace-analytics/) — entry-pipeline fan-out, pipeline source naming, and the otel_traces processor configuration.
- [OTel trace processor](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/processors/otel-traces/) — root-span caching and processor metrics.
- [Service map processor](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/processors/service-map/) — service-map processing and its separate pipeline stage.
- [Peer Forwarder](https://docs.opensearch.org/latest/data-prepper/managing-data-prepper/peer-forwarder/) — trace-ID hashing, additional buffers and queues, forwarding failures, and local processing of failed forwards.
- [OpenSearch sink](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/sinks/opensearch/) — bulk_size expressed in MiB and sink retry behavior.
- [Kafka buffer](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/buffers/kafka/) — Kafka persistence and consumer offset configuration.

## Issues Found
No technical issues found.

## Review Notes
- README.md was left unchanged. The post is technically relevant and contains a YAML implementation fragment, so technical validation applies.
- Parsed the YAML fragment successfully with PyYAML. Its workers, pipeline source, bounded_blocking buffer, and otel_traces processor match official configuration examples. The fragment intentionally omits its sink and entry pipeline, as explicitly stated in the post; it is not a standalone deployment configuration.
- Independently checked every numerical example: the burst adds 45,000 records; 60,000 capacity minus 5,000 existing records and 45,000 new records leaves 10,000; 60,000 times 2 KiB equals 117.1875 MiB; and the specified excess throughput drains 45,000 records in 22.5 seconds.
- The backlog and recovery formulas correctly assume approximately constant rates. For a buffer-capacity experiment, processing throughput should represent completion that releases that buffer’s capacity, rather than merely dequeuing records.
- The pinned implementation retains semaphore permits through reads and releases them during checkpointing. capacityUsed measures occupied record permits; bufferUsage expresses that occupancy as a percentage. Neither should be interpreted as queued records alone.
- The 2 KiB retained-record size and the throughput values are illustrative assumptions, not benchmark results. Full-graph heap measurements and recovery testing remain necessary, as the post explains.
- bulk_size is a byte-based threshold configured in MiB. The sink documentation also notes that an individual document larger than the threshold can be sent alone; it is not an absolute document-size ceiling.
- Checked the technical links against official documentation and retrieved the pinned source successfully via its raw GitHub URL after the browser fetch failed. No product version is explicitly pinned for deployment; latest documentation can evolve, while the implementation citation identifies an exact commit.
- This was documentation/source review, YAML parsing, and arithmetic verification. No live Data Prepper/OpenSearch deployment, load test, heap profile, or Kafka restart test was performed. No terminal commands appear in the post.
