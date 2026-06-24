# How to Configure Apache Traffic Server OpenTelemetry Tracing Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Apache Traffic Server, CDN, Tracing Plugin

Description: Configure the Apache Traffic Server OpenTelemetry tracing plugin to trace CDN request handling and cache operations with OTLP export.

Apache Traffic Server (ATS) is a high-performance caching proxy used as a CDN edge server and forward proxy. ATS supports OpenTelemetry tracing through an experimental global plugin that creates a server span for each transaction, propagates B3 trace headers upstream, and sends trace information to an OTLP HTTP endpoint. This gives you observability into CDN behavior at the request level.

## Installing the OpenTelemetry Plugin

The OpenTelemetry plugin for ATS is available in the ATS source tree. Build it with OpenTelemetry support:

```bash
# Build ATS with the OTel plugin

cd trafficserver
autoconf -i
./configure --enable-experimental-plugins
make
sudo make install
```

The plugin binary is installed in the Traffic Server plugin directory, commonly `/usr/local/libexec/trafficserver/otel_tracer.so` when ATS is installed under `/usr/local`.

## Configuring the Plugin

Add the plugin to `plugin.config`:

```text
# /etc/trafficserver/plugin.config
otel_tracer.so -u http://otel-collector:4318/v1/traces -s ats-cdn -r 0.05
```

The plugin is configured with command-line options in `plugin.config`:

```text
-u  OTLP HTTP traces endpoint, default http://localhost:4317/v1/traces
-s  service name, default otel_tracer
-r  sampling rate from 0.0 to 1.0, default 1.0
```

## Understanding ATS Trace Phases

ATS processes each request through several phases. The OpenTelemetry plugin hooks request processing and creates one server span for the transaction:

```text
Client Request
  |
  +-- read_request           [Create span, read request attributes, extract B3 context]
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
  |
  +-- transaction close      [Set status code, mark 5xx spans as errors, end span]
```

The span duration covers the whole transaction. A cache hit is usually shorter because it skips the origin fetch phases:

```text
Trace (cache hit): total 5ms
  span name: /images/logo.png
  http.status_code: 200
```

A cache miss usually includes the origin fetch:

```text
Trace (cache miss): total 250ms
  span name: /images/logo.png
  http.status_code: 200
  duration: 250ms
```

## Collector Configuration

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318

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
    error_mode: ignore
    traces:
      span:
        - 'attributes["http.route"] == "/health"'

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

```text
http.method:            GET
http.url:               /images/logo.png
http.status_code:       200
http.route:             /images/logo.png
http.host:              cdn.example.com
http.user_agent:        curl/8.0.1
http.scheme:            http
net.host.port:          80
```

The `http.status_code` attribute is added when the transaction closes. A 5xx response also marks the span status as an error.

## ATS remap.config with Trace Headers

Configure ATS to route requests to origin servers:

```text
# /etc/trafficserver/remap.config
map http://cdn.example.com/ http://origin.example.com/
```

The OTel plugin automatically injects B3 trace headers such as `X-B3-TraceId`, `X-B3-SpanId`, and `X-B3-Sampled` into upstream requests, maintaining the distributed trace chain for systems that use B3 propagation.

## Monitoring Cache Performance

The stock OTel plugin does not add cache hit or miss attributes. Use ATS cache metrics or access logs to calculate cache hit ratios:

```text
# From your observability backend
cache_hit_ratio = cache_hits / total_cache_lookups
```

Track these metrics over time to detect cache degradation. A sudden drop in hit ratio might indicate cache eviction issues or changes in content that reduce cacheability.

## Sampling Strategy for CDN

CDN edge servers handle massive request volumes. A 5% sampling rate on a server doing 50,000 requests per second still generates 2,500 traces per second. Consider:

```text
# /etc/trafficserver/plugin.config
otel_tracer.so -u http://otel-collector:4318/v1/traces -s ats-cdn -r 0.001
```

The plugin initializes a parent-based TraceIdRatio sampler, so requests with an incoming sampled B3 context can remain part of the existing distributed trace:

```text
# 1% sampling for newly-created traces
otel_tracer.so -u http://otel-collector:4318/v1/traces -s ats-cdn -r 0.01
```

## Restart and Verify

```bash
# Restart ATS
sudo traffic_ctl server restart

# Check that ATS is running
traffic_ctl server status

# Send a test request
curl -v http://cdn.example.com/test.html
```

## Summary

The Apache Traffic Server OpenTelemetry plugin emits transaction-level spans and propagates B3 trace context to upstream services. Use a low sampling rate for production CDN traffic, and leverage parent-based sampling to maintain trace continuity for already-traced requests. Combine traces with ATS cache metrics and logs for cache-specific visibility.
