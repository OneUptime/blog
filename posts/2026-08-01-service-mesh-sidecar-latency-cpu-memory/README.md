# How Much Latency, CPU, and Memory Does a Service-Mesh Sidecar Add?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Service Mesh, Sidecars, Performance, Capacity Planning, Istio

Description: Estimate and measure service-mesh sidecar overhead without relying on a universal number, then translate the result into latency budgets, resource requests, autoscaling, and cluster cost.

---

There is no universal “a service-mesh sidecar costs X milliseconds and Y MiB” answer. The proxy's overhead changes with request rate, connection count, payload size, protocol, TLS, telemetry, policy, configuration size, worker count, CPU allocation, and traffic topology.

Official benchmarks are useful baselines, not capacity promises. Measure the mesh version, configuration, hardware, and traffic shape you will actually operate.

## Understand the Data Path First

In a sidecar mesh, an in-mesh request commonly traverses two proxies:

```text
client -> client sidecar -> network -> server sidecar -> server
```

That is different from measuring one proxy in isolation. Retries, encryption, protocol detection, access logging, tracing, metrics, authorization, and extension filters all add work or change queueing.

Istio's performance documentation says data-plane behavior depends on connection count, request rate and size, worker threads, protocol, CPU, and enabled features. It specifically notes that logging, tracing, and metrics filters can have a moderate impact.

As a historical documented reference, Istio's published 1.24 test reported about 0.20 vCPU and 60 MB for a sidecar with two worker threads at 1,000 HTTP requests per second with 1 KB payloads. That number is tied to the named version and test conditions. It is not a default request recommendation and should not be projected linearly to a different mesh release or workload.

## Measure Latency as a Distribution

Run the same controlled workload with and without the mesh path. Keep application version, node type, placement, protocol, request rate, payload, connection reuse, TLS mode, and telemetry constant.

Record at least:

- p50, p90, p95, p99, and maximum end-to-end latency;
- throughput achieved versus offered;
- error, timeout, and retry rates;
- proxy CPU throttling and saturation;
- application CPU and queue depth;
- connection establishment and steady-state phases.

The useful calculation is a distribution difference, not one average:

```text
mesh overhead at p99 = p99(mesh path) - p99(baseline path)
```

Test below saturation and near expected peak. A proxy may add little median latency while idle but increase tail latency sharply when CPU-throttled or when telemetry work delays the next request. Istio notes that some raw telemetry collection happens after the response but can still occupy a worker and affect later queue wait.

Include both one-hop synthetic tests and a representative service chain. Small per-hop costs accumulate, but dependencies and queueing make simple multiplication an approximation.

## Measure CPU by Traffic Shape

Collect container-level CPU for the proxy and application separately. Vary one dimension at a time:

- requests or messages per second;
- new versus reused connections;
- payload size;
- HTTP/1.1, HTTP/2, gRPC, or raw TCP;
- mutual TLS and policy complexity;
- access logging, metrics dimensions, trace sampling, and custom filters.

Calculate CPU per unit of useful traffic for each scenario:

```text
proxy cores per 1,000 requests/s = proxy CPU cores / (requests/s / 1,000)
```

This ratio is for interpolation inside the tested range, not unlimited extrapolation. Connection churn and worker saturation can make the curve nonlinear.

Set a CPU request high enough to avoid routine contention. A very low request can make node placement look cheap while allowing other workloads to consume the node; a low CPU limit can then throttle the proxy and turn resource saving into tail latency. Test limits under bursts before enforcing them.

## Measure Memory at Steady State and During Change

Proxy memory is not determined only by request rate. Istio documents that listeners, clusters, and routes increase the configuration state held by the proxy. Also measure:

- idle baseline after configuration convergence;
- peak concurrent connections and streams;
- large request and response buffers;
- certificate and endpoint churn;
- control-plane reconnects;
- configuration pushes and rolling deployments;
- telemetry cardinality and extensions.

Track working set, RSS, OOM kills, and memory-limit headroom over a long enough window to include deployments and traffic peaks. Avoid setting a limit equal to one short steady-state measurement.

## Translate One Sidecar into Fleet Cost

Per-Pod overhead multiplies by replicas:

```text
requested proxy cores = proxy CPU request × injected Pod count
requested proxy memory = proxy memory request × injected Pod count
```

For 2,000 injected Pods, even a modest request materially affects node count and bin packing. Calculate separately for requested capacity, observed use, and peak headroom. Pricing only observed average CPU ignores the capacity the scheduler must reserve.

Include control-plane resources, extra telemetry ingestion, network bytes, and engineering work in a service-mesh cost model. Sidecar cost can also be uneven: a high-throughput gateway and an idle internal service should not automatically receive identical settings.

## Account for HPA Behavior

A Pod-level CPU resource target can include sidecar consumption in the Pod's aggregate utilization and requests. That may be desirable when the proxy is the bottleneck, but it can also scale application replicas in response to mesh overhead rather than app work.

With `autoscaling/v2`, Kubernetes supports a `ContainerResource` metric that targets a named container, such as the app:

```yaml
metrics:
  - type: ContainerResource
    containerResource:
      name: cpu
      container: app
      target:
        type: Utilization
        averageUtilization: 70
```

Use this only if the chosen container metric represents demand and the container name remains stable across rollout. Alternatively, scale on a business or request metric while monitoring proxy saturation separately. An HPA cannot compensate for a proxy limit that throttles each replica before the scaling signal reacts.

## Build a Repeatable Benchmark

1. Pin the Kubernetes, mesh, proxy, CNI, kernel, and node versions.
2. Record the fully rendered proxy configuration and enabled telemetry.
3. Isolate the test from unrelated noisy neighbors or measure their effect.
4. Warm connections and caches, then run long enough for stable percentiles.
5. Repeat runs and report variation, not only the best result.
6. Test failure conditions: certificate rotation, endpoint churn, retries, and destination slowdown.
7. Re-run before mesh upgrades or large policy changes.

Publish results with their scope: “Istio version X, HTTP/2, mTLS, N connections, Y-byte messages, Z requests/s on node type A.” That statement can guide capacity. “Sidecars add 2 ms” cannot.

## Reduce Overhead Deliberately

- scope configuration so each proxy receives only what it needs;
- control access-log volume and trace sampling;
- avoid unbounded or high-cardinality telemetry;
- size requests and limits from measured peaks;
- keep proxy workers and concurrency aligned with CPU;
- exclude workloads that do not need mesh features after a security review;
- compare sidecar and non-sidecar data-plane modes supported by your mesh.

Measure reliability benefits alongside cost. Mutual TLS, policy, traffic control, and consistent telemetry may be worth the capacity—but only a workload-specific benchmark tells you the budget.

## Official Documentation

- [Istio: Performance and Scalability](https://istio.io/latest/docs/ops/deployment/performance-and-scalability/)
- [Istio: Installing the Sidecar](https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/)
- [Istio: Resource Annotations](https://istio.io/latest/docs/reference/config/annotations/)
- [Kubernetes: Resource Management for Pods and Containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Kubernetes: Horizontal Pod Autoscaling](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/)
