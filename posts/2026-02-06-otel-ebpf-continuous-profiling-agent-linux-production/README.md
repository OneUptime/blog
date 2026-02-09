# How to Set Up the OpenTelemetry eBPF Continuous Profiling Agent on Linux for Production Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, eBPF, Profiling, Linux

Description: Deploy the OpenTelemetry eBPF-based continuous profiling agent on Linux to capture CPU profiles from production workloads with minimal overhead.

Traditional profiling tools like `perf` or language-specific profilers are designed for development environments. They generate massive amounts of data, require application restarts, or add significant overhead. The OpenTelemetry eBPF profiling agent takes a different approach: it uses eBPF to capture CPU stack traces from the kernel level with minimal impact on running applications, typically less than 1% CPU overhead.

## How eBPF Profiling Works

eBPF (extended Berkeley Packet Filter) programs run inside the Linux kernel. The profiling agent loads an eBPF program that hooks into the kernel's perf subsystem and captures stack traces at a configurable sampling rate. Because the sampling happens in kernel space, it works across all processes and programming languages without requiring any changes to your applications.

The captured stack traces are then aggregated in user space and exported as OpenTelemetry profiles, ready to be sent to any OTLP-compatible backend.

## Prerequisites

Before installing the profiling agent, verify your system meets the requirements:

```bash
# Check kernel version (needs 4.19+ for eBPF, 5.8+ recommended)
uname -r

# Verify eBPF support
ls /sys/kernel/btf/vmlinux
# If this file exists, your kernel has BTF support (recommended)

# Check that perf events are available
ls /proc/sys/kernel/perf_event_paranoid
# The value should be <= 2, or -1 for fully permissive

# If needed, allow perf events
sudo sysctl -w kernel.perf_event_paranoid=1
```

## Installing the Profiling Agent

The OpenTelemetry eBPF profiling agent is available as a standalone binary:

```bash
# Download the latest release
ARCH=$(uname -m)
VERSION="v0.12.0"

curl -L -o otel-profiling-agent \
  "https://github.com/open-telemetry/opentelemetry-ebpf-profiler/releases/download/${VERSION}/otel-profiling-agent-linux-${ARCH}"

chmod +x otel-profiling-agent
sudo mv otel-profiling-agent /usr/local/bin/
```

## Basic Configuration and Startup

Run the agent with minimal configuration:

```bash
# Start the profiling agent with default settings
sudo otel-profiling-agent \
  -collection-agent "localhost:4317" \
  -reporter-interval 60s \
  -samples-per-second 20
```

Key parameters explained:

- `-collection-agent`: The OTLP gRPC endpoint where profiles are sent (typically your OTel Collector)
- `-reporter-interval`: How often aggregated profiles are sent to the backend
- `-samples-per-second`: The sampling frequency (20 samples/second is a good production default)

## Running as a Systemd Service

For production, run the profiling agent as a system service:

```ini
# /etc/systemd/system/otel-profiling-agent.service
[Unit]
Description=OpenTelemetry eBPF Profiling Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/local/bin/otel-profiling-agent \
  -collection-agent localhost:4317 \
  -reporter-interval 60s \
  -samples-per-second 20 \
  -service-name my-application \
  -tags "environment=production,region=us-east-1"
Restart=always
RestartSec=10
# The agent needs root for eBPF operations
User=root
# Security hardening
ProtectHome=true
NoNewPrivileges=false
CapabilityBoundingSet=CAP_SYS_ADMIN CAP_PERFMON CAP_SYS_PTRACE

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable otel-profiling-agent
sudo systemctl start otel-profiling-agent

# Check that it is running
sudo systemctl status otel-profiling-agent
```

## Configuring the OTel Collector to Receive Profiles

Your OpenTelemetry Collector needs to accept profiling data. The OTLP receiver handles this:

```yaml
# collector-config.yaml
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
    send_batch_size: 256

exporters:
  otlphttp:
    endpoint: https://profiling-backend.internal
    headers:
      Authorization: "Bearer ${BACKEND_TOKEN}"

service:
  pipelines:
    profiles:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp]
```

## Verifying the Agent is Working

Check that the agent is capturing profiles:

```bash
# View the agent logs
sudo journalctl -u otel-profiling-agent -f

# You should see output like:
# Starting eBPF profiler...
# Loaded eBPF program successfully
# Captured 1542 stack traces from 48 processes
# Sent profile batch to localhost:4317 (1542 samples)
```

You can also verify that the collector is receiving data:

```bash
# Check collector logs for incoming profile data
journalctl -u otelcol -f | grep -i profile
```

## Tuning for Production

### Sampling Rate

The default 20 samples per second provides good visibility with low overhead. Adjust based on your needs:

```bash
# Lower overhead, less detail (good for very busy hosts)
-samples-per-second 10

# Higher detail for debugging (use temporarily)
-samples-per-second 50
```

### Process Filtering

If you only care about specific processes, you can filter:

```bash
# Only profile specific processes by name
sudo otel-profiling-agent \
  -collection-agent localhost:4317 \
  -reporter-interval 60s \
  -samples-per-second 20 \
  -process-filter "java|python|go"
```

### Resource Limits

Set resource limits to prevent the agent itself from consuming too many resources:

```ini
# In the systemd unit file
[Service]
# Limit memory usage to 512MB
MemoryMax=512M
# Limit CPU to 10%
CPUQuota=10%
```

## Kubernetes Deployment

For Kubernetes environments, deploy the profiling agent as a DaemonSet:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: otel-profiling-agent
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: otel-profiling-agent
  template:
    metadata:
      labels:
        app: otel-profiling-agent
    spec:
      hostPID: true
      containers:
        - name: profiling-agent
          image: ghcr.io/open-telemetry/opentelemetry-ebpf-profiler:v0.12.0
          args:
            - "-collection-agent"
            - "otel-collector.monitoring.svc:4317"
            - "-reporter-interval"
            - "60s"
            - "-samples-per-second"
            - "20"
          securityContext:
            privileged: true
          resources:
            requests:
              cpu: 50m
              memory: 128Mi
            limits:
              cpu: 200m
              memory: 512Mi
          volumeMounts:
            - name: proc
              mountPath: /proc
              readOnly: true
      volumes:
        - name: proc
          hostPath:
            path: /proc
```

The eBPF profiling agent gives you always-on production profiling without the traditional downsides. You see exactly where your applications spend CPU time, across all processes on the host, with overhead so low that you can run it 24/7 in production.
