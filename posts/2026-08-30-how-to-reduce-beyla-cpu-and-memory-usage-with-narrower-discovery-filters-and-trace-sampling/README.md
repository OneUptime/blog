# How to Reduce Beyla CPU and Memory Usage with Narrower Discovery, Filters, and Trace Sampling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, eBPF, Performance, Sampling, Service Discovery

Description: Reduce Grafana Beyla overhead systematically by instrumenting fewer processes and protocols, dropping noise early, limiting metadata, and sampling traces at the source.

---

Beyla's cost has several components: process discovery, eBPF probes and maps, event processing, Kubernetes informer caches, metric aggregation, and trace export. Increasing a container limit may stop an OOM restart, but it does not remove unnecessary work.

Tune from the earliest stage to the latest: discover less, collect fewer protocols, filter noise, reduce metadata, then sample traces. Measure after each change so a lower ingest bill is not mistaken for lower node CPU.

## Establish a baseline

Measure the Beyla container with kubelet/cAdvisor metrics such as `container_cpu_usage_seconds_total` and `container_memory_working_set_bytes`. When Beyla runs inside Alloy, Alloy also exposes child-process metrics with `subprocess="beyla"`; Alloy's own process metric without that label is not total container usage.

Record at least:

- discovered and instrumented process count per node;
- request/event rate by protocol;
- trace export rate and dropped/retried items;
- Beyla and container CPU/memory during normal and peak traffic;
- Kubernetes API activity if metadata decoration is enabled.

Compare nodes with similar workloads. A single noisy node often identifies an overly broad match faster than a cluster average.

## Narrow discovery first

Prefer an opt-in label plus namespace rather than all ports or all executables:

```yaml
discovery:
  min_process_age: 10s
  instrument:
    - k8s_namespace: "production"
      k8s_pod_labels:
        observability.example.com/beyla: "enabled"
  exclude_instrument:
    - k8s_pod_labels:
        observability.example.com/beyla: "disabled"
```

Fields in one entry are AND conditions. `min_process_age` skips short-lived processes that would otherwise be inspected and disappear almost immediately. Keep Beyla's built-in exclusions for itself, Alloy, OpenTelemetry Collector, and common system namespaces.

Use survey mode before expanding a selector. It reports discovered targets without attaching instrumentation and makes the expected process count reviewable.

## Collect only required protocols and signals

If the service SLO covers HTTP and gRPC, do not enable every database, messaging, DNS, GPU, and payload detector:

```yaml
otel_metrics_export:
  endpoint: http://alloy.observability.svc.cluster.local:4318/v1/metrics
  protocol: http/protobuf
  features: ["application"]
  instrumentations: ["http", "grpc"]

otel_traces_export:
  endpoint: http://alloy.observability.svc.cluster.local:4318/v1/traces
  protocol: http/protobuf
  instrumentations: ["http", "grpc"]
```

Do not enable header or payload extraction without a use case. Beyla keeps auxiliary protocol buffers at zero by default for several enrichment paths, and larger buffers increase work while potentially capturing sensitive data.

Process metrics, span metrics, service-graph metrics, network flows, and inter-zone metrics are separate features. Each should have an owner and a dashboard or alert that consumes it.

## Drop predictable noise at the source

Route filtering prevents low-value HTTP events from moving through the rest of the pipeline:

```yaml
routes:
  ignored_patterns:
    - /healthz
    - /ready
    - /metrics
  ignore_mode: all
  unmatched: low-cardinality
```

For attribute-based filtering across application telemetry, use the standalone singular `filter` section:

```yaml
filter:
  application:
    url.path:
      not_match: "{/healthz,/ready,/metrics}"
```

Filters reduce processing and export after instrumentation; they do not eliminate the probe attachment cost. Discovery remains the highest-leverage boundary.

## Sample traces with parent-aware decisions

Metrics normally need complete counts, while traces can be sampled. Use a parent-based ratio so downstream services follow an upstream sampling decision:

```yaml
otel_traces_export:
  endpoint: http://alloy.observability.svc.cluster.local:4318/v1/traces
  protocol: http/protobuf
  sampler:
    name: parentbased_traceidratio
    arg: "0.10"
```

This keeps approximately ten percent of new root traces while respecting a parent. Validate that propagated `traceparent` flags and SDK sampling policies agree; independent head sampling at each service creates partial traces.

Sampling primarily reduces trace processing, network, and backend ingest. It does not stop Beyla from observing the request needed to generate complete RED metrics.

## Reduce Kubernetes and network state carefully

On very large clusters, localize the metadata cache:

```yaml
attributes:
  kubernetes:
    enable: true
    meta_restrict_local_node: true
    disable_informers: ["service"]
```

This saves memory and API activity but can remove cross-node destination or Service metadata. Verify every dashboard that depends on those attributes.

If network metrics are enabled, restrict interfaces, protocols, and CIDRs to the real use case. `network.sampling` can reduce packet-event volume, but sampled byte metrics need careful interpretation. Do not enable network collection at all when only application RED telemetry is required.

## Review the result, not just the limit

After each change, compare a representative peak window. Confirm that CPU and memory fell, required RED series still increment, distributed traces remain connected, and metadata required by alerts is still present. Then right-size requests and limits with headroom for rollouts and traffic bursts.

An OOM kill after aggressive memory limiting is not a performance improvement. Likewise, a dramatic backend ingest reduction caused by accidentally excluding an application is not a successful optimization.

## Conclusion

Reduce Beyla overhead from the front of the pipeline: precise opt-in discovery, a small protocol and feature set, source filters for known noise, parent-aware trace sampling, and only the Kubernetes/network metadata needed. Measure node and child-process usage before and after every change, then set resource limits from observed peaks.

## Official Documentation

- [Configure Beyla service discovery](https://grafana.com/docs/beyla/latest/configure/service-discovery/)
- [Filter Beyla metrics and traces](https://grafana.com/docs/beyla/latest/configure/filter-metrics-traces/)
- [Configure Beyla trace sampling](https://grafana.com/docs/beyla/latest/configure/sample-traces/)
- [Configure Beyla export features and instrumentations](https://grafana.com/docs/beyla/latest/configure/export-data/)
- [Configure Beyla Kubernetes metadata](https://grafana.com/docs/beyla/latest/configure/metrics-traces-attributes/#kubernetes-decorator)
- [Grafana Alloy `beyla.ebpf` resource metrics](https://grafana.com/docs/alloy/latest/reference/components/beyla/beyla.ebpf/#resource-metrics)
