# How to Tune Topology Spread Constraints with labelSelector and matchLabelKeys

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Scheduling, High-Availability

Description: Learn how to use labelSelector and matchLabelKeys in topology spread constraints to achieve fine-grained control over pod distribution across failure domains.

---

Topology spread constraints distribute pods across failure domains like zones, regions, or nodes to improve reliability. The labelSelector and matchLabelKeys fields give you precise control over which pods participate in spread calculations and how they're grouped. Proper configuration ensures balanced distribution while allowing flexibility for different workload patterns.

This guide will show you how to use these fields effectively to optimize pod placement across your infrastructure topology.

## Understanding labelSelector

The labelSelector field determines which pods count toward spread calculations. Only pods matching the selector are considered when calculating skew between topology domains. This allows you to create separate spread groups for different applications or versions.

Without labelSelector, the constraint only applies to the pod being scheduled, not considering existing pods. With labelSelector, you can ensure even distribution across your entire application fleet.

## Basic Topology Spread with labelSelector

Spread pods evenly across availability zones:

```yaml
# deployment-with-spread.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 9
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
        version: v1
    spec:
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: web
      containers:
      - name: nginx
        image: nginx:latest
```

This ensures web app pods distribute evenly across zones. With 9 replicas and 3 zones, each zone gets 3 pods. The labelSelector includes all pods with `app: web` in the calculation.

## Using matchExpressions for Complex Selectors

Create more sophisticated pod selection logic:

```yaml
topologySpreadConstraints:
- maxSkew: 2
  topologyKey: topology.kubernetes.io/zone
  whenUnsatisfiable: DoNotSchedule
  labelSelector:
    matchExpressions:
    - key: app
      operator: In
      values:
      - web
      - api
    - key: environment
      operator: In
      values:
      - production
```

This spreads production web and API pods together across zones, treating them as a single group for distribution purposes.

## Understanding matchLabelKeys

The matchLabelKeys field (introduced in Kubernetes 1.25) automatically includes pod labels in the selector without explicitly listing them. This is particularly useful for rolling updates where you want to spread pods of the same version together.

matchLabelKeys takes label keys from the pod being scheduled and adds them to labelSelector. This creates dynamic grouping based on the incoming pod's labels.

## Using matchLabelKeys for Version-Aware Spreading

Spread each version independently during rolling updates:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  replicas: 12
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
        version: v2
    spec:
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: api
        matchLabelKeys:
        - version
      containers:
      - name: api
        image: api:v2
```

During a rolling update, new v2 pods spread evenly across zones separately from v1 pods. The matchLabelKeys automatically adds `version: v2` to the selector for v2 pods, so they only count against each other.

## Combining Multiple Constraints

Apply different spreading rules for different topology levels:

```yaml
topologySpreadConstraints:
# Spread across zones
- maxSkew: 1
  topologyKey: topology.kubernetes.io/zone
  whenUnsatisfiable: DoNotSchedule
  labelSelector:
    matchLabels:
      app: database
  matchLabelKeys:
  - version

# Spread across nodes within zones
- maxSkew: 2
  topologyKey: kubernetes.io/hostname
  whenUnsatisfiable: ScheduleAnyway
  labelSelector:
    matchLabels:
      app: database
  matchLabelKeys:
  - version
```

This creates a two-level distribution: strict spreading across zones, with softer spreading across nodes within each zone.

## Spreading by Pod Template Hash

Use pod-template-hash for fine-grained ReplicaSet distribution:

```yaml
topologySpreadConstraints:
- maxSkew: 1
  topologyKey: topology.kubernetes.io/zone
  whenUnsatisfiable: ScheduleAnyway
  labelSelector:
    matchLabels:
      app: frontend
  matchLabelKeys:
  - pod-template-hash
```

The pod-template-hash label is automatically added by Deployments to distinguish ReplicaSets. This ensures pods from each ReplicaSet spread independently during rolling updates.

## Excluding Certain Labels from Matching

Create spread groups that ignore specific label variations:

```yaml
topologySpreadConstraints:
- maxSkew: 2
  topologyKey: topology.kubernetes.io/zone
  whenUnsatisfiable: DoNotSchedule
  labelSelector:
    matchLabels:
      app: worker
      tier: backend
  # Don't include build-id in matching
  # All builds spread together
```

Only include labels in matchLabels or matchLabelKeys that should affect grouping. Exclude labels like build-id, timestamp, or user that shouldn't create separate spread groups.

## Spreading StatefulSets with Ordinal Awareness

StatefulSets can benefit from topology spreading while maintaining their ordered nature:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database
spec:
  replicas: 6
  selector:
    matchLabels:
      app: db
  serviceName: database
  template:
    metadata:
      labels:
        app: db
    spec:
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: db
      containers:
      - name: postgres
        image: postgres:14
```

StatefulSet pods spread evenly across zones while maintaining their ordinal identity (db-0, db-1, etc.).

## Handling Node Selector with Spread Constraints

Combine node selection with spreading:

```yaml
spec:
  nodeSelector:
    node-type: compute-optimized
  topologySpreadConstraints:
  - maxSkew: 1
    topologyKey: topology.kubernetes.io/zone
    whenUnsatisfiable: DoNotSchedule
    labelSelector:
      matchLabels:
        app: compute-job
  containers:
  - name: worker
    image: worker:latest
```

Pods first filter to compute-optimized nodes, then spread evenly across zones within that subset.

## Debugging Spread Constraint Issues

Check why pods aren't spreading as expected:

```bash
# View pod distribution across zones
kubectl get pods -l app=web -o wide | awk '{print $7}' | sort | uniq -c

# Check pod events for spread constraint violations
kubectl describe pod POD_NAME | grep -A10 Events

# View detailed scheduling decisions
kubectl get events --field-selector involvedObject.name=POD_NAME

# Check nodes in each zone
kubectl get nodes -L topology.kubernetes.io/zone
```

Common issues include:
- maxSkew too strict for available resources
- labelSelector not matching intended pods
- Insufficient nodes in topology domains
- Resource constraints preventing even distribution

## Testing Spread Configurations

Validate your spread constraints work correctly:

```bash
# Deploy test workload
kubectl apply -f deployment-with-spread.yaml

# Wait for all pods to schedule
kubectl wait --for=condition=ready pod -l app=web --timeout=300s

# Check distribution
kubectl get pods -l app=web \
  -o custom-columns=NAME:.metadata.name,NODE:.spec.nodeName,ZONE:.spec.nodeSelector

# Calculate skew
kubectl get pods -l app=web -o json | \
  jq -r '.items[].spec.nodeName' | sort | uniq -c
```

## Best Practices

Start with lenient maxSkew values and tighten gradually based on observed behavior. Use whenUnsatisfiable: ScheduleAnyway for non-critical spreading to avoid scheduling failures. Combine with pod disruption budgets to maintain spreading during node maintenance.

Use matchLabelKeys for rolling updates to spread new and old versions independently. Keep labelSelector focused on labels that define your spread groups. Avoid including volatile labels that change frequently.

Test spread configurations in staging before production deployment. Monitor pod distribution and adjust constraints based on actual failure domain characteristics. Document the intended spreading behavior and rationale.

## Conclusion

Topology spread constraints with labelSelector and matchLabelKeys provide powerful controls for distributing pods across your infrastructure. By carefully selecting which pods count toward spread calculations and how they're grouped, you can achieve optimal placement for reliability while maintaining deployment flexibility.

Start with simple spread constraints and add complexity as needed. Use matchLabelKeys for version-aware spreading during updates. Combine multiple constraints to control distribution at different topology levels. Test thoroughly to ensure constraints behave as intended across different scenarios.
