# How to Enable Created-Timestamp Zero Ingestion Without Polluting Prometheus with `_created` Series

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Monitoring, Observability, DevOps

Description: Enable Prometheus counter start-time ingestion, prefer protobuf when available, and verify _created samples do not become redundant stored series.

---

Exposing `_created` does not automatically make Prometheus use a counter's start time. Without the corresponding ingestion behavior, those values can become additional stored series while counter queries continue using their ordinary history.

Prometheus provides `created-timestamp-zero-ingestion` to inject an appropriate zero-valued sample at a reported start time. Enable the feature deliberately, ensure the source actually supplies start metadata, and verify the resulting stored series.

## Understand what zero ingestion changes

Imagine a counter first scraped at 10:01 with value 12, but created at 10:00 with value zero. The start timestamp gives Prometheus information about the beginning of that cumulative sequence. It is not an instruction to insert zero before every scrape, and it does not reconstruct individual events between creation and observation.

The [feature-flag documentation](https://prometheus.io/docs/prometheus/latest/feature_flags/#start-created-timestamps-zero-injection) supports this behavior for Prometheus protobuf and OpenMetrics 1.0. It recommends protobuf because OpenMetrics carries creation information as extra `_created` samples that require additional parsing. The feature retains its historical flag name even though documentation now also calls these start timestamps.

Add the flag to the existing Prometheus process arguments:

```bash
prometheus \
  --config.file=prometheus.yml \
  --storage.tsdb.path=data \
  --enable-feature=created-timestamp-zero-ingestion
```

Merge this with other existing feature flags and operational arguments. A YAML reload cannot enable a command-line flag; the process must start with it.

## Negotiate a format that carries start metadata

For an exporter supporting protobuf, use a contemporary scrape configuration such as:

```yaml
scrape_configs:
  - job_name: workers
    scrape_protocols:
      - PrometheusProto
      - OpenMetricsText1.0.0
      - PrometheusText0.0.4
    static_configs:
      - targets: ["worker.internal:9000"]
```

The flag changes the default protocol preference, but an explicitly configured list can override that default. Inspect the loaded configuration instead of assuming the process flag changed every job.

Protobuf support belongs to the exporter too. Asking for protobuf cannot make a text-only endpoint generate it. For a strictly OpenMetrics endpoint, verify that it returns `application/openmetrics-text; version=1.0.0` and includes valid family components:

```text
# TYPE worker_jobs counter
# HELP worker_jobs Jobs completed by this worker.
worker_jobs_total{queue="default"} 12
worker_jobs_created{queue="default"} 1790031600
# EOF
```

The creation timestamp must describe this counter's actual lifecycle. A fresh timestamp on every scrape falsely describes repeated restarts. A gateway's startup time is also wrong when it relays an upstream counter that started earlier.

## Expose created samples only when needed

Go's [promhttp HandlerOpts](https://pkg.go.dev/github.com/prometheus/client_golang/prometheus/promhttp#HandlerOpts) includes a specific option for OpenMetrics creation samples:

```go
handler := promhttp.HandlerFor(registry, promhttp.HandlerOpts{
    EnableOpenMetrics:                   true,
    EnableOpenMetricsTextCreatedSamples: true,
})
```

This example assumes an existing registry. The second option controls the extra text-format samples; protobuf carries the metadata in its own representation. Confirm your installed client version provides the option before using it.

Avoid enabling extra text samples indiscriminately for every consumer. A legacy scraper may store each `_created` value as an ordinary series. Coordinate the exporter change with the consumer configuration and inspect both the raw exposition and the resulting TSDB data.

## Verify metadata consumption and storage separately

Use a fresh test counter with a creation timestamp slightly before its first scrape. Query its raw range samples through Prometheus and look for the expected synthetic zero when ingestion conditions permit it. Use a controlled restart to verify a new start time is handled correctly.

Then check for unwanted stored creation series:

```promql
{job="workers",__name__=~"worker_jobs_created"}
```

For recognized OpenMetrics creation components, the zero-ingestion scrape path skips the extra start-time series. The [Prometheus scrape implementation](https://github.com/prometheus/prometheus/blob/main/scrape/scrape.go) passes that choice to the OpenMetrics parser. A lookalike gauge named `something_created` is not necessarily recognized counter metadata, so suffix matching alone cannot establish success.

Previously ingested `_created` series remain in historical storage until normal retention removes them. An old range-query result therefore does not prove the new scrape still writes them. Compare timestamps after the configuration change or use an isolated test Prometheus.

If redundant series continue appearing, check the negotiated content type, family metadata, active process flags, and any intermediary that converts OpenMetrics into ordinary text. Do not remove `_created` at the exporter before proving the receiver consumed it; that discards the information the feature needs. Once verified, monitor scrape health and counter queries through a rollout and restart cycle.
