# How to Install and Configure the OpenTelemetry Collector on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, OpenTelemetry, Collector, Observability, Monitoring

Description: Install and configure the OpenTelemetry Collector on Ubuntu for receiving, processing, and exporting telemetry data from applications.

---

The OpenTelemetry Collector is a vendor-agnostic implementation that receives, processes, and exports telemetry data. It serves as a central hub in your observability infrastructure, allowing you to collect traces, metrics, and logs from multiple sources and route them to various backends. In this comprehensive guide, we will walk through installing and configuring the OpenTelemetry Collector on Ubuntu, covering everything from basic setup to advanced pipeline configurations.

## Table of Contents

1. [Understanding the OpenTelemetry Collector](#understanding-the-opentelemetry-collector)
2. [Prerequisites](#prerequisites)
3. [Installation Methods](#installation-methods)
4. [Configuration File Structure](#configuration-file-structure)
5. [Configuring Receivers](#configuring-receivers)
6. [Configuring Processors](#configuring-processors)
7. [Configuring Exporters](#configuring-exporters)
8. [Building Pipelines](#building-pipelines)
9. [Running as a Systemd Service](#running-as-a-systemd-service)
10. [Health Checks and Monitoring](#health-checks-and-monitoring)
11. [Troubleshooting Common Issues](#troubleshooting-common-issues)
12. [Best Practices](#best-practices)

## Understanding the OpenTelemetry Collector

The OpenTelemetry Collector is designed with a modular architecture that separates concerns into distinct components:

### Core Components

- **Receivers**: Accept telemetry data from various sources (applications, other collectors, or infrastructure)
- **Processors**: Transform, filter, batch, or enrich data as it flows through the pipeline
- **Exporters**: Send processed data to one or more observability backends
- **Extensions**: Provide additional capabilities like health checking and service discovery
- **Connectors**: Connect two pipelines together, allowing data to flow between different telemetry types

### Collector Distributions

There are two main distributions of the OpenTelemetry Collector:

1. **Core Distribution**: Contains only the essential components maintained by the OpenTelemetry project
2. **Contrib Distribution**: Includes additional receivers, processors, and exporters contributed by the community

For most production use cases, the Contrib distribution is recommended as it includes popular integrations.

## Prerequisites

Before installing the OpenTelemetry Collector, ensure your Ubuntu system meets the following requirements:

```bash
# Check Ubuntu version - Ubuntu 20.04 LTS or later is recommended
lsb_release -a

# Ensure you have sudo privileges
sudo whoami

# Update package lists to ensure latest versions are available
sudo apt update && sudo apt upgrade -y

# Install required utilities for downloading and verifying packages
sudo apt install -y curl wget gnupg2 software-properties-common
```

### System Requirements

- **Memory**: Minimum 512MB RAM (1GB+ recommended for production)
- **CPU**: 1 core minimum (2+ cores recommended for high-throughput scenarios)
- **Disk**: 100MB for the collector binary, additional space for buffering
- **Network**: Outbound access to your telemetry backends

## Installation Methods

### Method 1: Installing via DEB Package (Recommended)

The DEB package installation is the recommended method for Ubuntu systems as it handles systemd service setup automatically.

```bash
# Download the GPG key for the OpenTelemetry repository
# This key is used to verify the authenticity of the packages
sudo curl -fsSL https://apt.opentelemetry.io/opentelemetry.gpg | sudo gpg --dearmor -o /usr/share/keyrings/opentelemetry.gpg

# Add the OpenTelemetry APT repository to your sources list
# Using the signed-by option ensures only packages signed with the correct key are trusted
echo "deb [signed-by=/usr/share/keyrings/opentelemetry.gpg] https://apt.opentelemetry.io stable main" | sudo tee /etc/apt/sources.list.d/opentelemetry.list

# Update package lists to include the new repository
sudo apt update

# Install the OpenTelemetry Collector Contrib distribution
# The contrib version includes additional community-maintained components
sudo apt install -y otelcol-contrib
```

If the official repository is not available, you can download the DEB package directly:

```bash
# Define the version you want to install
# Check https://github.com/open-telemetry/opentelemetry-collector-releases/releases for latest
OTEL_VERSION="0.96.0"

# Download the DEB package for the Contrib distribution
wget https://github.com/open-telemetry/opentelemetry-collector-releases/releases/download/v${OTEL_VERSION}/otelcol-contrib_${OTEL_VERSION}_linux_amd64.deb

# Install the downloaded package
# The -i flag tells dpkg to install the package
sudo dpkg -i otelcol-contrib_${OTEL_VERSION}_linux_amd64.deb

# Resolve any dependency issues that may have occurred
sudo apt install -f
```

### Method 2: Installing via Binary

For environments where you need more control over the installation or cannot use the package manager:

```bash
# Define the version to install
OTEL_VERSION="0.96.0"

# Create a directory for the OpenTelemetry Collector
sudo mkdir -p /opt/otelcol

# Download the tarball for the Contrib distribution
wget https://github.com/open-telemetry/opentelemetry-collector-releases/releases/download/v${OTEL_VERSION}/otelcol-contrib_${OTEL_VERSION}_linux_amd64.tar.gz

# Extract the binary to the installation directory
sudo tar -xzf otelcol-contrib_${OTEL_VERSION}_linux_amd64.tar.gz -C /opt/otelcol

# Create a symbolic link for easier command-line access
sudo ln -sf /opt/otelcol/otelcol-contrib /usr/local/bin/otelcol

# Verify the installation by checking the version
otelcol --version
```

### Creating a Dedicated User

For security purposes, create a dedicated user to run the collector:

```bash
# Create a system user without a home directory or login shell
# This limits the potential impact if the collector is compromised
sudo useradd --system --no-create-home --shell /bin/false otelcol

# Create the configuration directory
sudo mkdir -p /etc/otelcol

# Set ownership of the installation and configuration directories
sudo chown -R otelcol:otelcol /opt/otelcol
sudo chown -R otelcol:otelcol /etc/otelcol
```

## Configuration File Structure

The OpenTelemetry Collector uses YAML configuration files. The configuration is organized into several main sections:

```yaml
# /etc/otelcol/config.yaml
# This is a complete example configuration file demonstrating all major sections

# Extensions provide additional capabilities beyond data processing
extensions:
  # Health check extension exposes an endpoint for liveness/readiness probes
  health_check:
    endpoint: "0.0.0.0:13133"

  # pprof extension enables Go profiling for debugging performance issues
  pprof:
    endpoint: "localhost:1777"

  # zpages extension provides in-memory debugging pages
  zpages:
    endpoint: "localhost:55679"

# Receivers define how data enters the collector
receivers:
  # OTLP receiver accepts data in OpenTelemetry Protocol format
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"
      http:
        endpoint: "0.0.0.0:4318"

# Processors define transformations applied to telemetry data
processors:
  # Batch processor groups data for more efficient export
  batch:
    timeout: 10s
    send_batch_size: 1024

# Exporters define where processed data is sent
exporters:
  # Debug exporter logs data to stdout for troubleshooting
  debug:
    verbosity: detailed

# Service section ties everything together into pipelines
service:
  # Extensions to enable for this collector instance
  extensions: [health_check, pprof, zpages]

  # Pipelines define the flow of telemetry data
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

## Configuring Receivers

Receivers are the entry points for telemetry data. Here are common receiver configurations:

### OTLP Receiver

The OTLP receiver is the primary receiver for OpenTelemetry-native applications:

```yaml
# OTLP receiver configuration with security and performance tuning
receivers:
  otlp:
    protocols:
      # gRPC protocol - preferred for high-throughput scenarios
      grpc:
        endpoint: "0.0.0.0:4317"
        # Maximum message size in bytes (default is 4MB)
        max_recv_msg_size_mib: 16
        # Maximum concurrent streams per connection
        max_concurrent_streams: 100
        # Enable TLS for secure communication
        tls:
          cert_file: /etc/otelcol/certs/server.crt
          key_file: /etc/otelcol/certs/server.key

      # HTTP protocol - useful for web applications and firewalled environments
      http:
        endpoint: "0.0.0.0:4318"
        # CORS configuration for browser-based applications
        cors:
          allowed_origins:
            - "https://your-app.example.com"
          allowed_headers:
            - "Content-Type"
            - "X-Custom-Header"
```

### Prometheus Receiver

For scraping Prometheus-format metrics from applications:

```yaml
# Prometheus receiver for scraping metrics endpoints
receivers:
  prometheus:
    config:
      scrape_configs:
        # Scrape the collector's own metrics
        - job_name: 'otel-collector'
          scrape_interval: 15s
          static_configs:
            - targets: ['localhost:8888']

        # Scrape your application metrics
        - job_name: 'my-application'
          scrape_interval: 30s
          static_configs:
            - targets: ['app-server:9090']
          # Add labels to identify the source
          relabel_configs:
            - source_labels: [__address__]
              target_label: instance
```

### Host Metrics Receiver

For collecting system-level metrics from the host:

```yaml
# Host metrics receiver collects CPU, memory, disk, and network metrics
receivers:
  hostmetrics:
    # How often to collect metrics
    collection_interval: 60s
    # Which scrapers to enable
    scrapers:
      cpu:
        metrics:
          system.cpu.utilization:
            enabled: true
      memory:
        metrics:
          system.memory.utilization:
            enabled: true
      disk:
      filesystem:
      network:
      load:
      paging:
      processes:
```

### Filelog Receiver

For collecting logs from files:

```yaml
# Filelog receiver for ingesting log files
receivers:
  filelog:
    # Include paths to log files - supports glob patterns
    include:
      - /var/log/myapp/*.log
      - /var/log/syslog
    # Exclude certain files
    exclude:
      - /var/log/myapp/*debug*.log
    # Start reading from the beginning of files
    start_at: beginning
    # Parse JSON-formatted logs
    operators:
      - type: json_parser
        timestamp:
          parse_from: attributes.timestamp
          layout: '%Y-%m-%dT%H:%M:%S.%LZ'
```

## Configuring Processors

Processors transform telemetry data as it flows through the pipeline:

### Batch Processor

The batch processor is essential for efficient data export:

```yaml
# Batch processor groups telemetry data for efficient transmission
processors:
  batch:
    # Maximum time to wait before sending a batch
    timeout: 10s
    # Number of spans/metrics/logs to accumulate before sending
    send_batch_size: 8192
    # Maximum batch size to prevent memory issues
    send_batch_max_size: 16384
```

### Memory Limiter Processor

Prevents out-of-memory issues in high-throughput scenarios:

```yaml
# Memory limiter processor prevents the collector from using too much memory
processors:
  memory_limiter:
    # Start refusing data when memory usage reaches this percentage
    limit_percentage: 80
    # Resume accepting data when memory drops below this percentage
    spike_limit_percentage: 25
    # How often to check memory usage
    check_interval: 1s
```

### Attributes Processor

Add, modify, or remove attributes from telemetry data:

```yaml
# Attributes processor for modifying span/metric/log attributes
processors:
  attributes:
    actions:
      # Add a new attribute to all telemetry
      - key: environment
        value: production
        action: insert

      # Update an existing attribute
      - key: service.version
        value: "v2.0.0"
        action: upsert

      # Remove sensitive attributes
      - key: user.password
        action: delete

      # Hash sensitive values instead of removing
      - key: user.email
        action: hash
```

### Resource Processor

Modify resource attributes that describe the entity producing telemetry:

```yaml
# Resource processor for adding resource-level attributes
processors:
  resource:
    attributes:
      # Add deployment information
      - key: deployment.environment
        value: production
        action: insert

      # Add cloud provider information
      - key: cloud.provider
        value: aws
        action: insert

      - key: cloud.region
        value: us-east-1
        action: insert
```

### Filter Processor

Filter out unwanted telemetry data:

```yaml
# Filter processor for dropping unwanted telemetry
processors:
  filter:
    # Filter configuration for traces
    traces:
      span:
        # Drop health check spans to reduce noise
        - 'attributes["http.route"] == "/health"'
        - 'attributes["http.route"] == "/ready"'

    # Filter configuration for metrics
    metrics:
      metric:
        # Exclude specific metrics by name
        - 'name == "system.cpu.time" and attributes["state"] == "idle"'

    # Filter configuration for logs
    logs:
      log_record:
        # Drop debug-level logs
        - 'severity_number < 9'
```

### Tail Sampling Processor

Implement intelligent sampling for traces:

```yaml
# Tail sampling processor for intelligent trace sampling
processors:
  tail_sampling:
    # Time to wait for a complete trace before making a sampling decision
    decision_wait: 10s
    # Number of traces to keep in memory
    num_traces: 100000
    # Expected new traces per second
    expected_new_traces_per_sec: 1000
    policies:
      # Always sample traces with errors
      - name: errors-policy
        type: status_code
        status_code: {status_codes: [ERROR]}

      # Sample slow traces
      - name: latency-policy
        type: latency
        latency: {threshold_ms: 1000}

      # Probabilistic sampling for everything else
      - name: probabilistic-policy
        type: probabilistic
        probabilistic: {sampling_percentage: 10}
```

## Configuring Exporters

Exporters send processed telemetry data to backends:

### OTLP Exporter

Send data to OTLP-compatible backends:

```yaml
# OTLP exporter for sending data to OpenTelemetry-compatible backends
exporters:
  otlp:
    # Endpoint of your telemetry backend
    endpoint: "otel-backend.example.com:4317"
    # TLS configuration
    tls:
      cert_file: /etc/otelcol/certs/client.crt
      key_file: /etc/otelcol/certs/client.key
      ca_file: /etc/otelcol/certs/ca.crt
    # Headers to include with each request
    headers:
      Authorization: "Bearer ${env:OTEL_AUTH_TOKEN}"
    # Retry configuration for resilience
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s
    # Queue configuration for buffering during backend outages
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 10000
```

### OTLP HTTP Exporter

For backends that prefer HTTP:

```yaml
# OTLP HTTP exporter for HTTP-based backends
exporters:
  otlphttp:
    # Use separate endpoints for different telemetry types
    traces_endpoint: "https://otel-backend.example.com/v1/traces"
    metrics_endpoint: "https://otel-backend.example.com/v1/metrics"
    logs_endpoint: "https://otel-backend.example.com/v1/logs"
    # Compression reduces bandwidth usage
    compression: gzip
    headers:
      X-API-Key: "${env:API_KEY}"
```

### Prometheus Remote Write Exporter

Export metrics to Prometheus-compatible backends:

```yaml
# Prometheus remote write exporter for Prometheus-compatible backends
exporters:
  prometheusremotewrite:
    endpoint: "https://prometheus.example.com/api/v1/write"
    # Add external labels to all metrics
    external_labels:
      cluster: production-us-east
    # Authentication
    headers:
      Authorization: "Bearer ${env:PROMETHEUS_TOKEN}"
    # Resource to telemetry conversion
    resource_to_telemetry_conversion:
      enabled: true
```

### Debug Exporter

For development and troubleshooting:

```yaml
# Debug exporter outputs telemetry to stdout
exporters:
  debug:
    # Verbosity level: basic, normal, or detailed
    verbosity: detailed
    # Sample rate - set to 1 to see all data
    sampling_initial: 5
    sampling_thereafter: 200
```

### File Exporter

Export telemetry data to files for archival or debugging:

```yaml
# File exporter writes telemetry to files
exporters:
  file:
    path: /var/log/otelcol/telemetry.json
    # Rotation configuration
    rotation:
      max_megabytes: 100
      max_days: 7
      max_backups: 5
      localtime: true
```

## Building Pipelines

Pipelines connect receivers, processors, and exporters for each telemetry type:

### Complete Pipeline Configuration

```yaml
# Complete pipeline configuration example
service:
  # Enable extensions
  extensions: [health_check, pprof, zpages]

  pipelines:
    # Traces pipeline with sampling and multiple exporters
    traces:
      receivers: [otlp]
      processors:
        - memory_limiter
        - tail_sampling
        - attributes
        - batch
      exporters:
        - otlp
        - debug

    # Metrics pipeline with filtering
    metrics:
      receivers: [otlp, prometheus, hostmetrics]
      processors:
        - memory_limiter
        - filter
        - resource
        - batch
      exporters:
        - prometheusremotewrite
        - otlp

    # Logs pipeline
    logs:
      receivers: [otlp, filelog]
      processors:
        - memory_limiter
        - filter
        - attributes
        - batch
      exporters:
        - otlp

  # Telemetry configuration for the collector itself
  telemetry:
    logs:
      level: info
      initial_fields:
        service: otel-collector
    metrics:
      level: detailed
      address: 0.0.0.0:8888
```

### Multi-Environment Configuration

Use environment variables for configuration that varies between environments:

```yaml
# Configuration using environment variables for flexibility
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "${env:OTEL_GRPC_ENDPOINT}"
      http:
        endpoint: "${env:OTEL_HTTP_ENDPOINT}"

exporters:
  otlp:
    endpoint: "${env:OTEL_EXPORTER_OTLP_ENDPOINT}"
    headers:
      Authorization: "Bearer ${env:OTEL_AUTH_TOKEN}"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp]
```

## Running as a Systemd Service

### Creating the Systemd Service File

If you installed via binary, create a systemd service file:

```bash
# Create the systemd service file for the OpenTelemetry Collector
sudo tee /etc/systemd/system/otelcol.service << 'EOF'
[Unit]
Description=OpenTelemetry Collector
Documentation=https://opentelemetry.io/docs/collector/
After=network-online.target
Wants=network-online.target

[Service]
# Run as the dedicated otelcol user for security
User=otelcol
Group=otelcol

# Path to the collector binary
ExecStart=/usr/local/bin/otelcol --config=/etc/otelcol/config.yaml

# Restart policy - restart on failure
Restart=on-failure
RestartSec=5s

# Limit system resources to prevent runaway resource consumption
MemoryLimit=1G
CPUQuota=200%

# Security hardening options
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadWritePaths=/var/log/otelcol

# Environment file for sensitive configuration
EnvironmentFile=-/etc/otelcol/otelcol.env

[Install]
WantedBy=multi-user.target
EOF
```

### Creating the Environment File

Store sensitive configuration in an environment file:

```bash
# Create the environment file for sensitive values
sudo tee /etc/otelcol/otelcol.env << 'EOF'
# OTLP endpoints
OTEL_GRPC_ENDPOINT=0.0.0.0:4317
OTEL_HTTP_ENDPOINT=0.0.0.0:4318

# Backend configuration
OTEL_EXPORTER_OTLP_ENDPOINT=https://otel-backend.example.com:4317
OTEL_AUTH_TOKEN=your-auth-token-here

# Resource attributes
OTEL_RESOURCE_ATTRIBUTES=service.name=otel-collector,deployment.environment=production
EOF

# Secure the environment file
sudo chmod 600 /etc/otelcol/otelcol.env
sudo chown otelcol:otelcol /etc/otelcol/otelcol.env
```

### Managing the Service

```bash
# Reload systemd to pick up the new service file
sudo systemctl daemon-reload

# Enable the service to start on boot
sudo systemctl enable otelcol

# Start the collector service
sudo systemctl start otelcol

# Check the status of the service
sudo systemctl status otelcol

# View the collector logs
sudo journalctl -u otelcol -f

# Restart the service after configuration changes
sudo systemctl restart otelcol

# Stop the service if needed
sudo systemctl stop otelcol
```

### Validating Configuration

Before restarting the service, validate your configuration:

```bash
# Validate the configuration file syntax
otelcol validate --config=/etc/otelcol/config.yaml

# Test the configuration with a dry run
otelcol --config=/etc/otelcol/config.yaml --dry-run
```

## Health Checks and Monitoring

### Health Check Extension

The health check extension provides endpoints for liveness and readiness probes:

```yaml
# Health check configuration
extensions:
  health_check:
    endpoint: "0.0.0.0:13133"
    path: "/health"
    # Response body for liveness check
    response_body: '{"status": "healthy"}'
    # Check interval for component status
    check_collector_pipeline:
      enabled: true
      interval: 5m
```

### Checking Collector Health

```bash
# Check if the collector is healthy
curl -s http://localhost:13133/health | jq .

# Use in Kubernetes liveness probe
# livenessProbe:
#   httpGet:
#     path: /health
#     port: 13133
#   initialDelaySeconds: 10
#   periodSeconds: 5
```

### Collector Internal Metrics

The collector exposes its own metrics for monitoring:

```yaml
# Configure collector telemetry
service:
  telemetry:
    logs:
      level: info
      # Output format: json or console
      encoding: json
    metrics:
      level: detailed
      # Prometheus metrics endpoint
      address: 0.0.0.0:8888
```

### Key Metrics to Monitor

```bash
# Scrape collector metrics
curl -s http://localhost:8888/metrics | grep otelcol

# Important metrics to monitor:
# otelcol_receiver_accepted_spans - Spans successfully received
# otelcol_receiver_refused_spans - Spans rejected (rate limiting, errors)
# otelcol_exporter_sent_spans - Spans successfully exported
# otelcol_exporter_send_failed_spans - Export failures
# otelcol_processor_batch_batch_send_size - Batch sizes being sent
# otelcol_process_memory_rss - Memory usage
# otelcol_exporter_queue_size - Current queue depth
```

### Setting Up Alerting

Create a Prometheus alerting rule for collector issues:

```yaml
# Prometheus alerting rules for OpenTelemetry Collector
groups:
  - name: otelcol
    rules:
      # Alert when export failures exceed threshold
      - alert: OtelCollectorExportFailures
        expr: rate(otelcol_exporter_send_failed_spans[5m]) > 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "OpenTelemetry Collector export failures detected"
          description: "The collector is failing to export spans"

      # Alert when queue is backing up
      - alert: OtelCollectorQueueBackup
        expr: otelcol_exporter_queue_size > 5000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "OpenTelemetry Collector queue is backing up"
          description: "Export queue size is {{ $value }}"

      # Alert on high memory usage
      - alert: OtelCollectorHighMemory
        expr: otelcol_process_memory_rss > 1e9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "OpenTelemetry Collector high memory usage"
          description: "Memory usage is {{ $value | humanize }}"
```

### zpages for Debugging

The zpages extension provides debugging information:

```yaml
# zpages extension configuration
extensions:
  zpages:
    endpoint: "localhost:55679"
```

Access debugging pages:

```bash
# View trace debugging information
curl http://localhost:55679/debug/tracez

# View pipeline information
curl http://localhost:55679/debug/pipelinez

# View extension information
curl http://localhost:55679/debug/extensionz
```

## Troubleshooting Common Issues

### Issue: Collector Not Starting

```bash
# Check for configuration errors
otelcol validate --config=/etc/otelcol/config.yaml

# Check systemd logs for startup errors
sudo journalctl -u otelcol --since "5 minutes ago"

# Verify file permissions
ls -la /etc/otelcol/config.yaml
ls -la /usr/local/bin/otelcol

# Check if required ports are available
sudo ss -tlnp | grep -E "(4317|4318|8888|13133)"
```

### Issue: Data Not Being Exported

```bash
# Enable debug logging temporarily
# Add to config.yaml under service.telemetry.logs:
#   level: debug

# Check exporter metrics for failures
curl -s http://localhost:8888/metrics | grep otelcol_exporter

# Verify network connectivity to backend
curl -v https://otel-backend.example.com:4317

# Check for TLS certificate issues
openssl s_client -connect otel-backend.example.com:4317
```

### Issue: High Memory Usage

```yaml
# Add memory limiter processor as the first processor in all pipelines
processors:
  memory_limiter:
    limit_percentage: 75
    spike_limit_percentage: 25
    check_interval: 1s

service:
  pipelines:
    traces:
      receivers: [otlp]
      # Memory limiter must be first
      processors: [memory_limiter, batch]
      exporters: [otlp]
```

### Issue: Queue Overflow

```yaml
# Increase queue size and add more consumers
exporters:
  otlp:
    endpoint: "backend:4317"
    sending_queue:
      enabled: true
      # Increase number of consumers for parallel export
      num_consumers: 20
      # Increase queue size
      queue_size: 50000
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 60s
```

## Best Practices

### Security Best Practices

```yaml
# Security-focused configuration
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"
        # Enable TLS
        tls:
          cert_file: /etc/otelcol/certs/server.crt
          key_file: /etc/otelcol/certs/server.key
          client_ca_file: /etc/otelcol/certs/ca.crt
          # Require client certificates
          require_client_cert: true

# Remove sensitive data
processors:
  attributes:
    actions:
      - key: user.password
        action: delete
      - key: auth.token
        action: delete
      - key: credit_card
        action: delete
```

### Performance Optimization

```yaml
# Optimized configuration for high throughput
processors:
  batch:
    # Larger batches for efficiency
    send_batch_size: 10000
    send_batch_max_size: 20000
    timeout: 5s

exporters:
  otlp:
    endpoint: "backend:4317"
    # Compression reduces bandwidth
    compression: zstd
    # Multiple consumers for parallel export
    sending_queue:
      num_consumers: 20
      queue_size: 100000
```

### High Availability Configuration

For production deployments, run multiple collector instances behind a load balancer:

```yaml
# Collector instance configuration for HA deployment
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"
        # Keepalive for load balancer health checks
        keepalive:
          server_parameters:
            time: 30s
            timeout: 5s

# Use consistent hashing for trace-aware load balancing
exporters:
  loadbalancing:
    protocol:
      otlp:
        tls:
          insecure: true
    resolver:
      dns:
        hostname: otel-collector-headless.monitoring.svc.cluster.local
        port: 4317
```

### Configuration Management

```bash
# Use configuration validation in CI/CD
#!/bin/bash
# validate-otel-config.sh

CONFIG_FILE=$1

if ! otelcol validate --config="$CONFIG_FILE" 2>&1; then
    echo "Configuration validation failed!"
    exit 1
fi

echo "Configuration is valid"
exit 0
```

## Conclusion

The OpenTelemetry Collector is a powerful and flexible component in your observability stack. By following this guide, you have learned how to:

- Install the collector using DEB packages or binary distributions
- Configure receivers to ingest traces, metrics, and logs from various sources
- Apply processors to transform, filter, and batch telemetry data
- Set up exporters to send data to your observability backends
- Build complete pipelines connecting all components
- Run the collector as a production-ready systemd service
- Monitor the collector's health and performance

For production deployments, remember to:

1. Always use TLS for data in transit
2. Implement the memory limiter processor to prevent OOM issues
3. Monitor collector metrics and set up alerting
4. Use environment variables for sensitive configuration
5. Validate configuration changes before deploying

The OpenTelemetry Collector continues to evolve with new features and improvements. Stay updated with the latest releases and documentation at [opentelemetry.io](https://opentelemetry.io).
