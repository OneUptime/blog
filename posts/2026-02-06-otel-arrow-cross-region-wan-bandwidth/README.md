# How to Configure OTel Arrow for Cross-Region Telemetry Transport to Minimize WAN Bandwidth Costs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTel Arrow, Cross-Region, Bandwidth

Description: Configure OTel Arrow for cross-region telemetry transport to minimize WAN bandwidth costs and cloud egress fees.

Cross-region telemetry transport is one of the most expensive parts of running a distributed observability stack. Cloud providers charge $0.01-0.09 per GB for inter-region data transfer, and telemetry data adds up fast. A fleet of 500 microservices generating 50,000 spans per second can easily produce 2-5 GB of telemetry data per hour. At cross-region egress rates, that is $150-$400 per month just for one hop. OTel Arrow can cut that cost by 50-70% with the right configuration.

## The Cost Problem

Let us quantify it. A typical microservices deployment generates:

```
Traces:  50,000 spans/sec * 1 KB avg = 50 MB/sec = 180 GB/hour
Metrics: 100,000 data points/sec * 200 B avg = 20 MB/sec = 72 GB/hour
Logs:    10,000 records/sec * 500 B avg = 5 MB/sec = 18 GB/hour

Total: 75 MB/sec = 270 GB/hour = 6.5 TB/day
```

With standard OTLP + gzip compression (roughly 4:1), you send about 1.6 TB/day over the WAN. At $0.02/GB for inter-region transfer, that is $32/day or $960/month.

With OTel Arrow + Zstd (roughly 10:1 total compression), you send about 650 GB/day. Cost: $13/day or $390/month. That is a $570/month saving from a configuration change.

## Architecture for Cross-Region Transport

```
Region A (us-east-1):
  [Apps] -> [Agent Collectors] -> [Regional Gateway]
                                        |
                                        | OTel Arrow (cross-region)
                                        |
Region B (us-west-2):                   v
                              [Central Gateway] -> [Backends]
```

The OTel Arrow link is specifically between the regional gateway and the central gateway. Local traffic (apps to agents, agents to regional gateway) stays within the region and can use standard OTLP.

## Regional Gateway Configuration

```yaml
# regional-gateway-config.yaml (deployed in each region)
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  memory_limiter:
    check_interval: 5s
    limit_mib: 2048
    spike_limit_mib: 512

  # Batch aggressively for better Arrow compression
  batch:
    timeout: 10s
    send_batch_size: 5000
    send_batch_max_size: 10000

  # Add region metadata
  resource:
    attributes:
      - key: cloud.region
        value: "us-east-1"
        action: upsert

  # Optional: filter out low-value telemetry before cross-region transfer
  filter/traces:
    traces:
      span:
        - 'attributes["http.status_code"] == 200 and duration < 100ms'
        # Drop fast, successful spans to reduce volume

exporters:
  otelarrow:
    endpoint: central-gateway.us-west-2.internal:4317
    tls:
      cert_file: /etc/ssl/certs/client.crt
      key_file: /etc/ssl/private/client.key
      ca_file: /etc/ssl/certs/ca.crt
    compression: zstd
    arrow:
      num_streams: 8          # More streams for higher throughput
      max_stream_lifetime: 30m  # Longer lifetime for better compression
    sending_queue:
      enabled: true
      num_consumers: 8
      queue_size: 1000        # Large queue to buffer during WAN latency spikes
    retry_on_failure:
      enabled: true
      initial_interval: 10s
      max_interval: 120s
      max_elapsed_time: 600s
    timeout: 60s              # Longer timeout for cross-region latency

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, resource, filter/traces, batch]
      exporters: [otelarrow]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, resource, batch]
      exporters: [otelarrow]
    logs:
      receivers: [otlp]
      processors: [memory_limiter, resource, batch]
      exporters: [otelarrow]
```

Key settings for cross-region transport:

- **`max_stream_lifetime: 30m`**: Longer streams mean better compression. Load balancing is less of a concern since you typically have a single central gateway endpoint.
- **`num_streams: 8`**: More streams provide higher throughput. Cross-region links have higher latency, so multiple streams keep the pipeline from being bottlenecked by round-trip time.
- **`queue_size: 1000`**: A large queue buffers data during WAN latency spikes or brief connectivity issues.
- **`timeout: 60s`**: Cross-region latency can be 50-200ms, so give exports more time.

## Central Gateway Configuration

```yaml
# central-gateway-config.yaml
receivers:
  otelarrow:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        max_recv_msg_size_mib: 32  # Larger for big cross-region batches
        tls:
          cert_file: /etc/ssl/certs/server.crt
          key_file: /etc/ssl/private/server.key
          client_ca_file: /etc/ssl/certs/ca.crt
        keepalive:
          server_parameters:
            max_connection_idle: 300s
            max_connection_age: 1800s   # 30 minutes
            max_connection_age_grace: 60s
            time: 30s
            timeout: 20s
        arrow:
          memory_limit_mib: 512       # More memory for cross-region batches

processors:
  batch:
    timeout: 10s
    send_batch_size: 5000

exporters:
  otlp/traces:
    endpoint: tempo:4317
  prometheusremotewrite:
    endpoint: http://mimir:9009/api/v1/push

service:
  pipelines:
    traces:
      receivers: [otelarrow]
      processors: [batch]
      exporters: [otlp/traces]
    metrics:
      receivers: [otelarrow]
      processors: [batch]
      exporters: [prometheusremotewrite]
```

## TLS Configuration

Cross-region traffic traverses public or semi-public networks. Always use TLS:

```bash
# Generate certificates (use your actual CA in production)
openssl req -x509 -newkey rsa:4096 -keyout ca.key -out ca.crt -days 365 -nodes
openssl req -newkey rsa:4096 -keyout server.key -out server.csr -nodes
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -out server.crt -days 365
openssl req -newkey rsa:4096 -keyout client.key -out client.csr -nodes
openssl x509 -req -in client.csr -CA ca.crt -CAkey ca.key -out client.crt -days 365
```

## Reducing Volume Before Cross-Region Transfer

The cheapest byte is the one you do not send. Apply filtering and sampling at the regional gateway:

```yaml
processors:
  # Tail sampling: only send interesting traces
  tail_sampling:
    decision_wait: 30s
    policies:
      - name: error-traces
        type: status_code
        status_code: {status_codes: [ERROR]}
      - name: slow-traces
        type: latency
        latency: {threshold_ms: 1000}
      - name: sampled-normal
        type: probabilistic
        probabilistic: {sampling_percentage: 10}
```

This keeps all error traces and slow traces but only samples 10% of normal traces. Combined with OTel Arrow compression, you can reduce cross-region bandwidth by 90% or more compared to sending everything with standard OTLP.

## Monitoring Cross-Region Bandwidth

Track your actual bandwidth savings:

```promql
# Bytes per second crossing the WAN
rate(otelcol_exporter_sent_bytes_total{exporter="otelarrow"}[5m])

# Convert to monthly cost estimate (at $0.02/GB)
rate(otelcol_exporter_sent_bytes_total{exporter="otelarrow"}[5m])
  * 86400 * 30  # seconds in a month
  / 1e9          # convert to GB
  * 0.02         # cost per GB
```

Set up a cost tracking dashboard so you can see the dollar impact of your OTel Arrow deployment in real time.
