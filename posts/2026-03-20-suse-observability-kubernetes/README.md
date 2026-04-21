# How to Use SUSE Observability for Kubernetes Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SUSE Observability, Kubernetes, Monitoring, Topology, Health, Metric, SUSE Rancher

Description: Learn how to use SUSE Observability to monitor Kubernetes cluster health, navigate topology maps, investigate incidents, and set up health monitors for workloads.

---

SUSE Observability provides a topology-aware view of your Kubernetes cluster - showing not just metrics, but the relationships between components and how changes propagate through your system.

---

## Key Concepts

| Concept | Description |
|---|---|
| Component | Any Kubernetes resource (Pod, Deployment, Service, Node) |
| Relation | A dependency or connection between components |
| Health state | CLEAR, DEVIATING, CRITICAL, or UNKNOWN for each component |
| Perspective | A tab in a view, such as Topology, Events, Metrics, or Traces |
| Monitor | A rule that calculates health state from metrics, events, logs, or topology |

---

## Navigating the Topology View

After logging in to SUSE Observability:

1. Open **Kubernetes** from the main menu
2. Select a Kubernetes resource view, such as **Clusters**, and choose your cluster
3. The topology map shows all components and their connections
4. Click any component to see its health, metrics, events, and related components

---

## Step 1: Explore Cluster Health

```ini
Topology Map Navigation:
  ┌────────────────────────────────────────┐
  │  Filter bar: cluster, namespace        │
  ├────────────────────────────────────────┤
  │                                        │
  │   [Node] ──> [Pod] ──> [Service]       │
  │              │                         │
  │              └──> [ConfigMap]          │
  │                                        │
  │   Health: CLEAR / DEVIATING / CRITICAL │
  └────────────────────────────────────────┘
```

Filter the topology by namespace to focus on a specific workload:

```text
Kubernetes → namespace filter: production
```

---

## Step 2: Investigate a Failing Component

When a component shows CRITICAL (red) health:

1. Click the component in the topology map
2. In the right panel details, review the health state and active monitors
3. Open the component metrics to view CPU, memory, and network graphs
4. Open the **Events** perspective to see Kubernetes events for this component
5. Use **Explore component** or the topology links to see which other components are affected

---

## Step 3: Use STQL for Topology Queries

SUSE Observability provides a query language (STQL) for searching topology:

```stql
# Find all pods in the production namespace with CRITICAL health

type = "pod"
  AND label = "namespace:production"
  AND healthstate = "CRITICAL"

# Find all unhealthy deployments
type = "deployment"
  AND healthstate IN ("DEVIATING", "CRITICAL")

# Find dependencies around a component named checkout
withNeighborsOf(direction = "both", components = (name = "checkout"), levels = "1")
```

In an Explore view or another view that supports advanced topology filters, enter STQL queries by switching the topology filter to STQL mode.

---

## Step 4: Set Up Health Monitors

Monitors calculate health state for components. Configure notifications separately to alert on CRITICAL or DEVIATING states:

```yaml
# monitor.yaml
nodes:
- _type: Monitor
  arguments:
    metric:
      query: "kubernetes_state_deployment_replicas_available"
      unit: "short"
      aliasTemplate: "Deployment replicas"
    comparator: "LTE"
    threshold: 0.0
    failureState: "DEVIATING"
    urnTemplate: "urn:kubernetes:/${cluster_name}:${namespace}:deployment/${deployment}"
    titleTemplate: "Deployment has no available replicas"
  description: "Monitor whether a deployment has available replicas."
  function: {{ get "urn:stackpack:kubernetes-v2:shared:monitor-function:threshold" }}
  identifier: urn:custom:monitor:deployment-has-available-replicas
  intervalSeconds: 30
  name: Deployment has available replicas
  remediationHint: "Check pods and rollout status for deployment {{ labels.deployment }}."
  status: "ENABLED"
  tags:
  - "deployments"
```

Apply the monitor with the SUSE Observability CLI:

```bash
sts monitor apply -f monitor.yaml
```

---

## Step 5: Monitor Node Health

```bash
# From the UI, navigate to:
# Kubernetes → Nodes

# Each node shows:
# - CPU and memory utilization
# - Running pods
# - Conditions (Ready, MemoryPressure, DiskPressure)
# - Recent events

# To check node-level health from the CLI:
kubectl get nodes -o wide

# Cross-reference with Observability by filtering:
# type = "node" AND healthstate = "DEVIATING"
```

---

## Step 6: Track Changes Over Time

SUSE Observability lets you time travel to topology snapshots and inspect events or configuration changes:

1. Use the timeline at the bottom of the UI
2. Select a custom topology time or telemetry interval
3. Open the **Events** perspective to review events for that topology snapshot
4. For Kubernetes deployments, use the change diff view to compare the current configuration with the previous one

This makes it easy to correlate a performance degradation with a specific deployment or configuration change.

---

## Step 7: Create a Custom View

Save a filtered topology view for your team:

```text
1. Apply filters: namespace = production, type = pod
2. Click "Save view as..." in the top navigation bar
3. Name the view: "Production Pods"
4. Add a description or identifier if needed
5. Share the view URL or star the view for quick access
```

---

## Useful Metric Queries

From the Metrics Explorer or custom metric bindings, use SUSE Observability metric names and PromQL patterns such as:

```text
# CPU usage by pod
sum(max_over_time(container_cpu_usage{cluster_name="${tags.cluster-name}", namespace="${tags.namespace}", pod_name="${name}"}[${__interval}])) by (cluster_name, namespace, pod_name) / 1000000000

# Container restarts by pod
max by (cluster_name, namespace, pod_name, container) (kubernetes_state_container_restarts{cluster_name="${tags.cluster-name}", namespace="${tags.namespace}", pod_name="${name}"})

# Number of unavailable replicas
max_over_time(kubernetes_state_deployment_replicas_unavailable{cluster_name="${tags.cluster-name}", namespace="${tags.namespace}", deployment="${name}"}[${__interval}])
```

---

## Best Practices

- Use topology filtering (by namespace or label) to create focused views for each team rather than asking everyone to start from the full cluster topology.
- Set up health monitors and notifications for critical workloads so your team is alerted before users notice issues.
- Use the timeline, events, and deployment change diff features to correlate incidents with recent deployments - this dramatically reduces mean time to identify the root cause.
