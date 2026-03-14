# How to Configure the OTLP Receiver in the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, OTLP Receiver, Configuration, gRPC, HTTP

Description: Learn how to configure the OTLP receiver in the OpenTelemetry Collector for ingesting traces, metrics, and logs via gRPC and HTTP protocols.

The OTLP (OpenTelemetry Protocol) receiver is the primary entry point for telemetry data in the OpenTelemetry Collector. It accepts traces, metrics, and logs using the standardized OTLP protocol over both gRPC and HTTP transports. Understanding how to configure this receiver properly is fundamental to building a robust telemetry pipeline.

For background on what the OpenTelemetry Collector does, see our [detailed introduction](https://oneuptime.com/blog/post/2025-09-18-what-is-opentelemetry-collector-and-why-use-one/view).

## Understanding the OTLP Receiver Architecture

The OTLP receiver acts as a server that listens for incoming telemetry data. It supports multiple protocols simultaneously: gRPC on port 4317 (default) and HTTP/protobuf on port 4318 (default). Applications instrumented with OpenTelemetry SDKs can export directly to these endpoints without additional configuration in most cases.

The receiver handles deserialization, validation, and forwarding of telemetry to the collector's pipeline. It supports all three signal types (traces, metrics, logs) on the same endpoints, making it a unified ingestion point.

## Basic OTLP Receiver Configuration

Starting with a minimal configuration helps understand the core concepts before adding complexity.

```yaml
# collector-config.yaml - minimal OTLP receiver setup
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 10s
    send_batch_size: 1024

exporters:
  logging:
    loglevel: debug

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [logging]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [logging]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [logging]
```

This configuration enables OTLP over both gRPC and HTTP, listening on all network interfaces. The batch processor aggregates telemetry before export, and the logging exporter outputs to stdout for verification.

## Configuring gRPC Transport Options

The gRPC protocol provides efficient binary serialization and bidirectional streaming. Fine-tuning its configuration optimizes for your network conditions and load patterns.

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        # Network configuration
        endpoint: 0.0.0.0:4317

        # Transport settings
        transport: tcp

        # Maximum message size (default: 4MB)
        # Increase for large traces or metric batches
        max_recv_msg_size_mib: 16

        # Maximum concurrent streams per connection
        # Higher values support more simultaneous exports
        max_concurrent_streams: 100

        # Read buffer size for incoming data
        read_buffer_size: 524288  # 512KB

        # Write buffer size for responses
        write_buffer_size: 524288  # 512KB

        # Keep-alive settings to detect dead connections
        keepalive:
          server_parameters:
            max_connection_idle: 300s
            max_connection_age: 3600s
            max_connection_age_grace: 30s
            time: 120s
            timeout: 20s
          enforcement_policy:
            min_time: 60s
            permit_without_stream: true

        # Include metadata in received data
        include_metadata: true
```

The `max_recv_msg_size_mib` setting prevents rejecting large payloads. If you see errors like "grpc: received message larger than max", increase this value. However, extremely large messages might indicate inefficient batching in your SDK configuration.

Keep-alive parameters detect and close idle or dead connections, preventing resource leaks. The enforcement policy prevents clients from overwhelming the server with keep-alive pings.

## Configuring HTTP Transport Options

HTTP transport offers better compatibility with proxies, load balancers, and environments where gRPC is blocked. It uses HTTP/1.1 or HTTP/2 with protobuf or JSON encoding.

```yaml
receivers:
  otlp:
    protocols:
      http:
        # Network configuration
        endpoint: 0.0.0.0:4318

        # CORS configuration for browser-based clients
        cors:
          allowed_origins:
            - https://app.example.com
            - https://*.example.com
          allowed_headers:
            - Content-Type
            - Accept
            - Authorization
          max_age: 7200

        # Maximum request body size (default: no limit)
        max_request_body_size: 16777216  # 16MB

        # Include metadata from HTTP headers
        include_metadata: true

        # Path prefix for endpoints (default: /v1/traces, /v1/metrics, /v1/logs)
        # Useful when running behind a reverse proxy
        # endpoint: /otel/v1/traces
```

CORS configuration is essential when the collector receives telemetry from browser-based applications. Without proper CORS headers, browsers block the requests.

The HTTP receiver automatically handles both `/v1/traces`, `/v1/metrics`, and `/v1/logs` endpoints. You don't need separate receiver configurations for each signal type.

## TLS Configuration for Secure Communication

Production deployments should use TLS to protect telemetry data in transit. The OTLP receiver supports mutual TLS (mTLS) for authentication.

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        tls:
          # Server certificate and key
          cert_file: /etc/otel/certs/server.crt
          key_file: /etc/otel/certs/server.key

          # Client certificate validation (mTLS)
          client_ca_file: /etc/otel/certs/ca.crt

          # Require client certificates
          client_auth_type: RequireAndVerifyClientCert

          # Minimum TLS version
          min_version: "1.2"

          # Maximum TLS version (optional)
          max_version: "1.3"

          # Cipher suites (optional, defaults are secure)
          cipher_suites:
            - TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
            - TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384

      http:
        endpoint: 0.0.0.0:4318
        tls:
          cert_file: /etc/otel/certs/server.crt
          key_file: /etc/otel/certs/server.key
          client_ca_file: /etc/otel/certs/ca.crt
          client_auth_type: RequireAndVerifyClientCert
```

The `client_auth_type` has several options:
- `NoClientCert`: No client authentication (server TLS only)
- `RequestClientCert`: Request but don't require client cert
- `RequireAnyClientCert`: Require client cert but don't verify
- `VerifyClientCertIfGiven`: Verify if provided
- `RequireAndVerifyClientCert`: Require and verify (recommended for production)

Mutual TLS provides strong authentication, ensuring only authorized clients can send telemetry to your collector.

## Authentication and Authorization

Beyond mTLS, you can add application-level authentication using extensions.

```yaml
# Authentication using bearer tokens
extensions:
  bearertokenauth:
    scheme: Bearer
    bearer_token: "your-secret-token-here"

  # Or use a file containing the token
  bearertokenauth/file:
    scheme: Bearer
    filename: /etc/otel/secrets/bearer-token

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        auth:
          authenticator: bearertokenauth
      http:
        endpoint: 0.0.0.0:4318
        auth:
          authenticator: bearertokenauth

service:
  extensions: [bearertokenauth]
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [logging]
```

Clients must include the bearer token in their requests:
- gRPC: Metadata header `authorization: Bearer your-secret-token-here`
- HTTP: Header `Authorization: Bearer your-secret-token-here`

For more sophisticated authentication, consider using the OAuth2 or OIDC authenticator extensions.

## Resource Limits and Rate Limiting

Protecting the collector from overload requires setting appropriate resource limits.

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        # Resource limits prevent memory exhaustion
        max_recv_msg_size_mib: 16
        max_concurrent_streams: 100
      http:
        endpoint: 0.0.0.0:4318
        max_request_body_size: 16777216

# Processor to limit memory usage
processors:
  # Memory limiter prevents OOM by applying back pressure
  memory_limiter:
    check_interval: 1s
    limit_mib: 512
    spike_limit_mib: 128

  batch:
    timeout: 10s
    send_batch_size: 1024
    send_batch_max_size: 2048

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [logging]
```

The memory limiter processor monitors memory usage and applies back pressure when limits are approached. It refuses new data or slows down processing to prevent out-of-memory crashes.

## Multi-Endpoint Configuration

Running multiple OTLP receiver instances with different configurations supports varied client needs.

```yaml
receivers:
  # Public endpoint with authentication
  otlp/public:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        auth:
          authenticator: bearertokenauth
      http:
        endpoint: 0.0.0.0:4318
        cors:
          allowed_origins:
            - https://app.example.com
        auth:
          authenticator: bearertokenauth

  # Internal endpoint without authentication
  otlp/internal:
    protocols:
      grpc:
        endpoint: 127.0.0.1:4327
      http:
        endpoint: 127.0.0.1:4328

  # Metrics-only endpoint with higher limits
  otlp/metrics:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4337
        max_recv_msg_size_mib: 32

extensions:
  bearertokenauth:
    scheme: Bearer
    filename: /etc/otel/secrets/token

service:
  extensions: [bearertokenauth]
  pipelines:
    traces:
      receivers: [otlp/public, otlp/internal]
      exporters: [logging]
    metrics:
      receivers: [otlp/public, otlp/internal, otlp/metrics]
      exporters: [logging]
```

This configuration serves different client types: external clients with authentication, internal services without auth overhead, and a specialized metrics endpoint with higher limits.

## Health Check and Debugging

Monitoring the collector itself ensures reliable telemetry ingestion.

```yaml
extensions:
  health_check:
    endpoint: 0.0.0.0:13133
    path: /health

  pprof:
    endpoint: localhost:1777

  zpages:
    endpoint: localhost:55679

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

exporters:
  logging:
    loglevel: info

service:
  extensions: [health_check, pprof, zpages]
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [logging]

  # Telemetry configuration for the collector itself
  telemetry:
    logs:
      level: info
    metrics:
      level: detailed
      address: localhost:8888
```

The health check extension provides an HTTP endpoint for load balancer probes. The zpages extension offers debugging views showing current pipeline state and recent telemetry samples.

## Load Balancing Considerations

When deploying multiple collector instances, configure load balancing appropriately for your protocol.

```yaml
# Collector configuration for load-balanced deployment
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        # Enable HTTP/2 keep-alive for proper load balancing
        keepalive:
          server_parameters:
            time: 120s
            timeout: 20s
      http:
        endpoint: 0.0.0.0:4318
```

For gRPC, use a load balancer that supports HTTP/2 and can balance at the RPC call level, not just the connection level. HAProxy, Envoy, and cloud load balancers typically support this.

For HTTP, any standard load balancer works since each request is independent.

## OTLP Receiver Data Flow

Visualizing how data flows through the receiver helps understand its role in the pipeline.

```mermaid
graph TD
    A[Application with OTLP Exporter] -->|gRPC :4317| B[OTLP Receiver]
    C[Browser Application] -->|HTTP :4318| B
    D[Other Service] -->|gRPC :4317| B

    B --> E[Memory Limiter]
    E --> F[Batch Processor]
    F --> G[Exporters]

    G --> H[Jaeger]
    G --> I[Prometheus]
    G --> J[Loki]

    style B fill:#e1f5ff
    style F fill:#ffe1f5
    style G fill:#f5ffe1
```

The receiver handles multiple concurrent connections, each potentially sending traces, metrics, and logs. The pipeline processes all signals before exporting to backends.

## Performance Tuning

Optimizing OTLP receiver performance requires balancing throughput, latency, and resource usage.

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        # Increase for high-throughput scenarios
        max_recv_msg_size_mib: 32
        max_concurrent_streams: 500
        read_buffer_size: 1048576  # 1MB
        write_buffer_size: 1048576

        keepalive:
          server_parameters:
            max_connection_idle: 600s
            time: 120s
            timeout: 20s

      http:
        endpoint: 0.0.0.0:4318
        max_request_body_size: 33554432  # 32MB

processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 2048  # Increased for higher throughput
    spike_limit_mib: 512

  batch:
    # Larger batches reduce export frequency
    timeout: 5s
    send_batch_size: 8192
    send_batch_max_size: 16384

exporters:
  otlp:
    endpoint: backend:4317
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 5000
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp]
```

Larger buffers and batch sizes increase throughput at the cost of latency and memory. Tune these based on your specific workload characteristics.

## Common Configuration Mistakes

Several configuration errors cause subtle issues:

1. **Insufficient message size limits**: Default 4MB may be too small for heavily instrumented applications
2. **Missing CORS headers**: Blocks browser-based telemetry without clear error messages
3. **No memory limiter**: Allows OOM crashes under load spikes
4. **Wrong endpoint format**: `0.0.0.0:4317` not `http://0.0.0.0:4317` (protocol prefix not needed)
5. **Conflicting port bindings**: Multiple receivers trying to use the same port

## Testing Your Configuration

Verify the receiver works correctly before deploying to production.

```bash
# Start the collector with your configuration
./otelcol --config collector-config.yaml

# Test gRPC endpoint with grpcurl
grpcurl -plaintext \
  -d '{"resource_spans": []}' \
  localhost:4317 \
  opentelemetry.proto.collector.trace.v1.TraceService/Export

# Test HTTP endpoint with curl
curl -X POST http://localhost:4318/v1/traces \
  -H "Content-Type: application/x-protobuf" \
  --data-binary @sample-trace.pb

# Check health endpoint
curl http://localhost:13133/health

# View zpages for debugging
open http://localhost:55679/debug/tracez
```

The OTLP receiver is the gateway for telemetry into your observability infrastructure. Proper configuration ensures reliable ingestion, appropriate security, and optimal performance. Start with basic settings and incrementally add authentication, TLS, and tuning as your deployment matures. Monitor the collector's own telemetry to identify bottlenecks and adjust configuration accordingly.
