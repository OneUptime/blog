# How to Optimize Istio Performance on ARM Nodes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, ARM, Performance, Kubernetes, Envoy

Description: Practical tips and configurations for optimizing Istio service mesh performance on ARM-based Kubernetes nodes like AWS Graviton.

---

ARM processors like AWS Graviton offer excellent price-performance ratios, but they have different characteristics than x86 chips. When you run Istio on ARM nodes, there are specific tuning opportunities that can make a real difference in latency, throughput, and resource usage. This guide covers the practical optimizations you can apply today.

## Understanding ARM Performance Characteristics

ARM chips like Graviton 3 have more cores but each core runs at a lower clock speed compared to equivalent x86 instances. This means workloads that scale well across cores perform great on ARM, while single-threaded workloads might see different numbers.

Envoy proxy, which is what Istio uses as its sidecar, is designed to be highly concurrent. It uses an event-driven architecture with worker threads. This is good news for ARM because Envoy can take advantage of the extra cores.

Check how many cores your ARM nodes have:

```bash
kubectl get nodes -o custom-columns=NAME:.metadata.name,CPU:.status.capacity.cpu,ARCH:.status.nodeInfo.architecture
```

## Tuning Envoy Worker Threads

By default, Envoy sets the number of worker threads equal to the number of CPU cores available to it. On ARM instances with many cores, this can actually be too many threads for a sidecar that handles moderate traffic.

Configure the concurrency through Istio's proxy configuration:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      concurrency: 2
```

For most sidecars, 2 worker threads is plenty. You can override this per workload using annotations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: high-traffic-service
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          concurrency: 4
    spec:
      containers:
      - name: app
        image: myapp:latest
```

Setting concurrency explicitly prevents Envoy from spinning up too many threads on high-core-count ARM nodes, which wastes memory and CPU.

## Optimizing Resource Requests and Limits

ARM cores have different performance characteristics, so the resource settings that work on x86 might need adjustment. Start by benchmarking your actual sidecar usage:

```bash
kubectl top pods -n your-namespace --containers | grep istio-proxy
```

Then set appropriate requests and limits:

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
            memory: 64Mi
          limits:
            cpu: 500m
            memory: 256Mi
```

On ARM, you might find that memory usage is slightly different due to the 64-bit ARM instruction set. Monitor actual usage and adjust limits based on real data rather than copying x86 values.

## Enabling HTTP/2 and gRPC Optimizations

ARM processors handle network I/O efficiently. Take advantage of this by making sure your services use HTTP/2 and gRPC where possible, since Envoy handles these protocols very efficiently.

Configure DestinationRules to use HTTP/2:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-service-dr
spec:
  host: my-service
  trafficPolicy:
    connectionPool:
      http:
        h2UpgradePolicy: UPGRADE
```

For gRPC services, make sure you set the correct port naming:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-grpc-service
spec:
  ports:
  - name: grpc
    port: 50051
    targetPort: 50051
```

Istio uses the port name prefix to determine the protocol. Naming the port `grpc` tells Envoy to use HTTP/2 for this traffic.

## Connection Pool Tuning

ARM nodes often handle more concurrent connections thanks to their higher core counts. Tune the connection pool settings:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: backend-dr
spec:
  host: backend-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 200
        connectTimeout: 5s
      http:
        http1MaxPendingRequests: 100
        http2MaxRequests: 200
        maxRequestsPerConnection: 50
```

On ARM, with more cores available, Envoy can handle higher connection counts efficiently. But do not set these values arbitrarily high. Monitor and tune based on your actual traffic patterns.

## Reducing Sidecar Scope

One of the most impactful optimizations on any architecture is reducing the sidecar scope. By default, Envoy imports listeners and clusters for every service in the mesh. On large meshes, this means every sidecar has configuration for hundreds or thousands of services it will never talk to.

Use Sidecar resources to limit scope:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Sidecar
metadata:
  name: frontend-sidecar
  namespace: frontend
spec:
  egress:
  - hosts:
    - "./backend-api.backend.svc.cluster.local"
    - "./auth-service.auth.svc.cluster.local"
    - "istio-system/*"
```

This tells the frontend namespace sidecars to only load configuration for the backend API, auth service, and Istio system components. On ARM nodes with tighter memory constraints, this can significantly reduce memory usage per sidecar.

## Enabling Protocol Sniffing

Istio supports automatic protocol detection, which avoids the overhead of running unnecessary protocol-specific filters. Make sure it is not disabled in your mesh:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    protocolDetectionTimeout: 100ms
```

A short detection timeout ensures quick fallback to TCP if the protocol cannot be determined, reducing latency for non-HTTP traffic.

## Profiling with Envoy Admin Interface

To understand where time is being spent on your ARM nodes, use the Envoy admin interface for profiling:

```bash
kubectl port-forward deploy/my-service 15000:15000
```

Then check stats:

```bash
curl localhost:15000/stats | grep -E "downstream_cx_total|downstream_rq_total|upstream_rq_time"
```

Look at the `upstream_rq_time` histogram to understand latency distribution. Compare these numbers between ARM and x86 to identify architecture-specific bottlenecks.

## Pilot Optimization for Large Meshes

On the control plane side, istiod running on ARM needs appropriate resources. For large meshes, increase pilot resources:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        resources:
          requests:
            cpu: 1000m
            memory: 4Gi
          limits:
            cpu: 4000m
            memory: 8Gi
        hpaSpec:
          minReplicas: 2
          maxReplicas: 5
          metrics:
          - type: Resource
            resource:
              name: cpu
              targetAverageUtilization: 70
```

ARM-based istiod might need slightly more CPU allocation due to lower per-core performance, but the extra cores available make HPA scaling very effective.

## Benchmarking Your Setup

Use fortio to benchmark your mesh on ARM:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/httpbin/httpbin.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/sleep/sleep.yaml

kubectl exec deploy/sleep -- fortio load -c 32 -qps 0 -t 30s http://httpbin:8000/get
```

Run this on both ARM and x86 nodes and compare the results. Look at p50, p99, and max latency plus throughput (requests per second).

## Summary

Optimizing Istio on ARM comes down to understanding the hardware differences and tuning accordingly. Set explicit Envoy concurrency to avoid thread over-allocation on high-core-count ARM chips. Right-size resource requests based on actual measurement rather than copying x86 values. Reduce sidecar scope to minimize memory pressure. And use HTTP/2 and gRPC where you can, since Envoy's event-driven model pairs well with ARM's many-core design. With these optimizations in place, ARM nodes can deliver excellent Istio performance at lower cost.
