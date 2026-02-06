# How to Configure the OpAMP Supervisor to Manage Collector Lifecycle and Auto-Restart on Crash

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OpAMP, Supervisor, Process Management

Description: Configure the OpAMP supervisor to automatically manage your OpenTelemetry Collector lifecycle including auto-restart on crashes and graceful shutdowns.

The OpenTelemetry Collector is a long-running process, and like any long-running process, it can crash. Maybe it hits an out-of-memory condition, maybe a buggy processor causes a panic, or maybe the underlying host has a transient issue. Whatever the cause, you need your collector to come back up automatically. The OpAMP Supervisor handles exactly this.

## What the OpAMP Supervisor Does

The OpAMP Supervisor is a lightweight process that wraps your OpenTelemetry Collector. It sits between the OpAMP server and the collector, handling:

- Starting and stopping the collector process
- Restarting the collector when it crashes
- Applying configuration updates received from the OpAMP server
- Reporting the collector's health status back to the server
- Managing graceful shutdown sequences

Think of it as systemd specifically designed for OpenTelemetry Collectors, but with remote management capabilities built in.

## Installing the Supervisor

The supervisor is part of the opentelemetry-collector-contrib repository. Build it from source or grab a pre-built binary:

```bash
# Build from source
git clone https://github.com/open-telemetry/opentelemetry-collector-contrib.git
cd opentelemetry-collector-contrib/cmd/opampsupervisor
go build -o opamp-supervisor .

# Move to a standard location
sudo mv opamp-supervisor /usr/local/bin/
```

## Supervisor Configuration

Create the supervisor configuration file. This is where you define how the supervisor manages the collector:

```yaml
# /etc/opamp-supervisor/supervisor.yaml

server:
  # OpAMP server endpoint (use wss:// for production)
  endpoint: ws://opamp-server.internal:4320/v1/opamp

agent:
  # Path to the collector binary
  executable: /usr/local/bin/otelcol-contrib
  # Directory for storing runtime data
  storage_dir: /var/lib/opamp-supervisor

capabilities:
  # Report the running config back to the server
  reports_effective_config: true
  # Report health status
  reports_health: true
  # Accept config pushed from the server
  accepts_remote_config: true
  # Report the collector's own resource usage
  reports_own_metrics: true
  # Accept package (binary) updates
  accepts_packages: true
  # Allow restart commands from the server
  accepts_restart_command: true
```

## Configuring Auto-Restart Behavior

The supervisor automatically restarts the collector when it exits unexpectedly. You can tune this behavior through additional configuration:

```yaml
# /etc/opamp-supervisor/supervisor.yaml

server:
  endpoint: ws://opamp-server.internal:4320/v1/opamp

agent:
  executable: /usr/local/bin/otelcol-contrib
  storage_dir: /var/lib/opamp-supervisor
  # Provide a base collector config for initial startup
  # before the server pushes a remote config
  bootstrap_config_file: /etc/otelcol/bootstrap-config.yaml

# Health check settings
health_check:
  # The collector's health check endpoint
  endpoint: http://localhost:13133
  # How often to poll health
  interval: 15s
```

The bootstrap configuration is important. It gives the collector something to run with on first start, before the OpAMP server has pushed a remote configuration:

```yaml
# /etc/otelcol/bootstrap-config.yaml
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
  logging:
    loglevel: info

extensions:
  health_check:
    endpoint: 0.0.0.0:13133

service:
  extensions: [health_check]
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [logging]
```

## Running the Supervisor as a Systemd Service

For production deployments, run the supervisor itself under systemd. Create a unit file:

```ini
# /etc/systemd/system/opamp-supervisor.service
[Unit]
Description=OpAMP Supervisor for OpenTelemetry Collector
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/local/bin/opamp-supervisor --config /etc/opamp-supervisor/supervisor.yaml
Restart=always
RestartSec=5
User=otel
Group=otel
# Give the supervisor time to gracefully stop the collector
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable opamp-supervisor
sudo systemctl start opamp-supervisor
```

Now you have two layers of restart protection. Systemd restarts the supervisor if it crashes, and the supervisor restarts the collector if it crashes.

## Observing Restart Behavior

When the collector crashes, the supervisor logs the event and initiates a restart:

```
2026-02-06T10:15:32Z INFO Agent process exited unexpectedly, exit code: 2
2026-02-06T10:15:32Z INFO Restarting agent process...
2026-02-06T10:15:33Z INFO Agent process started, PID: 48291
2026-02-06T10:15:35Z INFO Agent health check passed
2026-02-06T10:15:35Z INFO Reporting healthy status to OpAMP server
```

The supervisor also reports this restart event to the OpAMP server, so your central management plane knows that a collector went down and came back up. This is valuable for tracking the stability of your fleet over time.

## Handling Graceful Shutdowns

When the supervisor receives a SIGTERM (for example during a host reboot), it performs a graceful shutdown sequence:

1. Sends SIGTERM to the collector process
2. Waits for the collector to finish flushing its internal buffers
3. Reports the shutdown status to the OpAMP server
4. Exits cleanly

This ensures you do not lose telemetry data during planned maintenance windows. The collector's internal batch processor has time to flush pending data before the process terminates.

The combination of the OpAMP supervisor and systemd gives you a resilient setup where your collectors recover automatically from both process crashes and configuration issues, while keeping your central management server informed about every lifecycle event.
