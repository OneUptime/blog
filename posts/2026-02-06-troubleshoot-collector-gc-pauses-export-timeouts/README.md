# How to Troubleshoot Collector Garbage Collection Pauses Causing Intermittent Span Export Timeouts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Garbage Collection, Timeouts

Description: Diagnose and fix intermittent span export timeouts in the OpenTelemetry Collector caused by Go garbage collection pauses.

Your OpenTelemetry Collector exports spans successfully most of the time, but intermittently you see timeout errors in the logs. The backend is healthy, the network is fine, and the timeouts seem random. The root cause might be Go garbage collection (GC) pauses that freeze the Collector long enough for export calls to time out.

## Identifying GC-Related Timeouts

The telltale signs are:

1. Export timeouts happen in bursts, not continuously
2. CPU usage spikes briefly during the timeout periods
3. Memory usage drops sharply right after the timeout (because GC freed memory)
4. The backend shows no errors on its side

Check the Collector's GC stats:

```bash
# Enable GC debug logging
GODEBUG=gctrace=1 ./otelcol-contrib --config config.yaml
```

This prints GC information to stderr:

```
gc 42 @120.305s 5%: 0.12+45.3+0.089 ms clock, 0.48+12.1/42.5/0+0.35 ms cpu, 380->395->210 MB, 400 MB goal, 4 P
```

The `45.3 ms` in the middle is the GC pause time. If this exceeds your export timeout, exports will fail.

## Why GC Pauses Get Long

The Go garbage collector is generally fast, but pauses increase when:

1. **Heap size is large**: More objects to scan means longer pauses
2. **GOMEMLIMIT is not set**: The GC waits too long before running, allowing heap to grow
3. **Many short-lived allocations**: Creating and discarding many objects forces frequent GC
4. **Large batches in the batch processor**: Each batch is a large allocation that becomes garbage after export

## Fix 1: Set GOMEMLIMIT

This is the most impactful fix. `GOMEMLIMIT` makes the GC run more frequently at smaller heap sizes, reducing individual pause times:

```yaml
env:
- name: GOMEMLIMIT
  value: "800MiB"
```

Without `GOMEMLIMIT`, Go's GC runs when heap doubles. If heap is 500MB, GC runs at 1000MB. With `GOMEMLIMIT=800MiB`, GC runs earlier when approaching 800MB, keeping individual pauses shorter.

## Fix 2: Tune GOGC

`GOGC` controls how much the heap can grow before GC runs. The default is 100 (heap can double). Setting it lower makes GC run more frequently with shorter pauses:

```yaml
env:
- name: GOGC
  value: "50"    # GC when heap grows by 50% instead of 100%
- name: GOMEMLIMIT
  value: "800MiB"
```

A `GOGC` of 50 means GC runs when the heap is 1.5x the live data, instead of 2x. More frequent GC, but shorter pauses.

## Fix 3: Reduce Batch Sizes

Large batches create large allocations. Smaller batches spread the allocation pressure:

```yaml
processors:
  batch:
    send_batch_size: 512     # smaller batches
    send_batch_max_size: 1024
    timeout: 3s
```

## Fix 4: Increase Export Timeout

If GC pauses are under 100ms, increase the export timeout to accommodate them:

```yaml
exporters:
  otlp:
    endpoint: backend:4317
    timeout: 30s   # increase from default 5s
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
```

This does not fix the GC pauses, but it prevents them from causing export failures.

## Fix 5: Use Persistent Queue

If exports time out, the data is lost (unless retried). A persistent queue stores data on disk so it survives transient failures:

```yaml
exporters:
  otlp:
    endpoint: backend:4317
    sending_queue:
      enabled: true
      storage: file_storage
      queue_size: 5000
    retry_on_failure:
      enabled: true

extensions:
  file_storage:
    directory: /var/lib/otelcol/queue

service:
  extensions: [file_storage]
```

With persistent queuing, even if a GC pause causes a timeout, the data is queued on disk and retried after the pause.

## Monitoring GC Performance

Add the pprof extension and periodically collect GC stats:

```yaml
extensions:
  pprof:
    endpoint: 0.0.0.0:1777

service:
  extensions: [pprof]
```

Query GC stats:

```bash
# Get memory stats including GC info
curl -s http://collector:1777/debug/pprof/heap?debug=1 | head -30
```

You can also expose GC metrics through the Collector's telemetry:

```
# Go runtime metrics
go_gc_duration_seconds
go_memstats_alloc_bytes
go_memstats_heap_inuse_bytes
```

Set an alert on `go_gc_duration_seconds`:

```yaml
- alert: CollectorLongGCPause
  expr: go_gc_duration_seconds{quantile="1"} > 0.1
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Collector GC pauses exceeding 100ms"
```

## Summary

GC pauses cause intermittent export timeouts when the pause duration exceeds the export timeout. Fix this by setting `GOMEMLIMIT` to make GC run more frequently, reducing batch sizes to lower allocation pressure, increasing export timeouts to accommodate short pauses, and using persistent queues to survive transient failures. Monitor `go_gc_duration_seconds` to catch regressions.
