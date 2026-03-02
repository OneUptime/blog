# How to Configure Istio for Long-Running Process Workers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Worker, Kubernetes, Service Mesh, Long-Running Processes

Description: How to configure Istio for long-running worker processes that maintain persistent connections and require extended timeout and keepalive settings.

---

Long-running process workers are applications that start a task and keep working on it for minutes, hours, or even days. Think video transcoding, data migration scripts, report generation, or file processing pipelines. These workers strain Istio's default configuration because the defaults are optimized for short-lived request-response interactions.

This guide covers how to tune Istio so that long-running workers do not get killed by timeouts, lose their connections, or get disrupted by mesh updates.

## What Makes Long-Running Workers Different

Long-running workers have a few characteristics that conflict with Istio defaults:

- They hold connections open for extended periods
- A single "request" might last hours
- They are sensitive to connection interruptions (restarting from scratch is expensive)
- They often use streaming or chunked transfer encodings
- Graceful shutdown needs to be handled carefully because interrupting a long task wastes compute

## Setting Up the Namespace

```bash
kubectl create namespace long-workers
kubectl label namespace long-workers istio-injection=enabled
```

## Basic Worker Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: video-transcoder
  namespace: long-workers
  labels:
    app: video-transcoder
spec:
  replicas: 4
  selector:
    matchLabels:
      app: video-transcoder
  template:
    metadata:
      labels:
        app: video-transcoder
      annotations:
        proxy.istio.io/config: |
          holdApplicationUntilProxyStarts: true
          terminationDrainDuration: 300s
    spec:
      terminationGracePeriodSeconds: 600
      containers:
      - name: transcoder
        image: myregistry/video-transcoder:1.0
        ports:
        - containerPort: 8080
          name: http-health
        readinessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 30
        lifecycle:
          preStop:
            exec:
              command: ["/app/graceful-shutdown"]
        resources:
          requests:
            memory: "2Gi"
            cpu: "2"
          limits:
            memory: "4Gi"
            cpu: "4"
---
apiVersion: v1
kind: Service
metadata:
  name: video-transcoder
  namespace: long-workers
spec:
  selector:
    app: video-transcoder
  ports:
  - name: http-health
    port: 8080
    targetPort: 8080
```

The `terminationDrainDuration` in the Istio proxy config tells Envoy how long to wait before forcing connections closed during a shutdown. The `terminationGracePeriodSeconds` on the pod gives the entire pod that much time to shut down gracefully. Set the pod's grace period higher than the drain duration.

## Extended Timeouts

The most critical configuration for long-running workers is timeouts. If the worker calls other services during its processing, those calls need generous timeouts:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: storage-api-vs
  namespace: long-workers
spec:
  hosts:
  - "storage-api.data-services.svc.cluster.local"
  http:
  - route:
    - destination:
        host: storage-api.data-services.svc.cluster.local
    timeout: 7200s
    retries:
      attempts: 3
      perTryTimeout: 3600s
      retryOn: connect-failure,reset
```

A two-hour timeout might seem extreme, but for video transcoding or data migration, individual operations can legitimately take that long.

## TCP Keepalive Settings

Long-lived connections are vulnerable to being dropped by intermediate network devices (load balancers, firewalls, NAT gateways). TCP keepalive prevents this:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: storage-api-dr
  namespace: long-workers
spec:
  host: "storage-api.data-services.svc.cluster.local"
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 30s
        tcpKeepalive:
          time: 60s
          interval: 20s
          probes: 5
      http:
        idleTimeout: 7200s
        maxRequestsPerConnection: 0
```

The `idleTimeout` of 7200 seconds prevents Envoy from closing idle connections. Setting `maxRequestsPerConnection` to 0 means unlimited requests per connection, keeping persistent connections alive.

## Handling Streaming Downloads and Uploads

Long-running workers often download or upload large files. Streaming transfers need special attention:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: stream-timeout
  namespace: long-workers
spec:
  workloadSelector:
    labels:
      app: video-transcoder
  configPatches:
  - applyTo: ROUTE_CONFIGURATION
    match:
      context: SIDECAR_OUTBOUND
    patch:
      operation: MERGE
      value:
        max_direct_response_body_size_bytes: 0
```

## Preventing Disruption During Mesh Updates

When Istio is upgraded or the sidecar is updated, existing pods get new sidecars injected on restart. For long-running workers, you want to control when this happens:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: video-transcoder-pdb
  namespace: long-workers
spec:
  maxUnavailable: 1
  selector:
    matchLabels:
      app: video-transcoder
```

This ensures at most one worker pod is disrupted at a time during rolling updates or node drains.

## Sidecar Resource Configuration

Long-running workers are typically CPU and memory intensive. Allocate enough resources to the sidecar so it does not get throttled:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: video-transcoder
  namespace: long-workers
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/proxyCPU: "200m"
        sidecar.istio.io/proxyMemory: "256Mi"
        sidecar.istio.io/proxyCPULimit: "1"
        sidecar.istio.io/proxyMemoryLimit: "512Mi"
```

For workers that transfer large amounts of data, the sidecar needs more memory to handle buffering.

## Outbound Traffic Configuration

Workers often need to reach external services. Configure service entries:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: cloud-storage
  namespace: long-workers
spec:
  hosts:
  - "storage.googleapis.com"
  ports:
  - number: 443
    name: https
    protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: cloud-storage-dr
  namespace: long-workers
spec:
  host: "storage.googleapis.com"
  trafficPolicy:
    connectionPool:
      tcp:
        connectTimeout: 30s
        tcpKeepalive:
          time: 60s
          interval: 20s
          probes: 5
    tls:
      mode: SIMPLE
```

## Limiting Sidecar Scope

Workers that only talk to a few services benefit from a restricted sidecar:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Sidecar
metadata:
  name: video-transcoder-sidecar
  namespace: long-workers
spec:
  workloadSelector:
    labels:
      app: video-transcoder
  egress:
  - hosts:
    - "data-services/*"
    - "istio-system/*"
  - hosts:
    - "~/*.googleapis.com"
```

## Graceful Shutdown Handling

When a long-running worker needs to shut down, you want it to finish its current task or at least checkpoint its progress. Configure Istio to give it time:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: data-migrator
  namespace: long-workers
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          terminationDrainDuration: 600s
          proxyStatsMatcher:
            inclusionRegexps:
            - ".*upstream_cx_active.*"
    spec:
      terminationGracePeriodSeconds: 900
      containers:
      - name: migrator
        image: myregistry/data-migrator:1.0
        lifecycle:
          preStop:
            exec:
              command:
              - /bin/sh
              - -c
              - |
                # Signal the app to stop accepting new work
                touch /tmp/shutdown
                # Wait for current task to finish
                while [ -f /tmp/processing ]; do sleep 5; done
```

The sequence during shutdown is:

1. Kubernetes sends SIGTERM
2. The preStop hook runs and waits for the current task
3. After the task finishes, the container exits
4. Istio's terminationDrainDuration gives the proxy time to close connections gracefully
5. The pod terminates

## Monitoring Worker Health

Track long-running worker behavior:

```bash
# Check active connections from workers
kubectl exec -n istio-system deploy/prometheus -- \
  promtool query instant 'sum(istio_tcp_connections_opened_total{source_workload_namespace="long-workers"} - istio_tcp_connections_closed_total{source_workload_namespace="long-workers"}) by (source_workload)'

# Data transfer rates
kubectl exec -n istio-system deploy/prometheus -- \
  promtool query instant 'sum(rate(istio_tcp_sent_bytes_total{source_workload_namespace="long-workers"}[5m])) by (source_workload)'
```

## Summary

Long-running workers need three things from Istio: extended timeouts that match the actual duration of tasks, TCP keepalive settings that prevent connection drops, and graceful shutdown configuration that allows in-progress work to complete. Set the `terminationDrainDuration` and `terminationGracePeriodSeconds` high enough to accommodate your longest tasks, and use PodDisruptionBudgets to prevent mesh updates from killing active workers. Get these right and Istio adds significant value through observability and security without interfering with your processing.
