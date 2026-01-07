# Using eBPF with OpenTelemetry: Zero-Code Auto-Instrumentation for Any Application

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: eBPF, OpenTelemetry, Observability, Tracing, Auto-Instrumentation, Kubernetes, Linux, Performance

Description: A practical guide to combining eBPF with OpenTelemetry for automatic, zero-code distributed tracing and observability. Learn how tools like Odigos, Beyla, and OpenTelemetry eBPF work, when to use them, and how to set them up in production.

---

> What if you could get full distributed tracing across all your services **without adding a single line of instrumentation code**?

Traditional OpenTelemetry instrumentation requires you to add SDKs, configure exporters, and wrap your code with spans. It's powerful but requires effort- especially when you have dozens of services in different languages.

[eBPF](https://oneuptime.com/blog/post/2025-12-10-what-is-ebpf-and-how-does-it-work/view) changes this equation entirely. By observing your applications from the Linux kernel, eBPF-based tools can automatically generate OpenTelemetry-compatible traces, metrics, and profiles- **without touching your application code**.

This post shows you how to combine eBPF with OpenTelemetry for powerful, zero-code observability.

---

## Table of Contents

1. The Problem: Instrumentation at Scale
2. How eBPF Enables Auto-Instrumentation
3. eBPF + OpenTelemetry Architecture
4. Tool Comparison: Odigos vs Beyla vs Pixie
5. Setting Up Beyla (Grafana's eBPF Auto-Instrumenter)
6. Setting Up Odigos for Kubernetes
7. What Gets Captured Automatically
8. Correlating eBPF Data with Manual Instrumentation
9. Performance Overhead
10. Limitations and When to Use Manual Instrumentation
11. Production Best Practices
12. Conclusion

---

## 1. The Problem: Instrumentation at Scale

Traditional [OpenTelemetry instrumentation](https://oneuptime.com/blog/post/2025-08-27-traces-and-spans-in-opentelemetry/view) follows a pattern:

1. Add the OTel SDK to each service
2. Configure exporters
3. Instrument entry points (HTTP handlers, gRPC methods)
4. Add spans for important operations
5. Propagate context across service boundaries
6. Repeat for every service, in every language

For a small team with a few services, this is manageable. But consider:

| Scenario | Challenge |
|----------|-----------|
| 50+ microservices | SDK integration across all services takes weeks |
| Polyglot stack | Different SDKs for Go, Python, Node.js, Java, Rust... |
| Legacy services | Can't easily modify code; no one wants to touch it |
| Third-party services | You don't have access to the source code |
| Rapid deployment | New services appear faster than you can instrument them |

**The result?** Observability gaps. Some services have traces, others don't. Context propagation breaks at the uninstrumented services. You're flying partially blind.

---

## 2. How eBPF Enables Auto-Instrumentation

eBPF solves this by observing applications **from outside the application itself**- at the kernel level.

### What eBPF Can See

Because eBPF hooks into kernel functions and system calls, it can observe:

| Layer | What eBPF Sees |
|-------|----------------|
| **Network** | Every TCP connection, HTTP request/response, DNS query |
| **System Calls** | File I/O, process creation, memory allocation |
| **User Functions** | Function entry/exit via uprobes (if symbols available) |
| **Language Runtimes** | Go, Node.js, Python, Java runtime internals |

### How This Becomes OpenTelemetry Data

eBPF-based auto-instrumenters work by:

1. **Attaching probes** to known entry points (HTTP libraries, gRPC handlers, database drivers)
2. **Extracting context** from requests (trace IDs from headers, request metadata)
3. **Measuring timing** using kernel timestamps
4. **Correlating** request/response pairs
5. **Exporting** as standard OpenTelemetry Protocol (OTLP) data

This diagram illustrates how eBPF-based auto-instrumentation works. The key insight is that eBPF programs run in the kernel, observing your application's behavior without any modifications to application code. The data is then converted to OTLP format and sent to your observability backend.

```mermaid
flowchart TB
    subgraph "Your Application (Unchanged)"
        APP[Go/Python/Node.js Service]
        HTTP[HTTP Handler]
        DB[Database Client]
    end

    subgraph "Linux Kernel"
        EBPF[eBPF Programs]
        KPROBE[Kprobes/Uprobes]
        SOCKET[Socket Tracing]
    end

    subgraph "eBPF Agent"
        AGENT[Auto-Instrumenter]
        CONVERT[OTLP Converter]
    end

    subgraph "Observability Backend"
        OTEL[OTel Collector]
        BACKEND[OneUptime / Jaeger / etc.]
    end

    APP --> HTTP
    HTTP --> DB

    KPROBE -.->|observes| HTTP
    SOCKET -.->|observes| DB
    EBPF --> AGENT
    AGENT --> CONVERT
    CONVERT -->|OTLP| OTEL
    OTEL --> BACKEND
```

---

## 3. eBPF + OpenTelemetry Architecture

A typical production setup looks like this:

### Components

| Component | Role |
|-----------|------|
| **eBPF Agent** | Runs on each node, attaches eBPF programs, generates telemetry |
| **OTel Collector** | Receives OTLP data, processes, and exports to backend |
| **Backend** | Stores and visualizes traces/metrics (OneUptime, Jaeger, Tempo) |

### Deployment Patterns

**Pattern 1: DaemonSet (Kubernetes)**

This DaemonSet configuration deploys the eBPF agent on every node in your cluster. The `hostPID` and `hostNetwork` settings are required because eBPF needs to observe processes across the entire node, not just within a single pod.

```yaml
# eBPF agent runs on every node to observe all pods
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: ebpf-auto-instrumenter
spec:
  selector:
    matchLabels:
      app: ebpf-agent
  template:
    spec:
      hostPID: true      # Required: access to host process namespace for eBPF
      hostNetwork: true  # Required: access to host network for tracing
      containers:
      - name: agent
        securityContext:
          privileged: true  # Required: eBPF needs elevated privileges
```

**Pattern 2: Sidecar (Per-Pod)**

The sidecar pattern offers more isolation but increases resource overhead. Each pod gets its own eBPF agent, which is useful when you need fine-grained control over which applications are instrumented.

```yaml
# eBPF agent as sidecar (more isolation, more overhead)
spec:
  containers:
  - name: my-app
    image: my-app:latest
  - name: ebpf-sidecar
    image: ebpf-agent:latest
    securityContext:
      privileged: true  # eBPF requires privileged access
```

**Pattern 3: Standalone (Non-Kubernetes)**

For non-Kubernetes environments, you can run the eBPF agent directly on the host. This is the simplest approach for VM-based or bare-metal deployments.

```bash
# Run directly on the host with root privileges
# The agent will observe all processes on this machine
sudo ./beyla --config config.yaml
```

---

## 4. Tool Comparison: Odigos vs Beyla vs Pixie

Several tools combine eBPF with OpenTelemetry. Here's how they compare:

### Grafana Beyla

| Aspect | Details |
|--------|---------|
| **Focus** | HTTP/gRPC auto-instrumentation |
| **Languages** | Go, Python, Node.js, Java, Rust, .NET, Ruby |
| **Output** | OTLP (traces + metrics) |
| **Deployment** | Standalone binary or Kubernetes |
| **License** | Apache 2.0 |
| **Best For** | Simple setups, Grafana stack users |

### Odigos

| Aspect | Details |
|--------|---------|
| **Focus** | Full distributed tracing with context propagation |
| **Languages** | Go, Python, Node.js, Java, .NET |
| **Output** | OTLP (traces) |
| **Deployment** | Kubernetes-native (operator) |
| **License** | Apache 2.0 |
| **Best For** | Kubernetes environments, distributed tracing |

### Pixie (by New Relic)

| Aspect | Details |
|--------|---------|
| **Focus** | Full-stack observability with in-cluster storage |
| **Languages** | Go, C/C++, Python, Node.js, Java, Rust |
| **Output** | Pixie format (can export to OTel) |
| **Deployment** | Kubernetes only |
| **License** | Apache 2.0 |
| **Best For** | Debugging, ad-hoc queries, full visibility |

### Quick Decision Guide

This decision flowchart helps you choose the right eBPF tool based on your environment and requirements. Kubernetes users needing distributed tracing should prefer Odigos, while simpler setups can use Beyla.

```mermaid
flowchart TD
    START[Need eBPF Auto-Instrumentation?] --> K8S{Kubernetes?}

    K8S -->|Yes| DIST{Need distributed tracing<br>across services?}
    K8S -->|No| BEYLA[Use Beyla]

    DIST -->|Yes| ODIGOS[Use Odigos]
    DIST -->|No, metrics/single service| BEYLA

    ODIGOS --> ADHOC{Also need<br>ad-hoc debugging?}
    ADHOC -->|Yes| PIXIE[Add Pixie]
    ADHOC -->|No| DONE[Done]
```

---

## 5. Setting Up Beyla (Grafana's eBPF Auto-Instrumenter)

Beyla is the simplest way to get started with eBPF-based OpenTelemetry instrumentation.

### Prerequisites

- Linux kernel 5.8+ (for BTF support)
- Root/privileged access
- Target application running

### Installation

These commands download and install the Beyla binary. Beyla is distributed as a standalone executable that requires no additional dependencies beyond a compatible Linux kernel.

```bash
# Download the latest release from GitHub
curl -LO https://github.com/grafana/beyla/releases/latest/download/beyla-linux-amd64.tar.gz
# Extract the binary
tar xzf beyla-linux-amd64.tar.gz
# Move to a directory in PATH for easy access
sudo mv beyla /usr/local/bin/
```

### Configuration

Create `beyla-config.yaml`:

This configuration file tells Beyla which processes to instrument and where to send telemetry. The `open_port` setting is the simplest way to target applications - Beyla will instrument any process listening on that port.

```yaml
# beyla-config.yaml
# Target processes listening on port 8080 for instrumentation
open_port: 8080  # Instrument processes listening on this port

# Alternative targeting methods (uncomment one):
# Target by executable name - useful for specific binaries
# executable_name: "my-service"

# Target by process ID - useful for debugging specific processes
# pid: 12345

# OTLP export configuration - where to send telemetry data
otel_traces_export:
  endpoint: http://localhost:4317  # OTel Collector gRPC endpoint

otel_metrics_export:
  endpoint: http://localhost:4317

# Optional: Add resource attributes for better identification
attributes:
  kubernetes:
    enable: true  # Auto-detect K8s metadata (pod name, namespace, etc.)

# Sampling configuration to control data volume
traces:
  sampler:
    name: parentbased_traceidratio
    arg: "0.1"  # Sample 10% of traces (adjust for production)
```

### Running Beyla

These commands show two ways to run Beyla: with a config file or using environment variables. The environment variable approach is useful for quick testing or when you want to override config file settings.

```bash
# Run with config file - recommended for production
sudo beyla --config beyla-config.yaml

# Or with environment variables - useful for quick testing
sudo BEYLA_OPEN_PORT=8080 \
     OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317 \
     beyla
```

### Kubernetes Deployment

This DaemonSet configuration deploys Beyla across all nodes in your Kubernetes cluster. It instruments all pods listening on the specified ports and automatically enriches telemetry with Kubernetes metadata like pod names and namespaces.

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: beyla
  namespace: observability
spec:
  selector:
    matchLabels:
      app: beyla
  template:
    metadata:
      labels:
        app: beyla
    spec:
      hostPID: true  # Required: access host PID namespace
      serviceAccountName: beyla
      containers:
      - name: beyla
        image: grafana/beyla:latest
        securityContext:
          privileged: true   # Required for eBPF
          runAsUser: 0       # Must run as root
        env:
        # Comma-separated list of ports to instrument
        - name: BEYLA_OPEN_PORT
          value: "8080,3000,9090"  # Ports to instrument
        # OTel Collector endpoint for sending telemetry
        - name: OTEL_EXPORTER_OTLP_ENDPOINT
          value: "http://otel-collector.observability:4317"
        # Enable Kubernetes metadata enrichment
        - name: BEYLA_KUBE_METADATA_ENABLE
          value: "true"
        volumeMounts:
        # Required: access to kernel BTF data
        - name: sys-kernel
          mountPath: /sys/kernel
          readOnly: true
      volumes:
      - name: sys-kernel
        hostPath:
          path: /sys/kernel
```

### What Beyla Captures

Once running, Beyla automatically generates:

**Traces:**
- HTTP server spans (method, path, status, duration)
- HTTP client spans (outgoing requests)
- gRPC spans (method, status)
- SQL query spans (if using supported drivers)

**Metrics:**
- `http.server.request.duration` (histogram)
- `http.server.request.body.size`
- `http.client.request.duration`
- `rpc.server.duration`
- `rpc.client.duration`

---

## 6. Setting Up Odigos for Kubernetes

Odigos provides more comprehensive distributed tracing with automatic context propagation.

### Installation

These commands install the Odigos CLI, which manages the Odigos operator in your Kubernetes cluster. You can use Homebrew on macOS or download the binary directly for Linux.

```bash
# Install the Odigos CLI using Homebrew (macOS)
brew install odigos-io/homebrew-odigos-cli/odigos

# Or download directly for Linux
curl -LO https://github.com/odigos-io/odigos/releases/latest/download/odigos-cli-linux-amd64
chmod +x odigos-cli-linux-amd64
sudo mv odigos-cli-linux-amd64 /usr/local/bin/odigos
```

### Deploy to Kubernetes

The `odigos install` command deploys the Odigos operator and supporting components to your cluster. This creates the infrastructure needed for automatic instrumentation without requiring changes to your application deployments.

```bash
# Install Odigos in your cluster
odigos install

# This creates:
# - odigos-system namespace
# - Odigos operator (manages instrumentation)
# - Instrumentor DaemonSet (injects instrumentation)
# - OTel Collector (optional, for telemetry collection)
```

### Configure a Destination

After installation, configure where Odigos should send telemetry. You can use the web UI or CLI to add backend destinations like OneUptime, Jaeger, or any OTLP-compatible endpoint.

```bash
# Add your observability backend using the web UI
odigos ui

# Or via CLI for automated setups
odigos destination add oneuptime \
  --endpoint https://otlp.oneuptime.com \
  --api-key YOUR_API_KEY
```

### Instrument Namespaces

These commands tell Odigos which workloads to instrument. You can target entire namespaces for broad coverage or specific deployments for surgical precision.

```bash
# Instrument all workloads in a namespace - broadest approach
odigos instrument namespace my-app-namespace

# Or specific workloads for more control
odigos instrument deployment my-service -n my-namespace
```

### How Odigos Works

Odigos is smarter than simple eBPF tracing:

1. **Language Detection**: Automatically detects the runtime (Go, Java, Python, etc.)
2. **Appropriate Instrumentation**: Uses eBPF for Go, injects agents for Java/Python
3. **Context Propagation**: Ensures trace context flows across service boundaries
4. **No Code Changes**: All injection happens at runtime

This sequence diagram shows how Odigos maintains distributed trace context across multiple services written in different languages. The key is automatic injection and extraction of trace headers, ensuring complete end-to-end visibility.

```mermaid
sequenceDiagram
    participant Client
    participant ServiceA as Service A (Go)
    participant ServiceB as Service B (Python)
    participant ServiceC as Service C (Java)
    participant Collector as OTel Collector

    Note over ServiceA,ServiceC: Odigos instruments all services automatically

    Client->>ServiceA: HTTP Request
    Note right of ServiceA: eBPF captures request,<br>generates trace_id
    ServiceA->>ServiceB: HTTP with traceparent header
    Note right of ServiceB: Agent extracts context,<br>continues trace
    ServiceB->>ServiceC: gRPC with trace context
    Note right of ServiceC: Agent continues trace
    ServiceC-->>ServiceB: Response
    ServiceB-->>ServiceA: Response
    ServiceA-->>Client: Response

    ServiceA->>Collector: Spans (OTLP)
    ServiceB->>Collector: Spans (OTLP)
    ServiceC->>Collector: Spans (OTLP)
```

---

## 7. What Gets Captured Automatically

Here's what eBPF-based tools can and cannot capture automatically:

### Automatically Captured

| Signal | Details |
|--------|---------|
| **HTTP Server Requests** | Method, path, status code, duration, headers |
| **HTTP Client Requests** | Outgoing calls with destination, timing |
| **gRPC Calls** | Method, status, duration (both server and client) |
| **Database Queries** | Query text, duration, database type (varies by tool) |
| **DNS Lookups** | Domain, resolution time, result |
| **TCP Connections** | Source, destination, bytes transferred |
| **TLS Handshakes** | Certificate info, handshake duration |

### Partially Captured (Varies by Tool/Language)

| Signal | Limitations |
|--------|-------------|
| **Message Queues** | Kafka/RabbitMQ support varies; may need manual setup |
| **Custom Protocols** | Requires specific support in the tool |
| **Internal Function Calls** | Only with symbol information available |
| **Business Logic Context** | Cannot infer user IDs, order IDs, etc. |

### Not Captured (Need Manual Instrumentation)

| Signal | Why |
|--------|-----|
| **Custom Span Attributes** | eBPF doesn't know your business domain |
| **Application Errors** | Exception details, stack traces (partial) |
| **Custom Metrics** | Business KPIs, conversion rates |
| **Baggage/Context** | Custom propagated data |

---

## 8. Correlating eBPF Data with Manual Instrumentation

The best approach is often **hybrid**: eBPF for baseline coverage, manual instrumentation for important details.

### Strategy: Layer Your Instrumentation

This diagram shows the layered instrumentation approach. eBPF provides the foundation (network and system calls), auto-instrumentation libraries add framework context, and manual spans capture business-specific details that only your code understands.

```mermaid
graph TB
    subgraph "Layer 1: eBPF (Automatic)"
        L1[HTTP/gRPC entry/exit]
        L2[Database calls]
        L3[External HTTP calls]
    end

    subgraph "Layer 2: Auto-Instrumentation Libraries"
        L4[Framework-specific spans]
        L5[Library instrumentation]
    end

    subgraph "Layer 3: Manual (Custom)"
        L6[Business logic spans]
        L7[Custom attributes]
        L8[Error details]
    end

    L1 --> L4
    L4 --> L6
```

### Example: Hybrid Setup

This Go example demonstrates hybrid instrumentation. eBPF automatically captures the HTTP handler entry/exit and database calls, while manual instrumentation adds business context (customer ID, order total) that eBPF cannot infer. The key is that both use the same trace context.

```go
// Your Go service - eBPF captures the HTTP handler automatically
// You add manual spans for important business logic

func (s *OrderService) CreateOrder(ctx context.Context, req *OrderRequest) (*Order, error) {
    // eBPF already captured: HTTP POST /orders, timing, status

    // Manual span for business logic detail - eBPF can't see this granularity
    ctx, span := tracer.Start(ctx, "order.validate")
    err := s.validateOrder(ctx, req)
    span.End()
    if err != nil {
        // Manual: Add error details eBPF can't see (exception type, message)
        span.RecordError(err)
        span.SetStatus(codes.Error, "validation failed")
        return nil, err
    }

    // eBPF captures the database call automatically (timing, query)
    // Manual: Add business context that gives meaning to the data
    ctx, span = tracer.Start(ctx, "order.save")
    span.SetAttributes(
        attribute.String("order.customer_id", req.CustomerID),  // Business context
        attribute.Float64("order.total", req.Total),            // Domain metric
        attribute.Int("order.items_count", len(req.Items)),     // Cardinality info
    )
    order, err := s.repo.Save(ctx, req)
    span.End()

    return order, err
}
```

### Ensuring Correlation Works

For eBPF spans and manual spans to appear in the same trace:

1. **Same Trace ID**: eBPF tools extract `traceparent` from incoming requests
2. **Context Propagation**: Your manual spans must use the same context
3. **Consistent Export**: Both eBPF and manual instrumentation export to the same collector

This OTel Collector configuration merges telemetry from both eBPF agents and manual instrumentation. The resource processor adds consistent attributes across all sources, ensuring proper correlation in your observability backend.

```yaml
# OTel Collector config to merge both sources
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317  # Receive from eBPF agents
      http:
        endpoint: 0.0.0.0:4318  # Receive from manual SDKs

processors:
  batch:
    timeout: 1s  # Batch for efficient export

  # Add consistent resource attributes across all telemetry
  resource:
    attributes:
      - key: deployment.environment
        value: production
        action: upsert  # Add or update this attribute

exporters:
  otlp:
    endpoint: https://oneuptime.com/otlp
    headers:
      x-oneuptime-token: ${ONEUPTIME_TOKEN}

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch, resource]
      exporters: [otlp]
```

---

## 9. Performance Overhead

A critical question: **What's the cost of running eBPF-based auto-instrumentation?**

### Measured Overhead

| Tool | CPU Overhead | Memory | Latency Impact |
|------|-------------|--------|----------------|
| Beyla | 1-3% | ~50-100MB | < 1ms |
| Odigos | 2-5% | ~100-200MB | < 2ms |
| Pixie | 2-5% | ~500MB-1GB | < 1ms |

*Note: Actual overhead varies by workload, sampling rate, and number of traced endpoints.*

### Factors That Increase Overhead

| Factor | Impact | Mitigation |
|--------|--------|------------|
| High request volume | More eBPF events to process | Increase sampling |
| Many traced endpoints | More probes attached | Be selective |
| Full payload capture | Memory/CPU for data copy | Disable or limit |
| Low sampling rate | More data to export | Use head sampling |

### Reducing Overhead

This configuration demonstrates how to reduce eBPF overhead through sampling and endpoint filtering. Excluding high-volume, low-value endpoints like health checks can significantly reduce data volume without losing important observability data.

```yaml
# Beyla example: Reduce overhead with sampling
traces:
  sampler:
    name: parentbased_traceidratio
    arg: "0.01"  # 1% sampling for high-traffic production

# Exclude high-volume, low-value endpoints from tracing
routes:
  ignored:
    - /health   # Health checks - high volume, low insight
    - /ready    # Readiness probes - same
    - /metrics  # Prometheus scrapes - already have metrics
```

---

## 10. Limitations and When to Use Manual Instrumentation

eBPF auto-instrumentation is powerful but not magic. Know when to supplement it.

### Use eBPF Auto-Instrumentation When:

- You need quick baseline observability across many services
- You can't modify application code (legacy, third-party)
- You want consistent HTTP/gRPC/DB tracing without per-service setup
- You need network-level visibility (connections, DNS)
- You're in a Kubernetes environment with mixed languages

### Use Manual Instrumentation When:

- You need custom business attributes (user ID, order ID, feature flags)
- You want detailed error information with stack traces
- You need custom [metrics](https://oneuptime.com/blog/post/2025-08-26-what-are-metrics-in-opentelemetry/view) (business KPIs, counters for specific events)
- You're tracing non-HTTP protocols without eBPF support
- You need baggage propagation for cross-service context
- You want control over span names and structure

### Limitations of eBPF Auto-Instrumentation

| Limitation | Details |
|------------|---------|
| **Linux only** | No Windows, macOS, or container runtimes without Linux kernel |
| **Kernel version** | Requires 5.x+ for best results; some features need 5.8+ |
| **Privileged access** | Must run with elevated privileges (security concern) |
| **Symbol availability** | Go binaries stripped of symbols reduce visibility |
| **Encrypted traffic** | TLS inspection requires additional setup |
| **Application context** | Can't infer business meaning from network data |

---

## 11. Production Best Practices

### Security Considerations

eBPF agents run with elevated privileges. Mitigate risks:

This RBAC configuration limits what the eBPF agent can access in Kubernetes. Following the principle of least privilege, only grant the permissions actually needed for the agent to function.

```yaml
# Kubernetes: Use strict RBAC - only grant necessary permissions
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: ebpf-agent-role
rules:
# Read-only access to pods and nodes for metadata enrichment
- apiGroups: [""]
  resources: ["pods", "nodes"]
  verbs: ["get", "list", "watch"]
# Avoid granting more permissions than needed - no create/update/delete
```

Use seccomp profiles to further restrict system calls the agent can make:

```yaml
# Use seccomp profiles where possible to limit syscall surface
securityContext:
  seccompProfile:
    type: RuntimeDefault  # Use container runtime's default profile
```

### Resource Limits

Always set resource limits on eBPF agents to prevent them from consuming excessive node resources during high-traffic periods.

```yaml
containers:
- name: ebpf-agent
  resources:
    # Guaranteed minimum resources
    requests:
      cpu: 100m
      memory: 128Mi
    # Hard limits to prevent resource exhaustion
    limits:
      cpu: 500m
      memory: 512Mi
```

### Filtering and Sampling

This configuration shows production-ready filtering and sampling settings. Focus on tracing API endpoints that provide business value while excluding high-volume infrastructure endpoints.

```yaml
# Don't trace everything - focus on what matters
routes:
  # Include patterns for business-critical endpoints
  patterns:
    - /api/*        # Trace API calls
    - /graphql      # Trace GraphQL
  # Exclude high-volume, low-value endpoints
  ignored:
    - /health       # Skip health checks
    - /metrics      # Skip metrics endpoint
    - /favicon.ico  # Skip static assets

# Sample to control volume in production
traces:
  sampler:
    name: parentbased_traceidratio
    arg: "0.1"  # 10% in production - adjust based on traffic
```

### Gradual Rollout

Start with non-production environments to validate overhead and data quality before expanding to production workloads. This approach minimizes risk and allows you to tune configuration.

```bash
# Start with non-production to validate behavior
odigos instrument namespace staging

# Verify overhead and data quality (check CPU, memory, latency impact)
# Then expand to production incrementally
odigos instrument namespace production
```

### Monitoring the Monitoring

Export metrics from your eBPF agents themselves so you can detect and alert on instrumentation issues before they impact observability coverage.

```yaml
# Export eBPF agent metrics for self-monitoring
prometheus:
  port: 9090
  path: /metrics

# Alert on agent issues:
# - High CPU usage (agent overhead)
# - Dropped events (buffer overflow)
# - Export failures (backend connectivity)
```

---

## 12. Conclusion

eBPF-based auto-instrumentation represents a paradigm shift in observability. By moving instrumentation to the kernel level, we can:

- **Eliminate instrumentation toil**: No more per-service SDK integration
- **Achieve universal coverage**: Observe any application, any language
- **Reduce blind spots**: Catch the services that fell through the cracks
- **Accelerate onboarding**: New services are observable immediately

But it's not a complete replacement for traditional instrumentation. The best observability strategies combine:

1. **eBPF** for baseline, infrastructure-level visibility
2. **Auto-instrumentation libraries** for framework-specific context
3. **Manual instrumentation** for business-critical spans and custom attributes

Tools like Beyla and Odigos make it easier than ever to get started. If you're running on Kubernetes with Linux, you can have distributed tracing across your entire stack in minutes- not weeks.

---

## Key Takeaways

1. **eBPF enables zero-code instrumentation** by observing applications from the kernel
2. **OpenTelemetry compatibility** means eBPF data flows into your existing observability stack
3. **Choose the right tool**: Beyla for simplicity, Odigos for Kubernetes distributed tracing, Pixie for debugging
4. **Hybrid approaches work best**: eBPF for coverage, manual for business context
5. **Overhead is low** (1-5% CPU) but monitor it and use sampling
6. **Security matters**: eBPF requires privileges; scope them appropriately
7. **Start small**: Instrument staging first, then expand to production

---

## Further Reading

- [What is eBPF and How Does It Work?](https://oneuptime.com/blog/post/2025-12-10-what-is-ebpf-and-how-does-it-work/view) - Deep dive into eBPF fundamentals
- [Traces and Spans in OpenTelemetry](https://oneuptime.com/blog/post/2025-08-27-traces-and-spans-in-opentelemetry/view) - Understanding distributed tracing
- [What are Metrics in OpenTelemetry?](https://oneuptime.com/blog/post/2025-08-26-what-are-metrics-in-opentelemetry/view) - Metrics fundamentals
- [Logs, Metrics & Traces: The Three Pillars](https://oneuptime.com/blog/post/2025-08-20-three-pillars-of-observability-logs-metrics-traces/view) - Complete observability overview
- [Basics of Profiling](https://oneuptime.com/blog/post/2025-09-09-basics-of-profiling/view) - When you need deeper performance insight

---

*Looking to implement eBPF-based auto-instrumentation and send the data to a unified observability platform? [OneUptime](https://oneuptime.com) supports OTLP ingestion, letting you combine eBPF-generated traces with your existing telemetry for complete visibility across your stack.*
