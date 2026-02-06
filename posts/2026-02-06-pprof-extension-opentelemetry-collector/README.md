# How to Configure the pprof Extension in the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Extensions, pprof, Performance, Profiling, Debugging, Go, Optimization

Description: Master the pprof extension configuration in OpenTelemetry Collector to profile and debug performance issues with CPU, memory, and goroutine analysis.

The pprof extension exposes Go's powerful runtime profiling capabilities for the OpenTelemetry Collector. This extension is invaluable for diagnosing performance issues, memory leaks, and understanding the collector's runtime behavior. By enabling pprof, you gain access to detailed CPU profiles, heap snapshots, goroutine traces, and other diagnostic information that can help optimize your collector deployment.

## Understanding the pprof Extension

pprof is a profiling tool built into the Go runtime that provides detailed insights into program execution. The OpenTelemetry Collector, written in Go, includes the pprof extension to expose these profiling endpoints via HTTP. These endpoints can be consumed by various tools including the Go pprof command-line tool, web browsers, and observability platforms.

The extension provides access to:

- **CPU Profiling**: Understand where CPU time is being spent
- **Heap Profiling**: Analyze memory allocations and identify leaks
- **Goroutine Profiling**: Debug concurrency issues and goroutine leaks
- **Block Profiling**: Identify blocking operations in your code
- **Mutex Profiling**: Detect contention on mutexes

## Architecture Overview

Here's how pprof fits into collector diagnostics:

```mermaid
graph LR
    A[OTel Collector] --> B[pprof Extension]
    B --> C[HTTP Endpoints]
    C --> D[/debug/pprof/profile]
    C --> E[/debug/pprof/heap]
    C --> F[/debug/pprof/goroutine]
    C --> G[/debug/pprof/block]

    H[Developer] --> I[go tool pprof]
    I --> C
    J[Browser] --> C
    K[Monitoring Tools] --> C

    style B fill:#90EE90
    style C fill:#FFD700
```

## Prerequisites

Before configuring the pprof extension:

1. OpenTelemetry Collector installed (any distribution)
2. Go toolchain installed for analysis (optional but recommended)
3. Understanding of your performance issue or diagnostic needs
4. Network access to the pprof port
5. Basic familiarity with profiling concepts

## Basic Configuration

Here's a minimal pprof extension configuration:

```yaml
# Basic pprof extension configuration
extensions:
  pprof:
    # Endpoint for pprof HTTP server
    # Default is localhost:1777
    endpoint: localhost:1777

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s
    send_batch_size: 1024

exporters:
  logging:
    loglevel: info

# Enable the extension in the service section
service:
  extensions: [pprof]

  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [logging]
```

With this configuration, pprof endpoints are available at:
- `http://localhost:1777/debug/pprof/` - Index page with all available profiles

## Production Configuration

For production environments, secure the pprof endpoint:

```yaml
extensions:
  pprof:
    # Bind to localhost only for security
    # Only allow access through kubectl port-forward or SSH tunnel
    endpoint: 127.0.0.1:1777

    # Configure block profile rate (nanoseconds)
    # Higher values = less overhead but less detail
    block_profile_fraction: 0

    # Configure mutex profile rate
    # 0 = disabled, 1 = all events, higher = sampling
    mutex_profile_fraction: 0

    # Save profiles to disk periodically (optional)
    save_to_file:
      enabled: false
      directory: /var/log/otelcol/profiles

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s
    send_batch_size: 1024

  memory_limiter:
    check_interval: 1s
    limit_mib: 2048
    spike_limit_mib: 512

exporters:
  otlp:
    endpoint: backend.example.com:4317

service:
  extensions: [pprof]

  telemetry:
    logs:
      level: info
    metrics:
      level: detailed

  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp]
```

## Advanced Configuration with Multiple Extensions

Combine pprof with other diagnostic extensions:

```yaml
extensions:
  # pprof for Go runtime profiling
  pprof:
    endpoint: 127.0.0.1:1777
    block_profile_fraction: 5
    mutex_profile_fraction: 5

  # Health check for operational status
  health_check:
    endpoint: 0.0.0.0:13133

  # zpages for pipeline diagnostics
  zpages:
    endpoint: 127.0.0.1:55679

  # Prometheus metrics for monitoring
  prometheus:
    endpoint: 0.0.0.0:8888

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

  # Host metrics for system monitoring
  hostmetrics:
    collection_interval: 30s
    scrapers:
      cpu:
      memory:
      disk:
      network:

processors:
  batch:
    timeout: 10s
    send_batch_size: 2048

  memory_limiter:
    check_interval: 1s
    limit_mib: 4096
    spike_limit_mib: 1024

exporters:
  otlp:
    endpoint: backend.example.com:4317
    tls:
      insecure: false

service:
  # Enable all diagnostic extensions
  extensions: [pprof, health_check, zpages, prometheus]

  telemetry:
    logs:
      level: info
    metrics:
      level: detailed
      address: 0.0.0.0:8888

  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp]

    metrics:
      receivers: [otlp, hostmetrics]
      processors: [memory_limiter, batch]
      exporters: [otlp]
```

## Kubernetes Deployment with pprof

Deploy the collector in Kubernetes with pprof enabled for troubleshooting:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
  namespace: observability
spec:
  replicas: 3
  selector:
    matchLabels:
      app: otel-collector
  template:
    metadata:
      labels:
        app: otel-collector
    spec:
      containers:
      - name: otel-collector
        image: otel/opentelemetry-collector-contrib:latest

        ports:
        - containerPort: 4317
          name: otlp-grpc
        - containerPort: 13133
          name: health-check
        - containerPort: 1777
          name: pprof

        # Resource limits to prevent runaway processes
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"

        volumeMounts:
        - name: config
          mountPath: /etc/otelcol

      volumes:
      - name: config
        configMap:
          name: otel-collector-config

---
# Service for pprof access (ClusterIP for security)
apiVersion: v1
kind: Service
metadata:
  name: otel-collector-pprof
  namespace: observability
spec:
  type: ClusterIP
  selector:
    app: otel-collector
  ports:
  - port: 1777
    targetPort: 1777
    name: pprof
```

Access pprof in Kubernetes:

```bash
# Port forward to access pprof locally
kubectl port-forward -n observability svc/otel-collector-pprof 1777:1777

# Now access pprof at http://localhost:1777/debug/pprof/
```

## Using pprof for CPU Profiling

Capture and analyze CPU profiles to identify performance bottlenecks:

```bash
# Capture a 30-second CPU profile
go tool pprof http://localhost:1777/debug/pprof/profile?seconds=30

# This opens an interactive pprof prompt
# Common commands:
# - top: Show top CPU consumers
# - list <function>: Show source code with annotations
# - web: Generate a graph visualization (requires graphviz)
# - pdf: Generate a PDF report
```

Example CPU profiling workflow:

```bash
# Capture profile to a file
curl http://localhost:1777/debug/pprof/profile?seconds=30 > cpu.prof

# Analyze with pprof
go tool pprof cpu.prof

# In pprof interactive mode:
(pprof) top10
Showing nodes accounting for 1.20s, 85.71% of 1.40s total
Dropped 50 nodes (cum <= 0.01s)
      flat  flat%   sum%        cum   cum%
     0.35s 25.00% 25.00%      0.45s 32.14%  runtime.scanobject
     0.20s 14.29% 39.29%      0.20s 14.29%  runtime.heapBitsSetType
     0.15s 10.71% 50.00%      0.25s 17.86%  batch.(*Processor).ProcessTraces

(pprof) list batch.ProcessTraces
Total: 1.40s
ROUTINE ======================== batch.(*Processor).ProcessTraces
     0.15s      0.25s (flat, cum) 17.86% of Total
         .          .     45:func (bp *Processor) ProcessTraces(ctx context.Context, td ptrace.Traces) error {
         .          .     46:    bp.mu.Lock()
     0.05s      0.05s     47:    defer bp.mu.Unlock()
         .          .     48:
     0.10s      0.20s     49:    bp.spans = append(bp.spans, td...)
         .          .     50:    return nil
         .          .     51:}

# Generate a visualization
(pprof) web
```

## Using pprof for Memory Profiling

Diagnose memory leaks and understand memory allocation patterns:

```bash
# Capture heap profile
go tool pprof http://localhost:1777/debug/pprof/heap

# Or save to file
curl http://localhost:1777/debug/pprof/heap > heap.prof
go tool pprof heap.prof

# Analyze allocations
(pprof) top10
Showing nodes accounting for 512MB, 85.33% of 600MB total
      flat  flat%   sum%        cum   cum%
     128MB 21.33% 21.33%      128MB 21.33%  batch.(*Processor).buffer
      96MB 16.00% 37.33%       96MB 16.00%  exporters.(*OTLPExporter).queue
      80MB 13.33% 50.67%       80MB 13.33%  processors.(*ResourceProcessor).cache

# Show specific function allocations
(pprof) list batch.buffer

# Compare two heap profiles to find leaks
go tool pprof -base heap1.prof heap2.prof
```

Compare memory profiles over time to detect leaks:

```bash
# Capture initial heap profile
curl http://localhost:1777/debug/pprof/heap > heap-before.prof

# Wait and capture another profile
sleep 300
curl http://localhost:1777/debug/pprof/heap > heap-after.prof

# Compare to see what increased
go tool pprof -base heap-before.prof heap-after.prof

# This shows allocations that grew between the two captures
(pprof) top
# Only shows differences, making leaks obvious
```

## Using pprof for Goroutine Analysis

Debug goroutine leaks and concurrency issues:

```bash
# View goroutine dump in browser
open http://localhost:1777/debug/pprof/goroutine

# Capture goroutine profile
curl http://localhost:1777/debug/pprof/goroutine > goroutine.prof
go tool pprof goroutine.prof

# Analyze goroutines
(pprof) top
Showing nodes accounting for 1024 goroutines, 100% of 1024 total
      flat  flat%   sum%        cum   cum%
       512 50.00% 50.00%        512 50.00%  runtime.gopark
       256 25.00% 75.00%        256 25.00%  batch.(*Processor).worker
       128 12.50% 87.50%        128 12.50%  exporters.(*OTLPExporter).send

# Get detailed goroutine traces
curl http://localhost:1777/debug/pprof/goroutine?debug=2 > goroutines.txt

# View the text file to see all goroutine stack traces
less goroutines.txt
```

Example goroutine leak detection:

```bash
# Monitor goroutine count over time
watch -n 5 'curl -s http://localhost:1777/debug/pprof/goroutine?debug=1 | grep "goroutine profile:" '

# Output shows goroutine count increasing if there's a leak:
# goroutine profile: total 1024
# goroutine profile: total 1536
# goroutine profile: total 2048
# goroutine profile: total 2560  <- Growing! Leak detected
```

## Using pprof for Block Profiling

Identify blocking operations and synchronization issues:

```yaml
extensions:
  pprof:
    endpoint: 127.0.0.1:1777

    # Enable block profiling
    # Value is the fraction of blocking events to record
    # 1 = record all blocking events (high overhead)
    # Higher values = less overhead but less detail
    block_profile_fraction: 5
```

Analyze block profile:

```bash
# Capture block profile
curl http://localhost:1777/debug/pprof/block > block.prof
go tool pprof block.prof

# Find blocking operations
(pprof) top
Showing nodes accounting for 5.2s, 86.67% of 6.0s total
      flat  flat%   sum%        cum   cum%
     2.1s 35.00% 35.00%      2.1s 35.00%  sync.(*Mutex).Lock
     1.5s 25.00% 60.00%      1.5s 25.00%  chan send
     0.9s 15.00% 75.00%      0.9s 15.00%  batch.(*Processor).flush

# These show where goroutines are blocked waiting
```

## Using pprof for Mutex Profiling

Detect mutex contention issues:

```yaml
extensions:
  pprof:
    endpoint: 127.0.0.1:1777

    # Enable mutex profiling
    # 0 = disabled
    # 1 = all mutex events (high overhead)
    # Higher = sampling rate
    mutex_profile_fraction: 5
```

Analyze mutex contention:

```bash
# Capture mutex profile
curl http://localhost:1777/debug/pprof/mutex > mutex.prof
go tool pprof mutex.prof

# Find contended mutexes
(pprof) top
Showing nodes accounting for 3.4s, 85.00% of 4.0s total
      flat  flat%   sum%        cum   cum%
     1.8s 45.00% 45.00%      1.8s 45.00%  batch.(*Processor).mu
     0.9s 22.50% 67.50%      0.9s 22.50%  exporters.(*OTLPExporter).queueLock
     0.7s 17.50% 85.00%      0.7s 17.50%  processors.(*ResourceProcessor).cacheLock
```

## Continuous Profiling Setup

Set up continuous profiling for ongoing monitoring:

```yaml
extensions:
  pprof:
    endpoint: 127.0.0.1:1777
    block_profile_fraction: 5
    mutex_profile_fraction: 5

    # Periodically save profiles to disk
    save_to_file:
      enabled: true
      directory: /var/log/otelcol/profiles
      interval: 5m

      # Which profiles to save
      profiles:
        - cpu
        - heap
        - goroutine
        - block
        - mutex

      # Retention policy
      max_age: 24h
      max_files: 288  # 24h * 12 per hour
```

Create a script to automatically collect and upload profiles:

```bash
#!/bin/bash
# collect-profiles.sh - Automatically collect pprof profiles

PPROF_ENDPOINT="http://localhost:1777"
OUTPUT_DIR="/var/log/otelcol/profiles"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

mkdir -p "$OUTPUT_DIR"

# Collect CPU profile (30 seconds)
curl -s "$PPROF_ENDPOINT/debug/pprof/profile?seconds=30" \
  > "$OUTPUT_DIR/cpu-${TIMESTAMP}.prof"

# Collect heap profile
curl -s "$PPROF_ENDPOINT/debug/pprof/heap" \
  > "$OUTPUT_DIR/heap-${TIMESTAMP}.prof"

# Collect goroutine profile
curl -s "$PPROF_ENDPOINT/debug/pprof/goroutine" \
  > "$OUTPUT_DIR/goroutine-${TIMESTAMP}.prof"

# Collect block profile
curl -s "$PPROF_ENDPOINT/debug/pprof/block" \
  > "$OUTPUT_DIR/block-${TIMESTAMP}.prof"

# Collect mutex profile
curl -s "$PPROF_ENDPOINT/debug/pprof/mutex" \
  > "$OUTPUT_DIR/mutex-${TIMESTAMP}.prof"

# Optional: Upload to storage or observability platform
# aws s3 cp "$OUTPUT_DIR/" s3://my-bucket/otel-profiles/ --recursive

# Cleanup old profiles (keep last 24 hours)
find "$OUTPUT_DIR" -name "*.prof" -mtime +1 -delete

echo "Profiles collected at ${TIMESTAMP}"
```

## Visualizing Profiles

Generate visual reports from pprof data:

```bash
# Generate flame graph
go tool pprof -http=:8080 http://localhost:1777/debug/pprof/profile?seconds=30

# This opens a web browser with interactive visualizations including:
# - Flame graph
# - Top functions
# - Call graph
# - Source code view

# Generate PDF report
go tool pprof -pdf http://localhost:1777/debug/pprof/profile?seconds=30 > cpu-profile.pdf

# Generate SVG
go tool pprof -svg http://localhost:1777/debug/pprof/heap > heap-profile.svg
```

## Security Best Practices

Secure your pprof endpoint in production:

1. **Bind to Localhost**: Only expose pprof on localhost and access via port-forwarding or SSH tunnel.

2. **Use Network Policies**: In Kubernetes, restrict access using NetworkPolicies.

3. **Authentication**: Place pprof behind an authenticating reverse proxy.

4. **Monitoring**: Monitor access to pprof endpoints.

5. **Disable in Production**: Consider disabling pprof entirely in production unless actively debugging.

Example Kubernetes NetworkPolicy:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: otel-collector-pprof
  namespace: observability
spec:
  podSelector:
    matchLabels:
      app: otel-collector
  policyTypes:
  - Ingress
  ingress:
  # Only allow pprof access from debug pods
  - from:
    - podSelector:
        matchLabels:
          role: debug
    ports:
    - protocol: TCP
      port: 1777
```

## Troubleshooting with pprof

Common scenarios and how to use pprof:

**High CPU Usage**: Capture CPU profile during high load period and identify hot paths.

**Memory Leak**: Compare heap profiles over time to find growing allocations.

**Goroutine Leak**: Monitor goroutine count and analyze goroutine dumps to find leaks.

**Slow Performance**: Use block profiling to find where goroutines are waiting.

**High Lock Contention**: Enable mutex profiling to identify contended locks.

## Integration with Observability Platforms

Send pprof data to observability platforms:

```bash
# Pyroscope continuous profiling
# Configure collector to send profiles to Pyroscope
curl -X POST http://pyroscope-server:4040/ingest \
  -H "Content-Type: application/json" \
  -d @<(curl -s http://localhost:1777/debug/pprof/profile?seconds=30)

# Grafana Phlare
# Upload profile to Phlare
curl -X POST http://phlare-server:4100/ingest \
  --data-binary @<(curl -s http://localhost:1777/debug/pprof/profile?seconds=30)
```

## Best Practices

1. **Enable pprof Proactively**: Include pprof in your collector configuration from the start for easier troubleshooting.

2. **Secure the Endpoint**: Always bind to localhost in production environments.

3. **Profile During Peak Load**: Capture profiles during high-load periods to identify real bottlenecks.

4. **Baseline Profiles**: Collect baseline profiles during normal operation for comparison.

5. **Automate Collection**: Set up automated profile collection for continuous monitoring.

6. **Combine with Metrics**: Correlate pprof data with collector metrics for comprehensive analysis.

## Related Resources

Learn more about OpenTelemetry Collector performance and debugging:

- [OpenTelemetry Collector Performance Tuning](https://oneuptime.com/blog/post/opentelemetry-collector-performance/view)
- [Debugging OpenTelemetry Collector Issues](https://oneuptime.com/blog/post/debugging-otel-collector/view)

## Conclusion

The pprof extension is an essential tool for understanding and optimizing OpenTelemetry Collector performance. By providing direct access to Go runtime profiling capabilities, it enables deep diagnostics of CPU usage, memory allocation, goroutine behavior, and synchronization patterns. Whether you're debugging a production incident or optimizing collector performance, pprof gives you the insights needed to identify and resolve issues effectively. Enable it in your collector configuration and familiarize yourself with the various profiling modes to be prepared when performance issues arise.
