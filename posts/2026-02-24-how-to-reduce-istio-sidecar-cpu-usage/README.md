# How to Reduce Istio Sidecar CPU Usage

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, CPU Optimization, Envoy, Sidecar Proxy, Performance

Description: Practical strategies to reduce CPU consumption of Istio Envoy sidecar proxies for cost-efficient mesh operations.

---

CPU usage from Istio sidecars is something that sneaks up on you. A single proxy might use 20-50 millicores at steady state, which seems fine. But when you have thousands of pods, that baseline adds up to several full CPU cores doing nothing but proxy work. And when traffic spikes, sidecar CPU can jump significantly. Here are concrete steps to bring that CPU usage down.

## Where Does the CPU Go?

The Envoy sidecar spends CPU on several things:

- TLS handshakes and encryption/decryption for mTLS
- Protocol parsing (HTTP/1.1, HTTP/2, gRPC)
- Route matching against VirtualService rules
- Load balancing decisions
- Telemetry collection and metric computation
- Health checking
- Configuration processing when xDS updates arrive

The first two are typically the biggest consumers during normal operation.

## Set Concurrency Appropriately

Envoy uses worker threads to handle connections. If concurrency is not set, Istio automatically determines the worker count based on CPU limits. Setting it explicitly can prevent the proxy from running more workers than the workload needs.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          concurrency: 2
```

Or set it globally:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      concurrency: 2
```

For many services handling under 1000 requests per second, 2 worker threads are enough, but confirm with load testing for your workload. Each idle worker thread still consumes some CPU for event loop processing, so reducing this number can lower baseline usage.

## Reduce Configuration Scope

Every time istiod pushes a configuration update, every affected sidecar has to parse and apply it. Large configurations mean more CPU spent on processing. The Sidecar resource limits the configuration each proxy receives:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: my-namespace
spec:
  egress:
  - hosts:
    - "./*"
    - "istio-system/*"
```

Fewer services in scope means less configuration to process, which reduces CPU spikes during config updates and lowers baseline usage since route matching has fewer rules to evaluate.

## Minimize Telemetry

Telemetry collection is one of the more CPU-intensive operations in the sidecar. Every request generates metrics and potentially access logs and traces.

Reduce metric cardinality:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: cpu-friendly
  namespace: my-namespace
spec:
  selector:
    matchLabels:
      app: cpu-sensitive-app
  metrics:
  - providers:
    - name: prometheus
    overrides:
    - match:
        metric: ALL_METRICS
        mode: CLIENT_AND_SERVER
      tagOverrides:
        source_canonical_revision:
          operation: REMOVE
        destination_canonical_revision:
          operation: REMOVE
        request_protocol:
          operation: REMOVE
  accessLogging:
  - disabled: true
  tracing:
  - disableSpanReporting: true
```

Disabling access logging and span reporting for workloads that do not need them removes two continuous CPU consumers.

## Optimize TLS Operations

mTLS can be one of the biggest CPU consumers in Istio deployments. Every new TLS connection requires a handshake involving cryptographic operations. Reduce the frequency of handshakes by keeping connections alive longer:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: keep-connections
  namespace: my-namespace
spec:
  host: my-service.my-namespace.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 200
        tcpKeepalive:
          time: 7200s
          interval: 75s
      http:
        maxRequestsPerConnection: 0
        h2UpgradePolicy: UPGRADE
```

`maxRequestsPerConnection: 0` means never close the connection based on request count. HTTP/2 upgrade multiplexes many requests over a single connection, which means fewer TLS handshakes overall.

## Use Protocol Naming Conventions

When Istio cannot determine the protocol on a port, it uses automatic protocol detection and treats traffic as plain TCP if the protocol cannot be detected. Detection requires inspecting the first bytes of a connection, which takes CPU. Declare protocols explicitly:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  ports:
  - name: http-api
    port: 8080
  - name: grpc-internal
    port: 9090
  - name: tcp-data
    port: 5555
```

The prefix in the port name (http-, grpc-, tcp-) tells Istio the protocol immediately, skipping the detection step.

## Exclude Non-Mesh Traffic

Traffic that does not need mesh features should bypass the sidecar entirely:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        traffic.sidecar.istio.io/excludeOutboundPorts: "5432,6379,9200"
        traffic.sidecar.istio.io/excludeInboundPorts: "15090"
```

If database connections (PostgreSQL on 5432, Redis on 6379, Elasticsearch on 9200) do not need mesh policy, mTLS, or telemetry, excluding them reduces the number of connections Envoy has to manage.

## Set CPU Resource Limits

Configure sidecar CPU limits to prevent runaway usage and ensure fair scheduling:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/proxyCPU: "50m"
        sidecar.istio.io/proxyCPULimit: "200m"
```

For global defaults:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      proxy:
        resources:
          requests:
            cpu: 50m
          limits:
            cpu: 200m
```

Start conservative and increase if you see throttling. You can check for CPU throttling:

```bash
# Check if the proxy container is being throttled

kubectl exec -it deploy/my-app -c istio-proxy -- sh -c 'cat /sys/fs/cgroup/cpu.stat 2>/dev/null || cat /sys/fs/cgroup/cpu/cpu.stat'
```

## Reduce Outlier Detection Frequency

Istio can run outlier detection sweeps for upstream endpoints. With many services and endpoints, frequent sweeps add background CPU usage:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: relaxed-health-checks
  namespace: my-namespace
spec:
  host: my-service.my-namespace.svc.cluster.local
  trafficPolicy:
    outlierDetection:
      interval: 30s
      consecutive5xxErrors: 5
      baseEjectionTime: 60s
```

Increasing the outlier detection interval from the default 10s to 30s reduces how often Envoy analyzes hosts for ejection. The tradeoff is slightly slower ejection of unhealthy endpoints.

## Avoid Complex Routing Rules

VirtualService rules with many match conditions and regex patterns are expensive to evaluate on every request:

```yaml
# This is expensive - evaluated on every request
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: complex-routing
spec:
  hosts:
  - my-service
  http:
  - match:
    - headers:
        x-custom-header:
          regex: "^(value1|value2|value3|value4)$"
    route:
    - destination:
        host: my-service
```

Where possible, use exact matches or prefix matches instead of regex. Group similar rules to reduce the total number of match evaluations.

## Measure the Impact

After making changes, verify that CPU usage dropped:

```bash
# Current CPU usage per container
kubectl top pods -n my-namespace --containers | grep istio-proxy | sort -k3 -h

# Envoy internal stats
kubectl exec -it deploy/my-app -c istio-proxy -- curl -s localhost:15000/stats | grep "server.concurrency\|server.total_connections"

# Watch CPU over time with Prometheus
# Query: rate(container_cpu_usage_seconds_total{container="istio-proxy", namespace="my-namespace"}[5m])
```

The key principle for CPU optimization is reducing unnecessary work: fewer services in scope, fewer telemetry dimensions, fewer TLS handshakes, and fewer complex routing evaluations. Each optimization compounds, and in a large deployment the aggregate savings are substantial.
