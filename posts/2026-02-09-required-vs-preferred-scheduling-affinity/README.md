# How to Use requiredDuringScheduling vs preferredDuringScheduling Affinity Rules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Scheduling, Configuration

Description: Learn the differences between required and preferred affinity rules in Kubernetes and how to use them effectively for flexible pod placement strategies.

---

Kubernetes affinity rules come in two flavors: required (hard constraints) and preferred (soft preferences). Understanding when to use each type is crucial for building resilient scheduling policies that balance strict requirements with flexibility. Required rules block scheduling when constraints cannot be met, while preferred rules express preferences that the scheduler tries to honor without preventing pod deployment.

This guide will show you how to use both types of affinity rules effectively and when to choose one over the other.

## Understanding Required Affinity

Required affinity uses `requiredDuringSchedulingIgnoredDuringExecution`. This enforces hard constraints that must be satisfied for scheduling to occur. If no nodes match the requirements, pods remain in Pending state indefinitely.

Basic required affinity example:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: required-affinity-pod
spec:
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: disktype
            operator: In
            values:
            - ssd
  containers:
  - name: nginx
    image: nginx
```

This pod will never schedule on nodes without `disktype=ssd` label. The scheduler skips non-matching nodes during filtering.

## Understanding Preferred Affinity

Preferred affinity uses `preferredDuringSchedulingIgnoredDuringExecution`. This expresses preferences that influence scoring but don't prevent scheduling. Each preference has a weight (1-100) indicating relative importance.

Basic preferred affinity example:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: preferred-affinity-pod
spec:
  affinity:
    nodeAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 80
        preference:
          matchExpressions:
          - key: disktype
            operator: In
            values:
            - ssd
  containers:
  - name: nginx
    image: nginx
```

This pod prefers SSD nodes but will schedule on non-SSD nodes if necessary. Nodes with `disktype=ssd` receive +80 points during scoring.

## When to Use Required Affinity

Use required affinity for technical or compliance requirements that must be met:

### Security and Compliance

```yaml
# PCI-DSS compliant workloads must run on compliant nodes
affinity:
  nodeAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
      nodeSelectorTerms:
      - matchExpressions:
        - key: compliance.company.com/pci-dss
          operator: In
          values:
          - "true"
```

### Hardware Requirements

```yaml
# GPU workload requires actual GPU hardware
affinity:
  nodeAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
      nodeSelectorTerms:
      - matchExpressions:
        - key: accelerator
          operator: Exists
```

### Data Residency

```yaml
# GDPR requirements: data must stay in EU
affinity:
  nodeAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
      nodeSelectorTerms:
      - matchExpressions:
        - key: topology.kubernetes.io/region
          operator: In
          values:
          - eu-west-1
          - eu-central-1
          - eu-north-1
```

## When to Use Preferred Affinity

Use preferred affinity for optimization goals that improve performance or cost but aren't mandatory:

### Cost Optimization

```yaml
# Prefer cheaper spot instances but use on-demand if needed
affinity:
  nodeAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
    - weight: 50
      preference:
        matchExpressions:
        - key: node.kubernetes.io/instance-type
          operator: In
          values:
          - spot
          - preemptible
```

### Performance Optimization

```yaml
# Prefer SSD for better performance
affinity:
  nodeAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
    - weight: 70
      preference:
        matchExpressions:
        - key: disktype
          operator: In
          values:
          - ssd
          - nvme
```

### Locality Preferences

```yaml
# Prefer nodes in same AZ as data
affinity:
  nodeAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
    - weight: 60
      preference:
        matchExpressions:
        - key: topology.kubernetes.io/zone
          operator: In
          values:
          - us-west-2a
```

## Combining Required and Preferred

Use both types together for nuanced scheduling policies:

```yaml
affinity:
  nodeAffinity:
    # MUST be in production environment
    requiredDuringSchedulingIgnoredDuringExecution:
      nodeSelectorTerms:
      - matchExpressions:
        - key: environment
          operator: In
          values:
          - production

    # PREFER high-performance nodes
    preferredDuringSchedulingIgnoredDuringExecution:
    - weight: 80
      preference:
        matchExpressions:
        - key: node-class
          operator: In
          values:
          - high-cpu
          - high-memory
    # Also PREFER local SSD
    - weight: 60
      preference:
        matchExpressions:
        - key: disktype
          operator: In
          values:
          - local-ssd
```

This ensures production placement while optimizing for performance when possible.

## Weight Tuning in Preferred Affinity

Weights (1-100) control relative importance of preferences:

```yaml
preferredDuringSchedulingIgnoredDuringExecution:
# Strongly prefer GPU nodes (critical for performance)
- weight: 100
  preference:
    matchExpressions:
    - key: accelerator
      operator: Exists

# Moderately prefer SSD (helpful but not critical)
- weight: 50
  preference:
    matchExpressions:
    - key: disktype
      operator: In
      values:
      - ssd

# Slightly prefer newer nodes (minor optimization)
- weight: 20
  preference:
    matchExpressions:
    - key: node-age-days
      operator: Lt
      values:
      - "30"
```

The scheduler adds weighted preference scores to each node's total score. Higher weights have more influence on the final placement decision.

## Pod Affinity with Required Rules

Required pod affinity forces co-location or anti-location:

```yaml
# Backend MUST run on same node as cache
affinity:
  podAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
    - labelSelector:
        matchExpressions:
        - key: app
          operator: In
          values:
          - cache
      topologyKey: kubernetes.io/hostname
```

If no nodes have cache pods, backend pods remain pending.

## Pod Anti-Affinity with Required Rules

Ensure pods never co-locate:

```yaml
# Database replicas MUST be on different nodes
affinity:
  podAntiAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
    - labelSelector:
        matchExpressions:
        - key: app
          operator: In
          values:
          - database
      topologyKey: kubernetes.io/hostname
```

This prevents scheduling if all nodes already have database pods.

## Pod Affinity with Preferred Rules

Encourage but don't require co-location:

```yaml
# Prefer to run near monitoring agent
affinity:
  podAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
    - weight: 70
      podAffinityTerm:
        labelSelector:
          matchExpressions:
          - key: app
            operator: In
            values:
            - monitoring-agent
        topologyKey: kubernetes.io/hostname
```

Pods preferentially schedule near monitoring agents but deploy elsewhere if needed.

## Fallback Strategies

Create fallback options using multiple nodeSelectorTerms:

```yaml
requiredDuringSchedulingIgnoredDuringExecution:
  nodeSelectorTerms:
  # Primary: High-performance nodes in us-west-2a
  - matchExpressions:
    - key: topology.kubernetes.io/zone
      operator: In
      values:
      - us-west-2a
    - key: node-class
      operator: In
      values:
      - high-performance

  # Fallback: Standard nodes in us-west-2b
  - matchExpressions:
    - key: topology.kubernetes.io/zone
      operator: In
      values:
      - us-west-2b
    - key: node-class
      operator: In
      values:
      - standard
```

The scheduler accepts nodes matching either term, providing graceful degradation.

## Handling Scheduling Failures

When required affinity prevents scheduling:

```bash
# Check pod status
kubectl describe pod POD_NAME

# Common event messages:
# "0/10 nodes are available: 10 node(s) didn't match node selector."
# "0/10 nodes are available: 10 node(s) didn't match pod affinity rules."

# Verify nodes with required labels exist
kubectl get nodes -l disktype=ssd

# Check if affinity rules are too strict
kubectl get pod POD_NAME -o yaml | yq '.spec.affinity'

# Temporarily relax to preferred for testing
kubectl patch deployment DEPLOY_NAME --type=json -p='[
  {
    "op": "replace",
    "path": "/spec/template/spec/affinity/nodeAffinity/requiredDuringSchedulingIgnoredDuringExecution",
    "value": null
  }
]'
```

## Migration Strategies

Gradually transition from required to preferred:

```yaml
# Phase 1: Start with required affinity
requiredDuringSchedulingIgnoredDuringExecution:
  nodeSelectorTerms:
  - matchExpressions:
    - key: new-node-pool
      operator: In
      values:
      - "true"

# Phase 2: Mix of required and preferred
requiredDuringSchedulingIgnoredDuringExecution:
  nodeSelectorTerms:
  - matchExpressions:
    - key: new-node-pool
      operator: In
      values:
      - "true"
  # Add fallback
  - matchExpressions:
    - key: old-node-pool
      operator: In
      values:
      - "true"

preferredDuringSchedulingIgnoredDuringExecution:
- weight: 100
  preference:
    matchExpressions:
    - key: new-node-pool
      operator: In
      values:
      - "true"

# Phase 3: Fully preferred
preferredDuringSchedulingIgnoredDuringExecution:
- weight: 100
  preference:
    matchExpressions:
    - key: new-node-pool
      operator: In
      values:
      - "true"
```

## Best Practices

Use required affinity sparingly for true hard requirements. Overuse leads to scheduling failures and operational complexity. Most use cases work better with preferred affinity.

Start with preferred affinity and only add required rules when you have specific compliance, security, or technical requirements that justify potentially blocking scheduling.

When using required rules, always ensure sufficient nodes match the requirements. Monitor pending pods and set up alerts for scheduling failures.

Use meaningful weights in preferred affinity. Don't set everything to 100 - use the full range to express relative priorities. Common pattern: critical optimizations get 80-100, nice-to-have preferences get 20-40.

Test affinity rules in non-production environments first. Verify they behave as expected under various conditions including node failures and scale-up scenarios.

## Conclusion

Required and preferred affinity rules provide different tools for controlling pod placement. Required rules enforce hard constraints for compliance and technical requirements but can prevent scheduling. Preferred rules express optimization goals that improve placement without blocking deployment.

Choose required affinity only when you have true hard requirements that must never be violated. Use preferred affinity for optimization goals, cost reduction, and performance improvements. Combine both types to create flexible scheduling policies that balance requirements with pragmatism.

Understanding the tradeoffs helps you build resilient scheduling configurations that meet your needs without creating operational problems.
