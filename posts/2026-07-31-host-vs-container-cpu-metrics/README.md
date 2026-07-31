# Why Host and Container CPU Metrics Disagree—and How to Compare Them Correctly

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Node Exporter, Kubernetes, CPU Metrics, cAdvisor, PromQL

Description: Compare host CPU-mode counters with cgroup-scoped container CPU usage using consistent units, labels, time windows, and denominators.

---

Host CPU and container CPU metrics answer different questions. Node Exporter reports how each logical CPU's time was classified by the kernel. Container monitoring reports CPU time charged to a cgroup. Their graphs can both be correct while showing different numbers.

Most apparent disagreements come from comparing unlike units:

- host utilization as a percentage of all logical CPUs;
- container usage as CPU-seconds per second, usually called cores;
- container usage as a percentage of one core; or
- container usage as a percentage of its configured CPU limit.

Choose the question and denominator before comparing values.

## Start With Counter Semantics

`node_cpu_seconds_total` is a counter labeled by logical `cpu` and kernel `mode`. A rate over five minutes has units:

```text
CPU-seconds / second
```

For one logical CPU, a rate near `1` means roughly one second of that CPU's time per wall-clock second. Summing rates across CPUs produces used cores.

`container_cpu_usage_seconds_total` is also cumulative CPU time. Its rate has the same core-like unit. A value of `2.4` means the selected cgroups consumed about 2.4 CPU-seconds per second during the range. It is not 2.4 percent.

Use `rate()` for dashboards and sustained alerts. It handles counter resets and smooths samples across the selected range. `irate()` emphasizes the last two samples and is generally noisier.

## Calculate Host CPU in Cores

Define “busy” first. This expression excludes both idle and I/O-wait time:

```promql
sum by (instance) (
  rate(node_cpu_seconds_total{
    job="node",
    mode!~"idle|iowait|guest|guest_nice"
  }[5m])
)
```

It returns busy logical CPU cores per host. The guest modes are excluded because Linux includes guest time in the corresponding user and nice counters; summing both would count that time twice. If your operating definition treats I/O wait as utilized time, remove only `iowait` from the exclusion while continuing to exclude `idle`, `guest`, and `guest_nice`. Document the choice: Linux notes that the `iowait` value is not reliable and does not simply mean a CPU was executing work.

Calculate observed logical CPU capacity:

```promql
count by (instance) (
  node_cpu_seconds_total{job="node",mode="idle"}
)
```

Then calculate host busy percentage:

```promql
100 *
sum by (instance) (
  rate(node_cpu_seconds_total{
    job="node",
    mode!~"idle|iowait|guest|guest_nice"
  }[5m])
)
/
count by (instance) (
  node_cpu_seconds_total{job="node",mode="idle"}
)
```

Do not average the per-mode counters before applying `rate()`. Rate counters first, then aggregate.

## Calculate Container CPU in Cores

For kubelet/cAdvisor metrics, select leaf application containers and aggregate them to the node:

```promql
sum by (node) (
  rate(container_cpu_usage_seconds_total{
    job="kubelet",
    container!="",
    container!="POD"
  }[5m])
)
```

This example assumes the scrape configuration adds a stable `node` label. Kubernetes metric labels and runtime-generated synthetic container names can vary by version and deployment. Inspect the series on your cluster and make sure the selector:

- includes each intended application container once;
- excludes the root cgroup;
- excludes Pod sandbox or infrastructure series; and
- does not include both a parent cgroup and all of its children.

Summing parent and child cgroups double-counts usage because cgroup accounting accumulates child CPU time into the hierarchy.

## Normalize Both Sides to the Same Node Identity

The default Node Exporter `instance` is commonly `node-address:9100`, while kubelet series may use a different address, port, or node name. Never join those strings by coincidence. Add a canonical node label during target relabeling:

```yaml
relabel_configs:
  - source_labels: [__meta_kubernetes_node_name]
    target_label: node
```

Apply the same identity to Node Exporter and kubelet targets. With that label, host busy percentage becomes:

```promql
100 *
sum by (node) (
  rate(node_cpu_seconds_total{
    job="node",
    mode!~"idle|iowait|guest|guest_nice"
  }[5m])
)
/
count by (node) (
  node_cpu_seconds_total{job="node",mode="idle"}
)
```

Container share of host logical capacity is:

```promql
100 *
sum by (node) (
  rate(container_cpu_usage_seconds_total{
    job="kubelet",
    container!="",
    container!="POD"
  }[5m])
)
/
count by (node) (
  node_cpu_seconds_total{job="node",mode="idle"}
)
```

Now both expressions use the same five-minute range, node identity, and host-capacity denominator.

## Expect a Real Gap

Even a correct comparison does not require container usage to equal host busy CPU.

Host accounting includes work outside the selected application containers:

- the kernel;
- kubelet and the container runtime;
- Node Exporter and monitoring agents;
- systemd services;
- host-network and storage helpers;
- processes in cgroups excluded by the query; and
- interrupt and soft-interrupt work, depending on the selected modes.

Container accounting is cgroup-scoped. Linux cgroup v2 `cpu.stat` accounts user and system time for processes in that cgroup and its descendants. It does not reproduce the host's complete per-mode classification. On cgroup v1, CPU accounting has its own units and batching behavior.

The difference:

```text
host busy cores - selected container cores
```

is therefore a diagnostic estimate, not an authoritative “Kubernetes overhead” metric. Small negative or positive differences can also arise from scrape timing, counter batching, CPU hotplug, differing selectors, and data arriving from different endpoints.

## Choose the Right Container Percentage

“Container CPU percent” has at least two useful denominators.

### Percent of one CPU

```promql
100 *
rate(container_cpu_usage_seconds_total{
  job="kubelet",
  namespace="payments",
  pod="api-7d9f",
  container="api"
}[5m])
```

A multithreaded container using two cores reports about 200%. That is valid when one CPU is the denominator.

### Percent of its CPU limit

```text
100 * used CPU cores / configured CPU limit in cores
```

Kubernetes CPU limits are absolute CPU quantities: `500m` is 0.5 CPU and `2` is two CPUs. Join usage to an authoritative resource-limit metric using stable namespace, Pod UID, and container identity. Do not divide by a request when the dashboard claims to show limit utilization, and define behavior for containers with no limit.

A container can remain below its limit and still be throttled transiently, or use less than its limit because the node lacks available CPU. Pair usage with cgroup throttling counters and host saturation when diagnosing performance.

## Account for Virtualization and CPU Modes

On virtual machines, `steal` represents time the hypervisor did not provide to the guest. Whether it belongs in “busy” depends on the operational question:

- exclude it when measuring CPU that guest workloads actually consumed;
- display it separately when diagnosing host contention; and
- do not attribute it to containers.

Likewise, guest modes, IRQ, softirq, and I/O wait do not map one-to-one to the cgroup usage total. Keep a mode breakdown next to the headline percentage:

```promql
sum by (instance, mode) (
  rate(node_cpu_seconds_total{job="node"}[5m])
)
```

## A Reliable Comparison Checklist

1. Confirm both inputs are cumulative counters.
2. Apply `rate()` over the same range.
3. Express both results in cores before converting to percentages.
4. Use a canonical node label rather than joining endpoint addresses.
5. Select leaf container cgroups exactly once.
6. State whether the host definition excludes I/O wait and steal.
7. State whether container percent uses one core, host capacity, request, or limit.
8. Compare the same population and time interval.
9. Treat the residual as diagnostic until its components are measured.

The numbers stop “disagreeing” once the units and accounting boundaries are explicit. What remains is usually meaningful system overhead, scheduling behavior, or a selector defect worth investigating.

## Official Documentation

- [Prometheus Node Exporter guide and `node_cpu_seconds_total` example](https://prometheus.io/docs/guides/node-exporter/)
- [Prometheus `rate()` function](https://prometheus.io/docs/prometheus/latest/querying/functions/#rate)
- [Linux kernel procfs CPU mode definitions](https://docs.kernel.org/filesystems/proc.html#miscellaneous-kernel-statistics-in-proc-stat)
- [Linux kernel cgroup v2 CPU accounting](https://docs.kernel.org/admin-guide/cgroup-v2.html#cpu)
- [Linux kernel cgroup v1 CPU accounting](https://docs.kernel.org/admin-guide/cgroup-v1/cpuacct.html)
- [Kubernetes resource requests, limits, and CPU units](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/#meaning-of-cpu)
- [Kubernetes metrics reference for `container_cpu_usage_seconds_total`](https://kubernetes.io/docs/reference/instrumentation/metrics/)
- [Kubernetes resource metrics pipeline](https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-metrics-pipeline/)
