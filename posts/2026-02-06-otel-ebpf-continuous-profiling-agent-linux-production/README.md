# How to Set Up the OpenTelemetry eBPF Continuous Profiling Agent

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, eBPF, Profiling, Linux

Description: Deploy the OpenTelemetry eBPF-based continuous profiling agent on Linux to capture CPU profiles from production workloads with minimal overhead.

Traditional profiling tools like `perf` or language-specific profilers are often used in development environments. They can generate massive amounts of data, require application restarts, or add significant overhead. The OpenTelemetry eBPF profiling agent takes a different approach: it uses eBPF to capture CPU stack traces from the kernel level with minimal impact on running applications. The project documents 1% CPU and 250 MB memory as upper limits in its testing, with the agent typically staying below those limits.

## How eBPF Profiling Works

eBPF (extended Berkeley Packet Filter) programs run inside the Linux kernel. The profiling agent loads an eBPF program that hooks into the kernel's perf subsystem and captures stack traces at a configurable sampling rate. Because the sampling happens in kernel space, it works across all processes and programming languages without requiring any changes to your applications.

The captured stack traces are then aggregated in user space and exported as OpenTelemetry profiles. The Profiles signal is still in development, so verify that your collector version and backend support profile data before enabling it in production.

## Prerequisites

Before installing the profiling agent, verify your system meets the requirements:

```bash
# Check kernel version (the current profiler checks for Linux 5.10+)

uname -r

# Verify eBPF support
ls /sys/kernel/btf/vmlinux
# If this file exists, your kernel has BTF support (recommended)

# Check that the BPF filesystem is mounted
mount | grep /sys/fs/bpf
```

## Installing the Profiling Agent

For production, use the OpenTelemetry Collector eBPF Profiling distribution. The standalone `ebpf-profiler` binary in the profiler repository is intended for development and debugging.

```bash
# Download a reviewed release
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64) ARCH="amd64" ;;
  aarch64) ARCH="arm64" ;;
esac
VERSION="0.153.0"

curl -L -o otelcol-ebpf-profiler.tar.gz \
  "https://github.com/open-telemetry/opentelemetry-collector-releases/releases/download/v${VERSION}/otelcol-ebpf-profiler_${VERSION}_linux_${ARCH}.tar.gz"

tar -xzf otelcol-ebpf-profiler.tar.gz
chmod +x otelcol-ebpf-profiler
sudo mv otelcol-ebpf-profiler /usr/local/bin/
```

## Basic Configuration and Startup

Create a minimal collector configuration:

```yaml
# /etc/otelcol-ebpf-profiler/config.yaml
receivers:
  profiling:
    samples_per_second: 20
    reporter_interval: 60s

exporters:
  otlp:
    endpoint: localhost:4317
    tls:
      insecure: true

service:
  pipelines:
    profiles:
      receivers: [profiling]
      exporters: [otlp]
```

Start the profiling collector:

```bash
sudo otelcol-ebpf-profiler \
  --feature-gates=+service.profilesSupport \
  --config /etc/otelcol-ebpf-profiler/config.yaml
```

Key parameters explained:

- `exporters.otlp.endpoint`: The OTLP gRPC endpoint where profiles are sent (typically an OTel Collector gateway or your profiling backend)
- `reporter_interval`: How often aggregated profiles are sent to the next pipeline stage
- `samples_per_second`: The sampling frequency (20 samples/second is the receiver default)

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
ExecStart=/usr/local/bin/otelcol-ebpf-profiler \
  --feature-gates=+service.profilesSupport \
  --config /etc/otelcol-ebpf-profiler/config.yaml
Restart=always
RestartSec=10
# The agent needs root for eBPF operations
User=root
# Security hardening
ProtectHome=true
NoNewPrivileges=false
CapabilityBoundingSet=CAP_SYS_ADMIN CAP_PERFMON CAP_BPF CAP_SYS_PTRACE

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

If you forward profiles to an OpenTelemetry Collector gateway, it needs profile support enabled. The OTLP receiver can receive profile data when the profiles feature gate is enabled:

```yaml
# collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

exporters:
  otlphttp:
    endpoint: https://profiling-backend.internal
    headers:
      Authorization: "Bearer ${BACKEND_TOKEN}"

service:
  pipelines:
    profiles:
      receivers: [otlp]
      exporters: [otlphttp]
```

Start that collector with:

```bash
otelcol --feature-gates=+service.profilesSupport --config collector-config.yaml
```

## Verifying the Agent is Working

Check that the agent is capturing profiles:

```bash
# View the profiling collector logs
sudo journalctl -u otel-profiling-agent -f

# Look for messages about the profiling receiver starting,
# plus any export errors to your OTLP endpoint.
```

You can also verify that the collector is receiving data:

```bash
# Check collector logs for incoming profile data
journalctl -u otelcol -f | grep -i profile
```

## Tuning for Production

### Sampling Rate

The default 20 samples per second provides good visibility with low overhead. Adjust based on your needs:

```yaml
# Lower overhead, less detail (good for very busy hosts)
receivers:
  profiling:
    samples_per_second: 10

# Higher detail for debugging (use temporarily)
receivers:
  profiling:
    samples_per_second: 50
```

### Runtime Selection

If you only care about specific runtimes, you can select interpreter tracers:

```yaml
receivers:
  profiling:
    tracers: "python,hotspot,go"
```

Resource Limits

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
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-profiling-agent-config
  namespace: monitoring
data:
  config.yaml: |
    receivers:
      profiling:
        samples_per_second: 20
        reporter_interval: 60s
    exporters:
      otlp:
        endpoint: otel-collector.monitoring.svc:4317
        tls:
          insecure: true
    service:
      pipelines:
        profiles:
          receivers: [profiling]
          exporters: [otlp]
---
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
          image: ghcr.io/open-telemetry/opentelemetry-collector-releases/opentelemetry-collector-ebpf-profiler:0.153.0
          args:
            - "--feature-gates=+service.profilesSupport"
            - "--config=/conf/config.yaml"
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
            - name: config
              mountPath: /conf
              readOnly: true
            - name: proc
              mountPath: /proc
              readOnly: true
            - name: sys
              mountPath: /sys
      volumes:
        - name: config
          configMap:
            name: otel-profiling-agent-config
        - name: proc
          hostPath:
            path: /proc
        - name: sys
          hostPath:
            path: /sys
```

The eBPF profiling agent gives you always-on production profiling without the traditional downsides. You see exactly where your applications spend CPU time, across all processes on the host, with overhead so low that you can run it 24/7 in production.
