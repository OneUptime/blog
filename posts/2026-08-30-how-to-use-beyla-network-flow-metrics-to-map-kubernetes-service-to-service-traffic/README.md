# How to Map Kubernetes Service Traffic with Beyla Network Flows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, eBPF, Kubernetes, Network Flow, Prometheus

Description: Turn Beyla's Kubernetes-decorated network byte counter into a low-cardinality map of traffic between workload owners, namespaces, and services.

---

Beyla network observability records bytes between network endpoints and decorates those flows with Kubernetes identities. It is useful for discovering who communicates with whom even when applications do not expose HTTP or gRPC telemetry.

The result is a traffic map, not a distributed trace. A flow shows byte volume between endpoints; it does not identify a request, status code, route, or causal dependency.

## Enable the network pipeline and exporter

Run one Beyla instance per node and enable Kubernetes metadata:

```yaml
network:
  source: socket_filter

metrics:
  features: ["network"]

attributes:
  kubernetes:
    enable: true
  select:
    beyla_network_flow_bytes:
      include:
        - k8s.src.owner.name
        - k8s.src.namespace
        - k8s.dst.owner.name
        - k8s.dst.namespace
        - k8s.cluster.name

prometheus_export:
  port: 8999
  path: /metrics
```

Adding `network` to `metrics.features` enables the network metric pipeline, while `prometheus_export.port` opens the Prometheus scrape endpoint. The endpoint exposes the counter as `beyla_network_flow_bytes_total`; OTLP export names it `beyla.network.flow.bytes`.

The default `socket_filter` source works alongside CNIs such as Cilium that already attach Traffic Control programs. The alternative `tc` source uses TC ingress and egress filters and requires correct coordination with any other TC user.

## Supply Kubernetes RBAC and host access

Metadata decoration needs a ServiceAccount bound to a ClusterRole that grants `list` and `watch` for ReplicaSets, Pods, Services, and Nodes. Network collection should run as a DaemonSet with `hostNetwork: true` so each instance can see its node's traffic.

For the socket-filter source, Grafana documents `BPF` and `NET_RAW` as the core capabilities. TC collection additionally needs `BPF`, `NET_ADMIN`, and `PERFMON`. Use the complete current security matrix for any other enabled Beyla features rather than assuming that the network-only set also covers application instrumentation.

Set a stable cluster name when automatic cloud detection is unavailable:

```yaml
env:
  - name: BEYLA_KUBE_CLUSTER_NAME
    value: prod-eu-1
```

Without it, identically named namespaces and Deployments from multiple clusters can merge in the metrics backend.

## Aggregate by workload owner

The selected labels aggregate Pods to their Deployment, StatefulSet, DaemonSet, ReplicaSet, or standalone Pod owner. Query traffic rate as bytes per second:

```promql
sum by (
  k8s_cluster_name,
  k8s_src_namespace,
  k8s_src_owner_name,
  k8s_dst_namespace,
  k8s_dst_owner_name
) (
  rate(beyla_network_flow_bytes_total[5m])
)
```

For a single source workload:

```promql
sum by (
  k8s_cluster_name,
  k8s_dst_namespace,
  k8s_dst_owner_name
) (
  rate(beyla_network_flow_bytes_total{
    k8s_cluster_name="prod-eu-1",
    k8s_src_namespace="retail",
    k8s_src_owner_name="checkout"
  }[5m])
)
```

Use the resulting table as edge input, with cluster/namespace/owner composites as node IDs and byte rate as weight. If different workload kinds share a name, also select their owner-type attributes to keep IDs unique. A Grafana Node graph can render the result after transformation into an edge data frame with unique `id`, `source`, and `target` fields, while a regular table is often easier to audit.

## Keep cardinality bounded

Beyla intentionally defaults to owner and namespace attributes for Kubernetes flow metrics. Adding `src.address`, `dst.address`, `k8s.src.name`, or `k8s.dst.name` can create per-endpoint and per-rollout series; adding ephemeral `src.port` or `dst.port` values can create a series for every connection.

Use `cidrs` when external or non-Kubernetes destinations need meaningful aggregation:

```yaml
network:
  cidrs:
    - 10.0.0.0/8
    - 172.16.0.0/12
    - 0.0.0.0/0

attributes:
  select:
    beyla_network_flow_bytes:
      include:
        - k8s.src.owner.name
        - k8s.src.namespace
        - k8s.dst.owner.name
        - k8s.dst.namespace
        - k8s.cluster.name
        - dst.cidr
```

If an address matches multiple definitions, Beyla uses the narrowest CIDR. The `0.0.0.0/0` catch-all groups all otherwise-unmatched IPv4 traffic, not only external traffic; if every internal range is listed, it can serve as the external IPv4 bucket. Add `::/0` separately for IPv6.

## Interpret the map correctly

Several caveats prevent overclaiming:

- Byte volume is not request count. Large payloads dominate even when request frequency is low.
- UDP and TCP flows have different semantics. The `transport` attribute is hidden by default; select it before filtering or splitting on the Prometheus `transport` label, or restrict collection with `network.protocols`.
- A Service, proxy, NAT gateway, or service mesh can change the observed source or destination.
- Missing destination owner metadata can mean external traffic, incomplete RBAC/cache data, or a cross-node lookup constrained by `meta_restrict_local_node`.
- Packet sampling reduces collection volume but changes the observed data. Keep `network.sampling: 0` while establishing a baseline; sampled byte counts are not exact traffic totals or billing data.

Compare unexpected edges with NetworkPolicy, Service, and CNI state. Beyla observes traffic but does not prove that the traffic was authorized or successful at the application layer.

## Validate with a controlled call

Generate a known transfer from one Pod to one Service, then query a short interval:

```bash
kubectl -n retail exec deploy/frontend -- \
  curl -fsS http://checkout:8080/health
```

Confirm that a frontend-to-checkout owner edge increases; response bytes can also increase the reverse edge. If raw flows appear without Kubernetes labels, verify ServiceAccount RBAC and informer logs. If no flow appears, verify the DaemonSet runs on the source node, `hostNetwork` is enabled, the correct interface is observed, and the required capabilities are effective.

## Conclusion

Beyla's network byte counter can produce a durable Kubernetes traffic map when it is enriched and aggregated by workload owner. Enable network collection and export explicitly, grant metadata RBAC, keep labels low-cardinality, and interpret edges as observed byte flows rather than application requests or traces.

## Official Documentation

- [Beyla network metrics](https://grafana.com/docs/beyla/latest/network/)
- [Beyla network configuration reference](https://grafana.com/docs/beyla/latest/network/config/)
- [Configure Beyla Prometheus and OpenTelemetry data export](https://grafana.com/docs/beyla/latest/configure/export-data/)
- [Configure Beyla metric attributes](https://grafana.com/docs/beyla/latest/configure/metrics-traces-attributes/)
- [Beyla security and network capability scenarios](https://grafana.com/docs/beyla/latest/security/#example-scenarios)
