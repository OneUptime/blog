# How to Build a Fan-Out Pipeline That Sends Traces to Multiple Backends Simultaneously for Backend Comparison

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Fan-Out, Traces, Backend Comparison

Description: Learn how to configure an OpenTelemetry Collector fan-out pipeline that sends traces to multiple backends at the same time for evaluation and comparison.

When you are evaluating observability backends, the last thing you want is to commit to one before you have real production data flowing through it. A fan-out pipeline in the OpenTelemetry Collector lets you send the same traces to two or more backends simultaneously. This way you can compare performance, query capabilities, and cost without changing a single line of application code.

## Why Fan-Out?

Most teams pick an observability backend based on demos and marketing materials. The problem is that synthetic data never tells the full story. What you really need is your actual production traces flowing into both backends so you can compare apples to apples. Fan-out pipelines solve this by duplicating telemetry at the collector level.

## The Architecture

The idea is straightforward. You define one receiver, one or more processors, and multiple exporters. The collector sends the same processed data to every exporter listed in the pipeline. There is no special connector or plugin needed for this pattern.

```
[Application] --> [OTLP Receiver] --> [Batch Processor] --> [Exporter A (Backend 1)]
                                                        --> [Exporter B (Backend 2)]
```

## Collector Configuration

Here is a complete `otel-collector-config.yaml` that sends traces to both OneUptime and a second backend (say Jaeger) at the same time:

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"
      http:
        endpoint: "0.0.0.0:4318"

processors:
  # Batch traces before exporting to reduce network overhead
  batch:
    send_batch_size: 512
    timeout: 5s

  # Limit memory usage so we don't OOM
  memory_limiter:
    check_interval: 1s
    limit_mib: 512
    spike_limit_mib: 128

exporters:
  # Primary backend - OneUptime
  otlp/oneuptime:
    endpoint: "https://otlp.oneuptime.com:4317"
    headers:
      x-oneuptime-token: "${ONEUPTIME_TOKEN}"
    tls:
      insecure: false

  # Secondary backend - Jaeger for comparison
  otlp/jaeger:
    endpoint: "jaeger-collector.monitoring.svc:4317"
    tls:
      insecure: true

  # Optional: debug exporter for local troubleshooting
  debug:
    verbosity: basic

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      # All three exporters receive every trace
      exporters: [otlp/oneuptime, otlp/jaeger, debug]
```

The key is the `exporters` array in the pipeline definition. Every exporter listed there gets the same data after processing.

## Handling Failures Independently

One concern with fan-out is that a slow or failing backend could block the others. The collector handles this well because each exporter operates independently. However, you should configure retry and queue settings per exporter so a failure on one does not cause backpressure on the pipeline:

```yaml
exporters:
  otlp/oneuptime:
    endpoint: "https://otlp.oneuptime.com:4317"
    headers:
      x-oneuptime-token: "${ONEUPTIME_TOKEN}"
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 5000

  otlp/jaeger:
    endpoint: "jaeger-collector.monitoring.svc:4317"
    tls:
      insecure: true
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 120s
    sending_queue:
      enabled: true
      num_consumers: 5
      queue_size: 2000
```

Notice that the queue sizes differ. Your primary backend gets a larger queue because you care more about data completeness there. The evaluation backend can afford to drop some data if it falls behind.

## Deploying with Docker Compose

Here is a quick way to test this locally:

```yaml
# docker-compose.yaml
version: "3.8"
services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    command: ["--config=/etc/otel-collector-config.yaml"]
    volumes:
      - ./otel-collector-config.yaml:/etc/otel-collector-config.yaml
    ports:
      - "4317:4317"   # gRPC
      - "4318:4318"   # HTTP
    environment:
      - ONEUPTIME_TOKEN=${ONEUPTIME_TOKEN}

  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686" # Jaeger UI
      - "14250:14250" # gRPC
```

## Monitoring the Fan-Out

You will want to know if one of the exporters is lagging. The collector exposes internal metrics that are very useful here:

```yaml
service:
  telemetry:
    metrics:
      address: "0.0.0.0:8888"
```

Then query `otelcol_exporter_sent_spans` and `otelcol_exporter_send_failed_spans` per exporter to compare throughput and error rates.

## Things to Watch Out For

- **Double the egress cost**: You are sending data twice, so watch your network bills.
- **Memory pressure**: Each exporter has its own sending queue. Two exporters means roughly double the memory for queued data.
- **Different protocols**: If one backend speaks OTLP and the other speaks Zipkin, you need different exporter types, but the fan-out pattern still works.

## Wrapping Up

Fan-out pipelines are the cleanest way to evaluate backends with real production data. You configure it once in the collector, your applications stay untouched, and you can remove the extra exporter when the evaluation is done. This pattern is also useful long-term if you genuinely need data in multiple systems, for example traces in an observability platform and a copy in S3 for compliance.
