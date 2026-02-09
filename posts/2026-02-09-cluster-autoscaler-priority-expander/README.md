# How to Configure Cluster Autoscaler Priority Expander for Node Pool Selection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cluster Autoscaler, Node Management

Description: Configure Cluster Autoscaler priority expander to control which node pools are selected during scale-up events, optimizing cost and performance by preferring specific instance types or availability zones.

---

When Cluster Autoscaler needs to add nodes, it must choose which node group or pool to expand. The priority expander lets you influence this decision by assigning priorities to different node groups. This enables strategies like preferring spot instances over on-demand, choosing specific instance types, or directing workloads to particular availability zones.

Without a priority expander configured, Cluster Autoscaler uses the random expander by default, which selects node groups randomly. The priority expander gives you control over these decisions, letting you optimize for cost, performance, or other operational requirements.

## Understanding Priority Expander

The priority expander uses a ConfigMap that defines priority values for node groups. Higher priority groups are preferred during scale-up. You can match node groups using regular expressions, making it easy to apply priorities based on naming conventions.

When multiple node groups can satisfy pending pods, Cluster Autoscaler selects the highest priority group. If multiple groups have the same priority, it falls back to other selection criteria like cost or utilization.

## Basic Priority Expander Configuration

Create a ConfigMap defining node group priorities.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-autoscaler-priority-expander
  namespace: kube-system
data:
  priorities: |
    10:
      - .*-spot-.*
    5:
      - .*-on-demand-.*
    1:
      - .*-gpu-.*
```

This configuration prefers spot instance node groups (priority 10) over on-demand (priority 5), and uses GPU nodes only when necessary (priority 1).

Configure Cluster Autoscaler to use the priority expander.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cluster-autoscaler
  template:
    metadata:
      labels:
        app: cluster-autoscaler
    spec:
      serviceAccountName: cluster-autoscaler
      containers:
      - name: cluster-autoscaler
        image: k8s.gcr.io/autoscaling/cluster-autoscaler:v1.27.0
        command:
        - ./cluster-autoscaler
        - --v=4
        - --cloud-provider=aws
        - --expander=priority
        - --node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled,k8s.io/cluster-autoscaler/my-cluster
        volumeMounts:
        - name: priority-config
          mountPath: /etc/kubernetes/priority-expander
      volumes:
      - name: priority-config
        configMap:
          name: cluster-autoscaler-priority-expander
```

The --expander=priority flag enables the priority expander.

## Prioritizing Cost-Optimized Node Groups

Configure priorities to minimize cloud costs.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-autoscaler-priority-expander
  namespace: kube-system
data:
  priorities: |
    # Highest priority: Spot instances (cheapest)
    50:
      - .*-spot-.*
      - .*-preemptible-.*

    # Medium-high priority: ARM instances (cost-effective)
    40:
      - .*-arm64-.*
      - .*-graviton-.*

    # Medium priority: Standard on-demand instances
    30:
      - .*-standard-.*
      - .*-general-purpose-.*

    # Low priority: Memory-optimized (expensive)
    20:
      - .*-memory-optimized-.*

    # Lowest priority: Compute-optimized (expensive)
    10:
      - .*-compute-optimized-.*
```

This prioritizes cheaper instance types, using expensive specialized instances only when required by pod specifications.

## Availability Zone Preferences

Prefer specific availability zones for redundancy or latency reasons.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-autoscaler-priority-expander
  namespace: kube-system
data:
  priorities: |
    # Prefer zone A (primary)
    100:
      - .*-us-east-1a-.*

    # Secondary preference: zone B
    80:
      - .*-us-east-1b-.*

    # Tertiary preference: zone C
    60:
      - .*-us-east-1c-.*

    # Use other zones only if necessary
    10:
      - .*-us-east-1[def]-.*
```

This configuration balances workloads across zones while preferring primary zones.

## Instance Type Hierarchy

Define priorities based on instance type characteristics.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-autoscaler-priority-expander
  namespace: kube-system
data:
  priorities: |
    # Prefer current generation instances
    100:
      - .*-m6i\..*
      - .*-c6i\..*
      - .*-r6i\..*

    # Use previous generation as fallback
    50:
      - .*-m5\..*
      - .*-c5\..*
      - .*-r5\..*

    # Old generation instances (avoid)
    10:
      - .*-m4\..*
      - .*-c4\..*
```

This ensures workloads run on newer, more efficient instance types when possible.

## Workload-Specific Priorities

Combine priorities with node selectors for different workload types.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-autoscaler-priority-expander
  namespace: kube-system
data:
  priorities: |
    # GPU workloads
    100:
      - .*gpu-p3.*
      - .*gpu-p4.*

    # Memory-intensive workloads
    90:
      - .*memory-r6i.*
      - .*memory-x2i.*

    # Compute-intensive workloads
    80:
      - .*compute-c6i.*
      - .*compute-c6a.*

    # General purpose (default)
    50:
      - .*general-m6i.*
      - .*general-m5.*

    # Spot instances for non-critical
    40:
      - .*spot-.*

    # Fallback to any available
    1:
      - .*
```

Workloads with specific resource requirements get matched to appropriate instance types.

## Debugging Priority Expander Decisions

Monitor which node groups are selected during scale-up.

```bash
# Check Cluster Autoscaler logs for expander decisions
kubectl logs -n kube-system deployment/cluster-autoscaler | \
  grep -i "priority"

# View current node group configuration
kubectl get nodes -o json | \
  jq '.items[] | {name: .metadata.name, labels: .metadata.labels}'

# Check which node groups are being used
kubectl get nodes --show-labels | \
  grep -E 'spot|on-demand|gpu'

# Describe node to see instance type
kubectl describe node <node-name> | grep -i instance-type
```

Look for log messages about expander decisions to understand why specific node groups were chosen.

## Combining with Multiple Expanders

Use priority expander with fallback expanders.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  template:
    spec:
      containers:
      - name: cluster-autoscaler
        command:
        - ./cluster-autoscaler
        - --expander=priority,least-waste
        # If priority expander selects multiple groups,
        # least-waste expander chooses among them
```

This combines the deterministic priority logic with efficiency-based selection as a tiebreaker.

## Handling Node Group Updates

Update priorities without restarting Cluster Autoscaler.

```bash
# Edit the ConfigMap
kubectl edit configmap cluster-autoscaler-priority-expander -n kube-system

# Cluster Autoscaler watches the ConfigMap and reloads automatically
# Verify new configuration is picked up
kubectl logs -n kube-system deployment/cluster-autoscaler | tail -20
```

ConfigMap changes take effect within the autoscaler's polling interval without requiring pod restart.

## Priority Rules for Multi-Tenant Clusters

Separate node groups by team or environment.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-autoscaler-priority-expander
  namespace: kube-system
data:
  priorities: |
    # Production workloads get on-demand instances
    100:
      - prod-on-demand-.*

    # Development can use spot instances
    50:
      - dev-spot-.*
      - staging-spot-.*

    # Shared node pools (lowest priority)
    10:
      - shared-.*
```

This ensures production workloads get reliable instance types while development uses cheaper options.

## Best Practices

Use descriptive node group names that reflect their purpose, instance type, and characteristics. This makes regex patterns in the priority ConfigMap more maintainable.

Start with broad priority categories (spot vs on-demand, instance families) before fine-tuning specific instance types. This keeps the configuration simple and easier to understand.

Set a catch-all low priority rule for all node groups to ensure scaling can proceed even if specific high-priority groups are unavailable.

Monitor actual node group selection over time to validate that priorities match your intent. Adjust priorities based on observed patterns.

Document the rationale for specific priority values in comments or separate documentation. Future operators need context for why certain node groups are preferred.

## Common Patterns

For cost optimization, prioritize spot instances highest, followed by ARM instances, then standard on-demand, with specialized instance types as fallback.

For performance-critical workloads, prioritize current-generation instances highest, use previous generation as fallback, and avoid old instance types.

For multi-AZ deployments, set balanced priorities across zones to achieve even distribution while having primary zones for normal operations.

For hybrid workloads, create separate priority tiers for different workload classes, ensuring specialized resources are available when needed but not overused.

## Conclusion

The Cluster Autoscaler priority expander gives you fine-grained control over which node groups are selected during scale-up events. By configuring appropriate priorities based on cost, performance, availability, or other factors, you can optimize cluster resource allocation to meet your operational and business requirements.

Proper use of the priority expander helps reduce costs by preferring cheaper instance types, improves performance by directing workloads to appropriate hardware, and increases reliability by ensuring critical workloads get stable, on-demand capacity. Combined with monitoring and periodic adjustment, priority-based node selection creates efficient, cost-effective autoscaling strategies.
