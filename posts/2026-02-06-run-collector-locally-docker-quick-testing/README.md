# How to Run the Collector Locally in Docker for Quick Testing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Docker, Testing, Local Development, DevOps

Description: Learn how to run the OpenTelemetry Collector locally in Docker for rapid testing, configuration validation, and development workflows.

---

When you are building or debugging an OpenTelemetry pipeline, the fastest feedback loop comes from running the Collector locally. Docker makes this trivial. You can spin up a fully configured Collector in seconds, point your application at it, and watch the telemetry flow through in real time. No Kubernetes clusters, no cloud accounts, no waiting for CI pipelines. Just a container, a config file, and your application.

This guide walks through everything you need to get a local Collector running in Docker, from the basic one-liner to more advanced setups with custom configurations, multiple pipelines, and persistent storage.

## The Simplest Possible Setup

If you just want to see the Collector running and logging telemetry data to the console, this is all you need:

```bash
# Run the Collector with the default configuration
# The debug exporter prints all received telemetry to stdout
docker run --rm -p 4317:4317 -p 4318:4318 \
  otel/opentelemetry-collector-contrib:latest
```

This starts the contrib distribution of the Collector with default settings. Port 4317 is the gRPC endpoint and 4318 is the HTTP endpoint for OTLP. Your application can send traces, metrics, and logs to either port.

The default configuration includes a debug exporter that prints received telemetry to the container logs. You can watch the output with `docker logs` or just run the container in the foreground.

## Using a Custom Configuration

The default config is fine for a smoke test, but you will want your own configuration almost immediately. Create a config file on your host machine and mount it into the container:

```yaml
# otel-collector-config.yaml
# Custom collector configuration for local testing

receivers:
  otlp:
    protocols:
      # gRPC receiver on the standard port
      grpc:
        endpoint: 0.0.0.0:4317
      # HTTP receiver for applications that prefer HTTP/JSON
      http:
        endpoint: 0.0.0.0:4318

processors:
  # Batch processor groups telemetry for efficient processing
  batch:
    timeout: 5s
    send_batch_size: 256

exporters:
  # Debug exporter prints telemetry to stdout
  # Set verbosity to detailed to see all attributes
  debug:
    verbosity: detailed

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [debug]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [debug]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [debug]
```

Now run the Collector with your custom config:

```bash
# Mount the local config file into the container
# The -v flag maps your host file to the container path
docker run --rm \
  -p 4317:4317 \
  -p 4318:4318 \
  -v $(pwd)/otel-collector-config.yaml:/etc/otelcol-contrib/config.yaml \
  otel/opentelemetry-collector-contrib:latest
```

The `-v` flag mounts your local configuration file at the path the Collector expects. Any changes you make to the local file will be reflected when you restart the container.

## Using Docker Compose for Repeatable Setups

For anything beyond a quick test, Docker Compose gives you a more manageable setup. It also makes it easy to add backend services like Jaeger or Prometheus alongside the Collector:

```yaml
# docker-compose.yaml
# Local OpenTelemetry development stack
version: '3.8'

services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    container_name: otel-collector
    # Mount the config and expose necessary ports
    volumes:
      - ./otel-collector-config.yaml:/etc/otelcol-contrib/config.yaml
    ports:
      - "4317:4317"   # OTLP gRPC
      - "4318:4318"   # OTLP HTTP
      - "8888:8888"   # Collector metrics
      - "8889:8889"   # Prometheus exporter
      - "55679:55679" # zPages
    restart: unless-stopped

  jaeger:
    image: jaegertracing/all-in-one:latest
    container_name: jaeger
    ports:
      - "16686:16686" # Jaeger UI
      - "14250:14250" # gRPC for Collector

  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    volumes:
      - ./prometheus.yaml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"   # Prometheus UI
```

With this Compose file, a single `docker compose up` gives you the Collector, a trace backend, and a metrics backend. Update your Collector config to export to these services:

```yaml
# otel-collector-config.yaml for the Compose stack
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 5s

exporters:
  # Send traces to Jaeger
  otlp/jaeger:
    endpoint: jaeger:14250
    tls:
      insecure: true

  # Expose metrics for Prometheus scraping
  prometheus:
    endpoint: 0.0.0.0:8889

  # Keep debug output for development visibility
  debug:
    verbosity: basic

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/jaeger, debug]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheus, debug]
```

Now when your application sends traces, you can view them in the Jaeger UI at `http://localhost:16686`. Metrics show up in Prometheus at `http://localhost:9090`.

## Sending Test Data to the Collector

Once your Collector is running, you want to verify it is receiving data correctly. The `telemetrygen` tool is perfect for this:

```bash
# Install telemetrygen for generating test telemetry
go install github.com/open-telemetry/opentelemetry-collector-contrib/cmd/telemetrygen@latest

# Send 10 test traces to the Collector
telemetrygen traces --otlp-insecure --traces 10

# Send test metrics
telemetrygen metrics --otlp-insecure --metrics 5

# Send test logs
telemetrygen logs --otlp-insecure --logs 10
```

If you do not have Go installed, you can also use `curl` to send OTLP data over HTTP:

```bash
# Send a single trace span via OTLP HTTP/JSON
curl -X POST http://localhost:4318/v1/traces \
  -H "Content-Type: application/json" \
  -d '{
    "resourceSpans": [{
      "resource": {
        "attributes": [{
          "key": "service.name",
          "value": {"stringValue": "test-service"}
        }]
      },
      "scopeSpans": [{
        "scope": {"name": "test-scope"},
        "spans": [{
          "traceId": "5b8aa5a2d2c872e8321cf37308d69df2",
          "spanId": "051581bf3cb55c13",
          "name": "test-span",
          "kind": 1,
          "startTimeUnixNano": "1704067200000000000",
          "endTimeUnixNano": "1704067201000000000",
          "attributes": [{
            "key": "http.method",
            "value": {"stringValue": "GET"}
          }]
        }]
      }]
    }]
  }'
```

You should see the telemetry data appear in your Collector's debug output.

## Validating Configuration Before Running

The Collector has a built-in validation command that checks your configuration for errors without actually starting the service:

```bash
# Validate the configuration file without starting the Collector
docker run --rm \
  -v $(pwd)/otel-collector-config.yaml:/etc/otelcol-contrib/config.yaml \
  otel/opentelemetry-collector-contrib:latest \
  validate --config=/etc/otelcol-contrib/config.yaml
```

This catches YAML syntax errors, unknown component names, and invalid configuration values. Run this before every `docker run` to save yourself from cryptic startup failures.

## Choosing Between Contrib and Core Distributions

The OpenTelemetry Collector comes in two main distributions:

```text
otel/opentelemetry-collector        - Core distribution (minimal)
otel/opentelemetry-collector-contrib - Contrib distribution (batteries included)
```

The core distribution includes only the essential components: OTLP receiver, batch processor, and OTLP/debug exporters. The contrib distribution adds hundreds of additional receivers, processors, and exporters maintained by the community.

For local testing, the contrib distribution is usually the right choice because it includes everything you might need. In production, you would typically build a custom distribution with only the components you use.

## Debugging Common Issues

When things are not working, here are the most common problems and their solutions.

If your application cannot connect to the Collector, check that you are using the right address. From the host machine, use `localhost:4317`. From another Docker container, use the container name or `host.docker.internal`:

```bash
# From host machine, your app connects to localhost
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317

# From another container in the same Docker network,
# use the container name as the hostname
export OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
```

If you see "connection refused" errors, make sure the ports are mapped correctly and the Collector has fully started. The Collector logs a message like "Everything is ready" when it is accepting connections.

To see more detailed logs from the Collector itself, set the log level:

```yaml
# Add this to your collector config for verbose logging
service:
  telemetry:
    logs:
      level: debug
```

## Hot Reloading Configuration Changes

During development, you will iterate on your Collector configuration frequently. Instead of stopping and restarting the container each time, you can use the `--config` flag with a file watcher or simply send a SIGHUP signal:

```bash
# Find the Collector container ID
docker ps

# Send SIGHUP to trigger a config reload
docker kill --signal=SIGHUP otel-collector
```

This reloads the configuration without dropping any in-flight telemetry. It is much faster than a full container restart.

## Resource Limits for Local Testing

Running the Collector alongside your application can consume significant memory if you are generating a lot of telemetry. Set resource limits in your Docker Compose file to prevent the Collector from starving your application:

```yaml
# Resource limits for the Collector container
services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
    # Also configure memory limiter processor
    volumes:
      - ./otel-collector-config.yaml:/etc/otelcol-contrib/config.yaml
```

Pair this with the memory limiter processor in your Collector config to prevent OOM kills:

```yaml
processors:
  memory_limiter:
    # Start rejecting data at 400MB
    limit_mib: 400
    # Start applying back pressure at 350MB
    spike_limit_mib: 50
    check_interval: 1s
```

## Wrapping Up

Running the OpenTelemetry Collector locally in Docker is the fastest way to test and iterate on your observability pipeline. Start with a simple `docker run` command, graduate to Docker Compose when you need backends, and use `telemetrygen` or `curl` to validate your setup. The key to a productive workflow is keeping the feedback loop tight: change your config, restart the container, and see the results immediately. Once you have a working configuration, it is straightforward to promote it to your staging and production environments.
