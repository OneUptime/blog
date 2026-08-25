# Move Tail-Sampling State to the Experimental `tail_storage` Extension

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Tail Sampling, OpenTelemetry Collector, Pebble, Storage

Description: Configure the alpha Pebble tail-storage extension safely, with its feature gate, disk limit, single-shard constraint, and explicit lack of restart durability.

---

Tail sampling normally buffers pending span batches in memory until it can decide the trace. Current Collector Contrib can delegate those batches to an implementation of the experimental `TailStorage` interface. The included `pebble_tail_storage` extension stores them in a local Pebble database.

This feature can reduce heap pressure from pending span bodies. It does not make tail sampling stateless, shared, or durable across restarts.

## Enable the Feature Gate and Extension

Tail-storage support is alpha and disabled by default. If `tail_storage` is configured without the gate, configuration validation fails. Start the Contrib Collector with:

```sh
otelcol-contrib \
  --feature-gates=+processor.tailsamplingprocessor.tailstorageextension \
  --config=/etc/otelcol/config.yaml
```

Then declare, enable, and reference the extension:

```yaml
extensions:
  pebble_tail_storage:
    directory: /var/lib/otelcol/pebble-tail-storage
    max_storage_size_mib: 10240

receivers:
  otlp:
    protocols:
      grpc:

processors:
  tail_sampling:
    sampling_strategy: span-ingest
    decision_wait: 2m
    num_traces: 50000
    expected_new_traces_per_sec: 1000
    num_shards: 1
    tail_storage: pebble_tail_storage
    decision_cache:
      sampled_cache_size: 500000
      non_sampled_cache_size: 2000000
    policies:
      - name: errors
        type: status_code
        status_code:
          status_codes: [ERROR]

exporters:
  otlp:
    endpoint: traces.example.com:4317

service:
  extensions: [pebble_tail_storage]
  pipelines:
    traces:
      receivers: [otlp]
      processors: [tail_sampling]
      exporters: [otlp]
```

The extension must appear in `service.extensions`; declaring it at the top level is not enough. `directory` is required. The tail-sampling reference uses the component ID `pebble_tail_storage` exactly.

## Treat the Directory as Ephemeral

The official extension documentation is explicit: persistence across Collector restarts is not yet supported. On startup, the extension drops all stored trace data from the Pebble database under its configured directory while the on-disk schema is under development.

Consequences include:

- a graceful or ungraceful restart does not resume pending traces from Pebble;
- a persistent volume does not change the startup-clearing behavior;
- decision caches are still process memory and also restart empty; and
- an old database directory is not an upgrade or migration mechanism.

Use a stable writable mount to control disk capacity and I/O isolation, but treat its contents as disposable. Do not market this configuration as exactly-once or restart-durable tail sampling.

## Size and Monitor Disk Explicitly

`max_storage_size_mib` is optional and zero means unlimited. The documented limit is best effort because Pebble filesystem work can be asynchronous. After the last periodic size observation exceeds the limit, new appends fail; disk usage can temporarily overshoot.

Set a limit below the filesystem's real capacity and retain space for compaction, filesystem metadata, logs, and operating-system needs. Monitor bytes, inodes, write latency, I/O errors, and Collector logs. An append failure means the processor cannot safely assume that batch is available for the eventual decision.

In the current processor path, an extension append error is logged but is not returned to the OTLP sender for that batch. The processor has already updated the trace's in-memory span-count and size metadata, so those totals can include a batch whose span bodies were not stored. In `trace-complete`, later evaluation can therefore receive incomplete `ReceivedBatches`; in `span-ingest`, a later terminal sample decision can forward a trace that omits earlier batches whose appends failed. Do not assume an upstream retry will repair a full-disk or I/O-error event. Treat the error log and storage health as an immediate correctness signal and design failover outside this alpha interface.

The directory should be writable only by the Collector service account. Do not share one Pebble directory between replicas or processes. Local storage also means a pod rescheduled to another node has no usable shared sampling state-which is consistent with the current startup-clearing limitation anyway.

## Keep Trace-ID Affinity and Live Metadata Capacity

`tail_storage` stores pending trace batches. The processor still owns trace-ID metadata, decision schedules, policy state, and LRU decision caches. `num_traces` remains relevant, and every span for one trace must still reach the same tail-sampling instance.

Use the documented two-tier deployment with the load-balancing exporter routing by trace ID. Storage does not reconcile two collectors that each receive half a trace.

Current validation rejects `num_shards` greater than one when `tail_storage` is set because the extension contract expects serialized access to one storage instance. Scale with separate trace-affine Collector replicas or keep the in-memory implementation when local processor sharding is required.

## Choose the Sampling Strategy Separately

The official Pebble example uses `span-ingest`. It can finalize simple terminal matches early and write only still-pending batches to storage. Its policy semantics differ from the default: policies see only the current incoming batch's span bodies, while span-count and size metadata remain cumulative; stateful evaluators are rejected; and pending cleanup does not re-evaluate the accumulated trace.

`trace-complete` remains appropriate when policies need an accumulated-trace view at decision time. Tail storage can reduce where its pending span bodies reside, but decisions still wait and disk I/O becomes part of the critical path. Benchmark both semantics with real batch ordering.

## Plan the Failure Boundary

Before production, test:

1. disk filling to the configured best-effort limit;
2. permission loss and I/O errors;
3. Collector restart with pending traces;
4. version upgrade with a populated directory;
5. a replica replacement during a trace-ID routing change; and
6. sustained ingestion while Pebble compacts.

Decide how an external health response should drain, stop, or replace an unhealthy instance; the current append path does not offer a per-batch drop-versus-retry switch. The alpha interface and implementation can change, so pin and test every Collector upgrade.

## Official Documentation

- [Tail-sampling tail-storage extension guidance](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md#tail-storage-extension)
- [Pebble tail-storage extension](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/tailstorage/pebbletailstorageextension/README.md)
- [Pebble tail-storage configuration and validation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/tailstorage/pebbletailstorageextension/config.go)
- [Tail-sampling `tail_storage` and shard validation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/config.go)

## Conclusion

Use Pebble tail storage to trade pending-span heap for local disk only after enabling and accepting an alpha feature. Keep `num_shards: 1`, bound and monitor the filesystem, preserve trace-ID affinity, and design for lost pending state at every restart. Today it is an ephemeral pressure-relief mechanism, not durable shared sampling state.
