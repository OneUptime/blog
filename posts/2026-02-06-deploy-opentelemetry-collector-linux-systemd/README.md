# How to Deploy the OpenTelemetry Collector as a Linux Systemd Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Linux, Systemd, Deployment, Service Management, Bare Metal

Description: Deploy OpenTelemetry Collectors as systemd services on Linux systems for reliable, production-ready telemetry collection with automatic startup, logging, and resource management.

Running the OpenTelemetry Collector as a systemd service provides robust process management, automatic restarts, and integration with Linux system logging. This deployment method is ideal for bare metal servers, virtual machines, and environments where containerization is not available or desired.

## Understanding Systemd Service Management

Systemd is the standard init system for modern Linux distributions, managing system services and processes. Deploying the collector as a systemd service provides:

**Automatic Startup**: The collector starts automatically on system boot and restarts after failures or updates.

**Process Supervision**: Systemd monitors the collector process and restarts it according to configured restart policies.

**Resource Control**: Limit CPU, memory, and other resources using systemd's cgroup integration.

**Logging Integration**: Collector logs are captured by journald and can be viewed with `journalctl`.

**Dependency Management**: Control startup order and dependencies with other services.

This approach is particularly valuable for on-premises deployments, edge computing, and traditional infrastructure where containers may not be appropriate.

## Installing the OpenTelemetry Collector Binary

Start by downloading and installing the collector binary:

```bash
# Set version and architecture
OTEL_VERSION="0.93.0"
ARCH="amd64"  # or arm64, arm, etc.

# Download the collector binary
curl -LO "https://github.com/open-telemetry/opentelemetry-collector-releases/releases/download/v${OTEL_VERSION}/otelcol-contrib_${OTEL_VERSION}_linux_${ARCH}.tar.gz"

# Verify checksum (recommended)
curl -LO "https://github.com/open-telemetry/opentelemetry-collector-releases/releases/download/v${OTEL_VERSION}/otelcol-contrib_${OTEL_VERSION}_linux_${ARCH}.tar.gz.sha256"
sha256sum -c "otelcol-contrib_${OTEL_VERSION}_linux_${ARCH}.tar.gz.sha256"

# Extract the binary
tar -xzf "otelcol-contrib_${OTEL_VERSION}_linux_${ARCH}.tar.gz"

# Install to system location
sudo mv otelcol-contrib /usr/local/bin/otelcol
sudo chmod +x /usr/local/bin/otelcol

# Verify installation
otelcol --version

# Create dedicated user for running the collector
sudo useradd -r -s /bin/false -M -d /var/lib/otelcol otelcol

# Create required directories
sudo mkdir -p /etc/otelcol
sudo mkdir -p /var/lib/otelcol
sudo mkdir -p /var/log/otelcol

# Set ownership
sudo chown -R otelcol:otelcol /var/lib/otelcol
sudo chown -R otelcol:otelcol /var/log/otelcol
```

The collector binary is now installed and ready for configuration.

## Creating the Collector Configuration

Create a production-ready configuration file:

```yaml
# /etc/otelcol/config.yaml
# OpenTelemetry Collector configuration for systemd deployment

receivers:
  # OTLP receiver for application telemetry
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

  # Host metrics receiver for system monitoring
  hostmetrics:
    collection_interval: 30s
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
        metrics:
          system.disk.io:
            enabled: true
      network:
        metrics:
          system.network.io:
            enabled: true
      filesystem:
        metrics:
          system.filesystem.utilization:
            enabled: true
      load:
        metrics:
          system.cpu.load_average.1m:
            enabled: true
      processes:
      paging:

  # Prometheus receiver for scraping metrics
  prometheus:
    config:
      scrape_configs:
        # Scrape collector's own metrics
        - job_name: 'otel-collector'
          scrape_interval: 30s
          static_configs:
            - targets: ['localhost:8888']

        # Scrape node_exporter if available
        - job_name: 'node'
          scrape_interval: 30s
          static_configs:
            - targets: ['localhost:9100']

  # File log receiver for reading log files
  filelog:
    include:
      - /var/log/syslog
      - /var/log/auth.log
      - /var/log/application/*.log
    exclude:
      - /var/log/otelcol/*.log
    operators:
      # Parse timestamp from log lines
      - type: regex_parser
        regex: '^(?P<timestamp>\w+\s+\d+\s+\d+:\d+:\d+)\s+(?P<host>\S+)\s+(?P<process>\S+)\[(?P<pid>\d+)\]:\s+(?P<message>.*)$'
        timestamp:
          parse_from: attributes.timestamp
          layout: '%b %d %H:%M:%S'

processors:
  # Memory limiter to prevent OOM
  memory_limiter:
    check_interval: 1s
    limit_percentage: 80
    spike_limit_percentage: 25

  # Batch processor for efficient export
  batch:
    timeout: 10s
    send_batch_size: 8192
    send_batch_max_size: 16384

  # Add resource attributes
  resource:
    attributes:
      - key: deployment.environment
        value: production
        action: insert
      - key: host.name
        value: ${HOST_NAME}
        action: insert
      - key: host.id
        value: ${HOST_ID}
        action: insert
      - key: collector.deployment
        value: systemd
        action: insert

  # Detect system resource attributes
  resourcedetection:
    detectors: [env, system]
    timeout: 5s
    system:
      hostname_sources: ["os"]
      resource_attributes:
        host.name:
          enabled: true
        host.id:
          enabled: true
        os.type:
          enabled: true

  # Filter out noisy metrics
  filter/metrics:
    metrics:
      exclude:
        match_type: regexp
        metric_names:
          - "^scrape_.*"
          - "^up$"

  # Transform attribute names
  attributes:
    actions:
      - key: http.method
        action: update
        value: ${http.request.method}
      - key: http.status_code
        action: update
        value: ${http.response.status_code}

exporters:
  # Export to Prometheus Remote Write
  prometheusremotewrite:
    endpoint: https://prometheus.example.com/api/v1/write
    headers:
      Authorization: Bearer ${PROM_BEARER_TOKEN}
    tls:
      insecure: false
      ca_file: /etc/ssl/certs/ca-bundle.crt
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 5000

  # Export traces via OTLP
  otlp:
    endpoint: jaeger.example.com:4317
    tls:
      insecure: false
      ca_file: /etc/ssl/certs/ca-bundle.crt
    retry_on_failure:
      enabled: true

  # Export logs to Loki
  loki:
    endpoint: https://loki.example.com/loki/api/v1/push
    tls:
      insecure: false
      ca_file: /etc/ssl/certs/ca-bundle.crt
    headers:
      X-Scope-OrgID: "default"

  # File exporter for local persistence
  file:
    path: /var/lib/otelcol/telemetry.json
    rotation:
      max_megabytes: 100
      max_days: 7
      max_backups: 10

  # Logging exporter for debugging
  logging:
    verbosity: normal
    sampling_initial: 5
    sampling_thereafter: 200

extensions:
  # Health check extension
  health_check:
    endpoint: 0.0.0.0:13133
    path: /health

  # Performance profiler
  pprof:
    endpoint: localhost:1777

  # Memory ballast for stable memory usage
  memory_ballast:
    size_mib: 128

  # File storage for persistent queues
  file_storage:
    directory: /var/lib/otelcol/storage
    timeout: 10s
    compaction:
      on_start: true
      on_rebound: true
      directory: /var/lib/otelcol/storage

service:
  extensions: [health_check, pprof, memory_ballast, file_storage]

  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, resourcedetection, resource, attributes, batch]
      exporters: [otlp, file, logging]

    metrics:
      receivers: [otlp, hostmetrics, prometheus]
      processors: [memory_limiter, filter/metrics, resourcedetection, resource, batch]
      exporters: [prometheusremotewrite, file, logging]

    logs:
      receivers: [otlp, filelog]
      processors: [memory_limiter, resourcedetection, resource, batch]
      exporters: [loki, file, logging]

  telemetry:
    logs:
      level: info
      development: false
      encoding: json
      output_paths:
        - /var/log/otelcol/collector.log
        - stdout
      error_output_paths:
        - /var/log/otelcol/error.log
        - stderr
    metrics:
      level: detailed
      address: 0.0.0.0:8888
```

Set proper permissions:

```bash
# Secure the configuration file
sudo chmod 640 /etc/otelcol/config.yaml
sudo chown root:otelcol /etc/otelcol/config.yaml

# Validate configuration
sudo -u otelcol otelcol validate --config /etc/otelcol/config.yaml
```

## Creating the Systemd Service Unit

Create a systemd service unit file:

```ini
# /etc/systemd/system/otelcol.service
# Systemd service unit for OpenTelemetry Collector

[Unit]
Description=OpenTelemetry Collector
Documentation=https://opentelemetry.io/docs/collector/
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=otelcol
Group=otelcol

# Restart policy
Restart=on-failure
RestartSec=5s
StartLimitBurst=3
StartLimitIntervalSec=60s

# Environment variables
Environment="HOST_NAME=%H"
Environment="HOST_ID=%m"
EnvironmentFile=-/etc/default/otelcol

# Execute collector
ExecStart=/usr/local/bin/otelcol \
    --config=/etc/otelcol/config.yaml

# Working directory
WorkingDirectory=/var/lib/otelcol

# Standard output and error logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=otelcol

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/otelcol /var/log/otelcol

# Resource limits
LimitNOFILE=65536
LimitNPROC=512

# Memory accounting
MemoryAccounting=true
MemoryMax=2G
MemoryHigh=1.5G

# CPU accounting
CPUAccounting=true
CPUQuota=200%

# Task accounting
TasksAccounting=true
TasksMax=256

# Capabilities (required for host metrics)
AmbientCapabilities=CAP_SYS_PTRACE CAP_DAC_READ_SEARCH
CapabilityBoundingSet=CAP_SYS_PTRACE CAP_DAC_READ_SEARCH

# Network restrictions (optional, adjust as needed)
# RestrictAddressFamilies=AF_INET AF_INET6

[Install]
WantedBy=multi-user.target
```

Create an environment file for secrets:

```bash
# /etc/default/otelcol
# Environment variables for OpenTelemetry Collector
# This file should contain sensitive values

PROM_BEARER_TOKEN=your-token-here
```

Secure the environment file:

```bash
sudo chmod 600 /etc/default/otelcol
sudo chown root:root /etc/default/otelcol
```

## Managing the Service

Enable and start the collector service:

```bash
# Reload systemd to read the new service file
sudo systemctl daemon-reload

# Enable the service to start on boot
sudo systemctl enable otelcol

# Start the service
sudo systemctl start otelcol

# Check service status
sudo systemctl status otelcol

# View real-time logs
sudo journalctl -u otelcol -f

# View logs with timestamps
sudo journalctl -u otelcol --since "10 minutes ago"

# Stop the service
sudo systemctl stop otelcol

# Restart the service
sudo systemctl restart otelcol

# Reload configuration without restart (if supported)
sudo systemctl reload otelcol
```

## Implementing Service Monitoring

Create a monitoring script to check collector health:

```bash
#!/bin/bash
# /usr/local/bin/check-otelcol-health.sh
# Health check script for OpenTelemetry Collector

set -e

HEALTH_ENDPOINT="http://localhost:13133/health"
TIMEOUT=5

# Check if collector is responding
if curl -s -f -m "$TIMEOUT" "$HEALTH_ENDPOINT" > /dev/null; then
    echo "OK: Collector is healthy"
    exit 0
else
    echo "CRITICAL: Collector health check failed"
    exit 2
fi
```

Make it executable:

```bash
sudo chmod +x /usr/local/bin/check-otelcol-health.sh
```

Create a systemd timer for periodic health checks:

```ini
# /etc/systemd/system/otelcol-health.service
[Unit]
Description=OpenTelemetry Collector Health Check

[Service]
Type=oneshot
ExecStart=/usr/local/bin/check-otelcol-health.sh
StandardOutput=journal
```

```ini
# /etc/systemd/system/otelcol-health.timer
[Unit]
Description=OpenTelemetry Collector Health Check Timer

[Timer]
OnBootSec=5min
OnUnitActiveSec=5min

[Install]
WantedBy=timers.target
```

Enable the timer:

```bash
sudo systemctl daemon-reload
sudo systemctl enable otelcol-health.timer
sudo systemctl start otelcol-health.timer
```

## Log Rotation Configuration

Configure log rotation for collector logs:

```bash
# /etc/logrotate.d/otelcol
/var/log/otelcol/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0640 otelcol otelcol
    sharedscripts
    postrotate
        systemctl reload otelcol > /dev/null 2>&1 || true
    endscript
}
```

## Resource Management with Systemd

Fine-tune resource limits for the collector:

```ini
# Add to /etc/systemd/system/otelcol.service under [Service]

# CPU limits
CPUQuota=200%
CPUWeight=100

# Memory limits
MemoryMax=2G
MemoryHigh=1.5G
MemorySwapMax=0

# I/O limits
IOWeight=100
IOReadBandwidthMax=/dev/sda 50M
IOWriteBandwidthMax=/dev/sda 50M

# Network limits (requires systemd v245+)
# IPAddressAllow=10.0.0.0/8 192.168.0.0/16
# IPAddressDeny=any

# File descriptor limits
LimitNOFILE=65536

# Process limits
LimitNPROC=512
TasksMax=256
```

Apply changes:

```bash
sudo systemctl daemon-reload
sudo systemctl restart otelcol
```

## Implementing Configuration Validation

Create a pre-start validation script:

```bash
#!/bin/bash
# /usr/local/bin/validate-otelcol-config.sh
# Validate collector configuration before starting

CONFIG_FILE="/etc/otelcol/config.yaml"

echo "Validating OpenTelemetry Collector configuration..."

if ! /usr/local/bin/otelcol validate --config "$CONFIG_FILE"; then
    echo "ERROR: Configuration validation failed"
    exit 1
fi

echo "Configuration is valid"
exit 0
```

Update the service unit to include validation:

```ini
# Add to /etc/systemd/system/otelcol.service under [Service]
ExecStartPre=/usr/local/bin/validate-otelcol-config.sh
```

## Implementing Graceful Shutdown

Configure graceful shutdown behavior:

```ini
# Add to /etc/systemd/system/otelcol.service under [Service]

# Send SIGTERM for graceful shutdown
KillMode=mixed
KillSignal=SIGTERM

# Wait up to 30 seconds before sending SIGKILL
TimeoutStopSec=30s

# Ensure all child processes are terminated
SendSIGKILL=yes
```

## Multi-Instance Deployment

Deploy multiple collector instances on the same host:

```bash
# Create instance-specific configurations
sudo cp /etc/otelcol/config.yaml /etc/otelcol/config-gateway.yaml
sudo cp /etc/otelcol/config.yaml /etc/otelcol/config-agent.yaml

# Modify ports in each configuration to avoid conflicts
# config-gateway.yaml: 4317, 4318
# config-agent.yaml: 4327, 4328

# Create instance-specific service files
sudo cp /etc/systemd/system/otelcol.service /etc/systemd/system/otelcol@.service
```

Update the template service:

```ini
# /etc/systemd/system/otelcol@.service
[Unit]
Description=OpenTelemetry Collector (%i)
After=network-online.target

[Service]
Type=simple
User=otelcol
Group=otelcol
ExecStart=/usr/local/bin/otelcol --config=/etc/otelcol/config-%i.yaml
WorkingDirectory=/var/lib/otelcol/%i
ReadWritePaths=/var/lib/otelcol/%i /var/log/otelcol/%i

[Install]
WantedBy=multi-user.target
```

Create instance directories:

```bash
sudo mkdir -p /var/lib/otelcol/gateway
sudo mkdir -p /var/lib/otelcol/agent
sudo mkdir -p /var/log/otelcol/gateway
sudo mkdir -p /var/log/otelcol/agent
sudo chown -R otelcol:otelcol /var/lib/otelcol /var/log/otelcol
```

Start instances:

```bash
sudo systemctl enable otelcol@gateway
sudo systemctl enable otelcol@agent
sudo systemctl start otelcol@gateway
sudo systemctl start otelcol@agent
```

## Upgrading the Collector

Perform safe upgrades with minimal downtime:

```bash
#!/bin/bash
# upgrade-otelcol.sh
# Script to safely upgrade OpenTelemetry Collector

set -e

NEW_VERSION="0.94.0"
ARCH="amd64"
BACKUP_DIR="/var/backups/otelcol"

echo "Upgrading OpenTelemetry Collector to version $NEW_VERSION"

# Create backup directory
sudo mkdir -p "$BACKUP_DIR"

# Backup current binary
sudo cp /usr/local/bin/otelcol "$BACKUP_DIR/otelcol-$(date +%Y%m%d-%H%M%S)"

# Backup configuration
sudo cp /etc/otelcol/config.yaml "$BACKUP_DIR/config-$(date +%Y%m%d-%H%M%S).yaml"

# Download new version
cd /tmp
curl -LO "https://github.com/open-telemetry/opentelemetry-collector-releases/releases/download/v${NEW_VERSION}/otelcol-contrib_${NEW_VERSION}_linux_${ARCH}.tar.gz"

# Verify checksum
curl -LO "https://github.com/open-telemetry/opentelemetry-collector-releases/releases/download/v${NEW_VERSION}/otelcol-contrib_${NEW_VERSION}_linux_${ARCH}.tar.gz.sha256"
sha256sum -c "otelcol-contrib_${NEW_VERSION}_linux_${ARCH}.tar.gz.sha256"

# Extract new binary
tar -xzf "otelcol-contrib_${NEW_VERSION}_linux_${ARCH}.tar.gz"

# Validate configuration with new binary
if ! ./otelcol-contrib validate --config /etc/otelcol/config.yaml; then
    echo "ERROR: Configuration not compatible with new version"
    exit 1
fi

# Stop service
echo "Stopping collector service..."
sudo systemctl stop otelcol

# Install new binary
sudo mv otelcol-contrib /usr/local/bin/otelcol
sudo chmod +x /usr/local/bin/otelcol

# Start service
echo "Starting collector service..."
sudo systemctl start otelcol

# Verify service is running
sleep 5
if sudo systemctl is-active --quiet otelcol; then
    echo "Upgrade successful!"
    otelcol --version
else
    echo "ERROR: Service failed to start. Rolling back..."
    sudo cp "$BACKUP_DIR/otelcol-"* /usr/local/bin/otelcol
    sudo systemctl start otelcol
    exit 1
fi
```

## Troubleshooting

Common troubleshooting commands:

```bash
# Check service status
sudo systemctl status otelcol

# View recent logs
sudo journalctl -u otelcol -n 100

# View logs with errors only
sudo journalctl -u otelcol -p err

# Check resource usage
systemd-cgtop -m

# View service dependencies
systemctl list-dependencies otelcol

# Check file descriptors
sudo ls -l /proc/$(systemctl show -p MainPID --value otelcol)/fd | wc -l

# Test collector connectivity
curl http://localhost:13133/health
curl http://localhost:8888/metrics

# Verify configuration
sudo -u otelcol otelcol validate --config /etc/otelcol/config.yaml

# Check port bindings
sudo ss -tulpn | grep otelcol

# View CPU and memory usage
systemctl show otelcol --property=CPUUsageNSec,MemoryCurrent

# Analyze service start time
systemd-analyze blame | grep otelcol
```

## Security Best Practices

Implement security hardening:

```ini
# /etc/systemd/system/otelcol.service
[Service]
# Run as non-root user
User=otelcol
Group=otelcol

# Prevent privilege escalation
NoNewPrivileges=true

# Filesystem isolation
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/otelcol /var/log/otelcol

# Kernel isolation
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectKernelLogs=true
ProtectControlGroups=true

# Network isolation (adjust as needed)
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX

# Namespace isolation
PrivateDevices=true
ProtectHostname=true

# System call filtering
SystemCallArchitectures=native
SystemCallFilter=@system-service
SystemCallFilter=~@privileged @resources
```

## Integration with Service Mesh

Configure collector for Istio/Envoy environments:

```yaml
# Add to /etc/otelcol/config.yaml
receivers:
  zipkin:
    endpoint: 0.0.0.0:9411

exporters:
  zipkin:
    endpoint: http://zipkin.istio-system.svc.cluster.local:9411

service:
  pipelines:
    traces:
      receivers: [zipkin, otlp]
      processors: [batch]
      exporters: [zipkin]
```

## Related Resources

For other deployment options, see:

- [How to Deploy the OpenTelemetry Collector on Docker and Docker Compose](https://oneuptime.com/blog/post/deploy-opentelemetry-collector-docker-compose/view)
- [How to Deploy the OpenTelemetry Collector on AWS ECS Fargate](https://oneuptime.com/blog/post/deploy-opentelemetry-collector-aws-ecs-fargate/view)
- [How to Set Up a Two-Tier Collector Architecture (Agent + Gateway)](https://oneuptime.com/blog/post/two-tier-collector-architecture-agent-gateway/view)

Deploying OpenTelemetry Collectors as systemd services provides robust process management, resource control, and seamless integration with Linux systems. This approach is ideal for traditional infrastructure, edge deployments, and environments requiring fine-grained system-level control.
