# How to Configure Apache Traffic Server (ATS) OpenTelemetry Tracing Plugin for CDN Observability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Apache Traffic Server, CDN, Tracing Plugin

Description: Configure the Apache Traffic Server OpenTelemetry tracing plugin to trace CDN request handling and cache operations with OTLP export.

Apache Traffic Server (ATS) is a high-performance caching proxy used as a CDN edge server and forward proxy. ATS supports OpenTelemetry tracing through a plugin that instruments request handling, cache lookups, and origin fetches. This gives you observability into CDN behavior at the request level.

## Installing the OpenTelemetry Plugin

The OpenTelemetry plugin for ATS is available in the ATS source tree. Build it with OpenTelemetry support:

```bash
# Build ATS with the OTel plugin
cd trafficserver
./configure --enable-experimental-plugins
make
sudo make install
```

The plugin binary is installed at `/usr/local/libexec/trafficserver/otel_tracer.so`.

## Configuring the Plugin

Add the plugin to `plugin.config`:

```
# /etc/trafficserver/plugin.config
otel_tracer.so --config /etc/trafficserver/otel_tracer.yaml
```

Create the tracer configuration:

```yaml
# /etc/trafficserver/otel_tracer.yaml
exporter:
  # OTLP gRPC endpoint
  endpoint: "otel-collector:4317"
  # Use insecure connection (set to false for TLS)
  insecure: true

service:
  name: "ats-cdn"
  version: "9.2"
  attributes:
    deployment.environment: production
    cloud.region: us-east-1

sampler:
  # Trace 5% of requests
  type: traceidratio
  param: 0.05

# Which phases to trace
trace_phases:
  - read_request
  - cache_lookup
  - send_request_to_origin
  - read_response_from_origin
  - send_response_to_client
```

## Understanding ATS Trace Phases

ATS processes each request through several phases. The plugin creates spans for each:

```
Client Request
  |
  +-- read_request           [Parse and validate the request]
  |
  +-- cache_lookup           [Check the cache for the content]
  |     |
  |     +-- cache_hit        [Content found in cache]
  |     +-- cache_miss       [Content not in cache]
  |
  +-- send_request_to_origin [Forward request to origin (on miss)]
  |
  +-- read_response_from_origin [Receive origin response]
  |
  +-- send_response_to_client  [Send response to the client]
```

A cache hit trace is shorter because it skips the origin fetch phases:

```
Trace (cache hit): total 5ms
  read_request:              1ms
  cache_lookup:              2ms (result: HIT)
  send_response_to_client:   2ms
```

A cache miss trace includes the origin fetch:

```
Trace (cache miss): total 250ms
  read_request:              1ms
  cache_lookup:              2ms (result: MISS)
  send_request_to_origin:    5ms
  read_response_from_origin: 230ms  <-- origin is slow
  send_response_to_client:   12ms
```

## Collector Configuration

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s
    send_batch_size: 1024

  resource:
    attributes:
      - key: service.type
        value: cdn
        action: upsert

  # Filter out high-volume health check spans
  filter:
    spans:
      exclude:
        match_type: strict
        attributes:
          - key: http.url
            value: /health

exporters:
  otlp:
    endpoint: "your-backend:4317"
    tls:
      insecure: false

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [filter, resource, batch]
      exporters: [otlp]
```

## Custom Span Attributes

The plugin adds these attributes to each span:

```
http.method:            GET
http.url:               /images/logo.png
http.status_code:       200
http.response_content_length: 45678
cache.status:           HIT | MISS | STALE | REVALIDATED
cache.key:              /images/logo.png
origin.server:          origin.example.com:443
origin.response_time:   230ms
client.ip:              10.0.0.5
ats.node:               edge-01.us-east-1
```

The `cache.status` attribute is particularly valuable. It tells you whether the request was served from cache or required an origin fetch.

## ATS remap.config with Trace Headers

Configure ATS to propagate trace context to origin servers:

```
# /etc/trafficserver/remap.config
map http://cdn.example.com/ http://origin.example.com/
```

The OTel plugin automatically injects `traceparent` and `tracestate` headers into origin requests, maintaining the distributed trace chain.

## Monitoring Cache Performance

Use trace data to calculate cache hit ratios:

```
# From your observability backend
cache_hit_ratio = count(spans where cache.status = "HIT") / count(all spans)
```

Track these metrics over time to detect cache degradation. A sudden drop in hit ratio might indicate cache eviction issues or changes in content that reduce cacheability.

## Sampling Strategy for CDN

CDN edge servers handle massive request volumes. A 5% sampling rate on a server doing 50,000 requests per second still generates 2,500 traces per second. Consider:

```yaml
sampler:
  type: traceidratio
  param: 0.001  # 0.1% sampling
```

Or use parent-based sampling to trace requests that are already being traced upstream:

```yaml
sampler:
  type: parentbased_traceidratio
  param: 0.01  # 1% for new traces, 100% for existing traces
```

## Restart and Verify

```bash
# Restart ATS
sudo traffic_ctl server restart

# Check that the plugin loaded
traffic_ctl plugin msg otel_tracer status

# Send a test request
curl -v http://cdn.example.com/test.html
```

## Summary

The Apache Traffic Server OpenTelemetry plugin traces CDN request handling phases including cache lookups, origin fetches, and client responses. The cache status attribute on each span tells you whether content was served from cache or required an origin round-trip. Use a low sampling rate for production CDN traffic, and leverage parent-based sampling to maintain trace continuity for already-traced requests. This gives you visibility into CDN performance that is hard to get from metrics alone.
