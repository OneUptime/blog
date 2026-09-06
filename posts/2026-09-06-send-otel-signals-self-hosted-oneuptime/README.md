# How to Send OpenTelemetry Signals to Self-Hosted OneUptime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OneUptime, OpenTelemetry, Telemetry, Self-Hosting, Observability

Description: Send logs, metrics, and traces through an OpenTelemetry Collector to a self-hosted OneUptime OTLP endpoint with secure batching.

---

OneUptime accepts OpenTelemetry logs, metrics, and traces at the self-hosted `/otlp` endpoint. An upstream OpenTelemetry Collector gives applications one local destination and centralizes batching, retries, memory protection, authentication, and TLS. In this topology, the Collector is a component you operate and OneUptime is its OTLP/HTTP destination; there is no separate configuration step for a product-specific OneUptime Collector.

The OneUptime settings below match 12.0.33. Collector component options still depend on the Collector distribution and version you run.

## Create an ingestion key

In OneUptime, open **Project Settings > Telemetry & APM > Ingestion Keys**, create a key, and copy it once into a secret manager. The HTTP header name is:

```text
x-oneuptime-token
```

An ingestion key is not the same as a general OneUptime API key. Scope and rotate it as telemetry credentials.

## Configure the Collector

This baseline receives both OTLP transports locally and exports all three signals over OTLP/HTTP:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 512
    spike_limit_mib: 128
  batch: {}

exporters:
  otlphttp/oneuptime:
    endpoint: https://oneuptime.example.com/otlp
    encoding: json
    headers:
      x-oneuptime-token: ${env:ONEUPTIME_TOKEN}

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlphttp/oneuptime]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlphttp/oneuptime]
    logs:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlphttp/oneuptime]
```

Set `ONEUPTIME_TOKEN` through a Kubernetes Secret, systemd credential, container secret, or equivalent. Do not commit it in the Collector YAML. OneUptime's OTLP/HTTP endpoint supports JSON and protobuf in current integrations; explicit JSON here follows its general Collector example and removes protocol ambiguity.

Keep HTTPS certificate verification enabled. If the self-hosted endpoint uses a private CA, mount that CA and configure the exporter's TLS trust. `insecure: true` is not a production fix.

## Point applications at the local Collector

For an application using the standard OpenTelemetry environment variables:

```bash
export OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector.internal:4318
export OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
export OTEL_SERVICE_NAME=checkout-api
```

The application does not need the OneUptime token when only the Collector can reach OneUptime. Add stable resource attributes such as deployment environment, service version, and region through the SDK or Collector. Use the same `service.name` across logs, metrics, and traces so OneUptime can group signals meaningfully.

For direct application export, set the endpoint to `https://oneuptime.example.com/otlp` and supply `OTEL_EXPORTER_OTLP_HEADERS=x-oneuptime-token=...`. Check whether that SDK appends `/v1/traces`, `/v1/metrics`, or `/v1/logs`; start with the base `/otlp` endpoint as OneUptime documents.

## Validate one signal at a time

Start the Collector and inspect its startup log for all three pipelines. Generate one identifiable trace, metric, and log with the same service name. Search a narrow time range in OneUptime and confirm timestamps and resource attributes.

Validate the key independently:

```bash
curl -i \
  -H "x-oneuptime-token: $ONEUPTIME_TOKEN" \
  https://oneuptime.example.com/otlp/v1/validate
```

A valid key returns 200; an unknown or revoked key returns 401. This check matters because OneUptime's ingest endpoints deliberately return a quiet 200 for an invalid token to avoid a client retry storm. Exporter success alone therefore does not prove that data was stored.

## Harden and observe the pipeline

Restrict ports 4317 and 4318 to application networks, size the memory limiter for the container limit, and persist or accept the loss characteristics of the Collector's sending queue. Monitor Collector refused, dropped, queued, and exported item metrics.

Apply sampling at the correct point. Trace sampling changes diagnostic completeness; log filtering can remove audit evidence; high-cardinality metric attributes increase storage and query cost. Roll out changes to a small service first and compare ingest volume.

## Conclusion

A Collector-based path keeps OneUptime credentials away from application processes and makes telemetry behavior observable. Configure three explicit pipelines, export to the self-hosted `/otlp` base endpoint over trusted TLS, and verify the token plus one sample of every signal.

## Official Documentation

- [OneUptime OpenTelemetry integration](https://oneuptime.com/docs/en/telemetry/open-telemetry)
- [OneUptime Kubernetes telemetry agent](https://oneuptime.com/docs/en/telemetry/kubernetes-agent)
- [OpenTelemetry Collector configuration](https://opentelemetry.io/docs/collector/configuration/)
- [OpenTelemetry Collector resiliency](https://opentelemetry.io/docs/collector/resiliency/)
