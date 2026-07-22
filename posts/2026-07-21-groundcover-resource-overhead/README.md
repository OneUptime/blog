# How Much CPU and Memory Does Groundcover Add to a Kubernetes Cluster?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Groundcover, Kubernetes, eBPF, Performance

Description: Measure Groundcover CPU and memory overhead by separating per-node sensors, per-cluster collectors, and the optional in-environment backend.

---

There is no single CPU or memory number for a Groundcover deployment. The footprint depends on how many nodes are monitored, which components run in each cluster, where the backend runs, and how much telemetry the workloads produce. A useful estimate must separate those layers and then measure them under representative load.

Groundcover describes its sensor as having a minimal footprint, but that is a product description, not a capacity guarantee for your cluster. The current tuning documentation provides an example configuration for a large, high-throughput cluster and explicitly says that other clusters can require different settings. Use the documented values as configuration examples, not universal sizing targets.

## Separate the three footprints

Groundcover's architecture has several components with different scaling behavior.

### Per-node sensor

The eBPF sensor is a DaemonSet. Groundcover says one sensor pod runs on each eligible monitored node. This means the sensor portion grows with node count:

```text
total sensor usage
= eligible monitored nodes
* average measured usage per sensor pod
```

Groundcover's installation documentation describes the default coverage policy as excluding Fargate and control-plane nodes. Scheduling details can vary by chart version and overrides; affinity, node selectors, taints, and tolerations can change the eligible set, so count actual scheduled sensor pods rather than assuming every node is covered.

### Per-cluster services

The architecture also documents components such as `k8s-watcher`, Vector, metrics ingesters, custom-metrics collection, a VictoriaMetrics agent, and kube-state-metrics. These are not all one-per-node. Their usage is influenced by factors such as Kubernetes object count, log and trace flow, metric cardinality, and scrape configuration.

### Backend

ClickHouse, VictoriaMetrics, OpenTelemetry Collector, monitoring services, and related backend components can be deployed in a dedicated BYOC cluster or in an on-premises environment. If that backend shares the monitored cluster, include it in the cluster overhead. If it runs in a separate dedicated cluster, report its CPU and memory as observability-platform infrastructure rather than attributing it to every application cluster.

This distinction prevents a small sensor footprint from being presented as the total platform footprint.

## Requests are not measured usage

Kubernetes resource requests affect scheduling. The scheduler uses requests when deciding whether a pod fits on a node, even when its current CPU or memory use is lower. Limits constrain usage: CPU limits are enforced by throttling, while memory limits are enforced reactively and can result in OOM kills. Neither is a statement of normal consumption.

Record four measures for each Groundcover component:

- requested CPU
- requested memory
- observed CPU over time
- observed memory working set over time

Requested capacity describes the scheduling cost. Observed use describes runtime demand. Both matter. A pod that uses little CPU but reserves a large request can still reduce capacity available for applications.

Groundcover's CLI says it tunes resources according to cluster size during deployment. Capture the rendered requests and limits from the installed manifests because they can differ from documentation examples and from another cluster's values.

## Establish a representative baseline

Measure before and after installation using the same workload and comparable conditions:

1. Select a normal traffic window and a known peak window.
2. Record application throughput, latency, errors, node CPU, node memory, and scheduling headroom.
3. Install Groundcover with the intended protocols, log rules, metric scrapes, and backend topology.
4. Allow caches and storage components to reach normal operation.
5. Repeat the same workload windows.
6. Separate Groundcover namespace usage by component and node.
7. Compare application service levels as well as infrastructure usage.

`kubectl top` can provide a quick current view when Metrics Server is installed:

```bash
kubectl top pods -n groundcover --containers
kubectl top nodes
kubectl get pods -n groundcover -o wide
```

Kubernetes describes Metrics Server as a short-term, in-memory resource pipeline. For an overhead study, retain time-series container CPU and memory data in a full monitoring pipeline. A single `kubectl top` sample can miss spikes, restarts, compaction, and query bursts.

## Normalize the measurements

Raw cluster totals are difficult to compare. Calculate several ratios:

```text
sensor CPU per eligible node
= total sensor CPU / scheduled sensor pods

sensor memory per eligible node
= total sensor memory / scheduled sensor pods

cluster-services CPU per cluster
= non-sensor agent CPU / monitored clusters

backend CPU per ingest rate
= backend CPU / accepted telemetry rate
```

These are your measured values, not Groundcover guarantees. Report the observation window, software version, node architecture, kernel, enabled features, and load profile beside them.

CPU is usually best measured as a rate over a window rather than an instantaneous sample. Memory should include steady working set and high-water behavior. Track restarts and OOM kills, because an apparently low average can hide an undersized limit.

## Know what drives overhead

Test changes in the variables that can materially affect processing:

- eligible node count and node churn
- requests or transactions per second
- enabled eBPF protocols
- payload sizes and trace sampling policy
- log volume and parsing pipelines
- custom metric targets, active series, and churn
- Kubernetes object count and update rate
- dashboard and query concurrency
- retention, merge, and compaction activity
- object-storage offload behavior

Node count alone is not enough. Two clusters with the same nodes can have very different telemetry rates and cardinality.

## Measure application impact directly

An out-of-process sensor can still consume CPU cycles, memory, network bandwidth, and storage I/O on shared nodes. Measure the applications, not only the Groundcover pods.

Compare:

- request latency distributions
- application CPU and memory
- CPU throttling
- node pressure and evictions
- network throughput and drops
- disk latency on nodes and backend volumes
- pending pods and allocatable headroom

Use a controlled canary cluster or node pool when possible. If application performance changes, correlate it with sensor and backend activity before adjusting limits.

## Tune by component

Groundcover exposes Helm values for sensor, watcher, portal, ClickHouse, OpenTelemetry Collector, metrics ingester, VictoriaMetrics, and custom-metrics resources. Change one component at a time based on evidence.

Common levers include:

- adjusting requests to match stable observed demand plus planned headroom
- setting limits high enough for legitimate peaks while protecting applications
- filtering Kubernetes entities that do not need tracing
- dropping unnecessary logs before storage
- rate-limiting stored eBPF traces where appropriate
- controlling custom-metric cardinality and scrape scope
- placing the backend on a dedicated node pool or cluster
- sizing persistent volumes and retention separately from CPU and memory

Reducing a sensor's CPU limit can create throttling rather than reduce required work. Reducing a database memory limit can increase I/O or cause OOM restarts. Validate telemetry completeness and query performance after every change.

## Build a capacity budget

For planning, use a simple model:

```text
observability CPU request
= (eligible monitored nodes * sensor CPU request per pod)
+ total per-cluster component CPU requests
+ total backend CPU requests in this cluster

observability memory request
= (eligible monitored nodes * sensor memory request per pod)
+ total per-cluster component memory requests
+ total backend memory requests in this cluster
```

Keep storage capacity as a separate budget. ClickHouse stores logs, traces, and Kubernetes events, while VictoriaMetrics stores metrics. Retention and data rate can grow storage without changing the sensor's scheduled memory request.

The honest answer to "how much overhead?" is a range measured for your topology and workload. Publish both scheduled requests and observed use, distinguish monitored-cluster agents from the backend, and repeat the test after major version, feature, traffic, or retention changes.

## Official documentation

- [Groundcover architecture overview](https://docs.groundcover.com/architecture/overview)
- [Groundcover tuning resources](https://docs.groundcover.com/customization/customize-usage/tuning-resources)
- [Groundcover sensor deployment coverage](https://docs.groundcover.com/customization/customize-deployment/configuring-sensor-deployment-coverage)
- [Groundcover Kubernetes installation](https://docs.groundcover.com/getting-started/installation-and-updating/connect-kubernetes-cluster)
- [Kubernetes resource management](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Kubernetes resource monitoring tools](https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-usage-monitoring/)
