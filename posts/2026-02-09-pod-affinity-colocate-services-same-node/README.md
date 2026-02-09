# How to Use Pod Affinity to Co-Locate Related Services on the Same Node

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Scheduling, Performance

Description: Learn how to use pod affinity rules to co-locate related services on the same node for improved performance, reduced latency, and better resource utilization.

---

Pod affinity attracts pods to run near other pods, enabling co-location of related services that benefit from proximity. This reduces network latency, improves data locality, and can significantly boost performance for tightly coupled services. By strategically placing related components together, you can optimize communication patterns while maintaining orchestration flexibility.

This guide will show you how to implement pod affinity patterns to co-locate services effectively.

## Understanding Pod Affinity

Pod affinity schedules pods based on labels of existing pods rather than node characteristics. The scheduler finds nodes running pods that match your selector and places new pods on the same or nearby nodes. The topology key defines the level of proximity: hostname for same-node placement, zone for same-zone placement, etc.

Like other affinity types, pod affinity comes in required (hard) and preferred (soft) variants.

## Basic Same-Node Co-Location

Place a web application on the same node as its cache:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      affinity:
        podAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - redis-cache
            topologyKey: kubernetes.io/hostname
      containers:
      - name: web
        image: web-app:latest
```

Each web app pod runs on a node that has a redis-cache pod, minimizing cache access latency.

## Same-Zone Co-Location

Place services in the same availability zone without requiring the exact same node:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  replicas: 6
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      affinity:
        podAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - database
            topologyKey: topology.kubernetes.io/zone
      containers:
      - name: api
        image: api-server:latest
```

API servers run in the same zones as database pods, reducing cross-zone data transfer costs and latency.

## Preferred Affinity for Flexible Co-Location

Use preferred affinity when co-location is beneficial but not required:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: worker
spec:
  replicas: 10
  selector:
    matchLabels:
      app: worker
  template:
    metadata:
      labels:
        app: worker
    spec:
      affinity:
        podAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 80
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - message-queue
              topologyKey: kubernetes.io/hostname
      containers:
      - name: worker
        image: worker:latest
```

Workers preferentially co-locate with message queue pods but deploy elsewhere if needed, ensuring all replicas schedule successfully.

## Multi-Component Co-Location

Co-locate multiple related services together:

```yaml
# Deploy cache first
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cache
spec:
  replicas: 3
  selector:
    matchLabels:
      app: cache
      component: data-tier
  template:
    metadata:
      labels:
        app: cache
        component: data-tier
    spec:
      containers:
      - name: redis
        image: redis:7
---
# Deploy application with affinity to cache
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
        component: app-tier
    spec:
      affinity:
        podAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: component
                operator: In
                values:
                - data-tier
            topologyKey: kubernetes.io/hostname
      containers:
      - name: app
        image: app:latest
---
# Deploy sidecar with affinity to application
apiVersion: apps/v1
kind: Deployment
metadata:
  name: monitoring
spec:
  replicas: 3
  selector:
    matchLabels:
      app: monitoring
  template:
    metadata:
      labels:
        app: monitoring
    spec:
      affinity:
        podAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: component
                operator: In
                values:
                - app-tier
            topologyKey: kubernetes.io/hostname
      containers:
      - name: agent
        image: monitoring-agent:latest
```

This creates chains of co-location: cache → app → monitoring, all on the same nodes.

## Data Locality Patterns

Co-locate compute with data storage:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: data-processor
spec:
  template:
    spec:
      affinity:
        podAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - distributed-storage
            topologyKey: kubernetes.io/hostname
      containers:
      - name: processor
        image: data-processor:latest
        volumeMounts:
        - name: data
          mountPath: /data
      volumes:
      - name: data
        hostPath:
          path: /mnt/local-storage
```

Processing jobs run on nodes with local data, avoiding network transfer overhead.

## Weighted Multiple Affinities

Express preferences for different co-location scenarios:

```yaml
affinity:
  podAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
    # Strongly prefer running with cache
    - weight: 100
      podAffinityTerm:
        labelSelector:
          matchExpressions:
          - key: app
            operator: In
            values:
            - cache
        topologyKey: kubernetes.io/hostname

    # Moderately prefer same zone as database
    - weight: 50
      podAffinityTerm:
        labelSelector:
          matchExpressions:
          - key: app
            operator: In
            values:
            - database
        topologyKey: topology.kubernetes.io/zone

    # Slightly prefer running with other app instances
    - weight: 20
      podAffinityTerm:
        labelSelector:
          matchExpressions:
          - key: app
            operator: In
            values:
            - web
        topologyKey: kubernetes.io/hostname
```

The scheduler evaluates all preferences and chooses nodes with the highest combined score.

## Sidecar Pattern with Affinity

While sidecars usually share a pod, affinity can create loose coupling:

```yaml
# Main application
apiVersion: apps/v1
kind: Deployment
metadata:
  name: main-app
spec:
  replicas: 5
  selector:
    matchLabels:
      app: main
  template:
    metadata:
      labels:
        app: main
        service-id: backend-service
    spec:
      containers:
      - name: app
        image: app:latest
---
# Logging sidecar as separate deployment
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: log-collector
spec:
  selector:
    matchLabels:
      app: log-collector
  template:
    metadata:
      labels:
        app: log-collector
    spec:
      affinity:
        podAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: service-id
                  operator: Exists
              topologyKey: kubernetes.io/hostname
      containers:
      - name: collector
        image: log-collector:latest
```

Log collectors preferentially run on nodes with application pods.

## Avoiding Affinity Deadlocks

Be careful with circular affinities:

```yaml
# Service A requires Service B
affinity:
  podAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
    - labelSelector:
        matchExpressions:
        - key: app
          operator: In
          values:
          - service-b
      topologyKey: kubernetes.io/hostname

# Service B requires Service A (DEADLOCK!)
affinity:
  podAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
    - labelSelector:
        matchExpressions:
        - key: app
          operator: In
          values:
          - service-a
      topologyKey: kubernetes.io/hostname
```

This creates a chicken-and-egg problem where neither can schedule. Solution: make one affinity preferred instead of required.

## Combining Affinity and Anti-Affinity

Use both to control pod placement precisely:

```yaml
affinity:
  # Co-locate with cache
  podAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
    - labelSelector:
        matchExpressions:
        - key: app
          operator: In
          values:
          - cache
      topologyKey: kubernetes.io/hostname

  # But don't co-locate with other instances of self
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
    - weight: 80
      podAffinityTerm:
        labelSelector:
          matchExpressions:
          - key: app
            operator: In
            values:
            - web
        topologyKey: kubernetes.io/hostname
```

This runs web pods on cache nodes while spreading them across different cache nodes when possible.

## Namespace-Aware Affinity

Co-locate with pods in specific namespaces:

```yaml
affinity:
  podAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
    - labelSelector:
        matchExpressions:
        - key: app
          operator: In
          values:
          - shared-cache
      namespaces:
      - shared-services
      topologyKey: kubernetes.io/hostname
```

Pods co-locate with shared-cache pods from the shared-services namespace.

## Testing Affinity Rules

Verify co-location works as expected:

```bash
# Deploy dependent service first
kubectl apply -f cache-deployment.yaml
kubectl wait --for=condition=ready pod -l app=cache

# Deploy service with affinity
kubectl apply -f app-deployment.yaml

# Check co-location
kubectl get pods -o wide -l app=cache
kubectl get pods -o wide -l app=web

# Verify they share nodes
cache_nodes=$(kubectl get pods -l app=cache -o jsonpath='{.items[*].spec.nodeName}' | tr ' ' '\n' | sort -u)
app_nodes=$(kubectl get pods -l app=web -o jsonpath='{.items[*].spec.nodeName}' | tr ' ' '\n' | sort -u)

comm -12 <(echo "$cache_nodes") <(echo "$app_nodes")
```

## Performance Measurement

Measure latency improvements from co-location:

```bash
# Measure before co-location
kubectl exec -it app-pod -- curl -o /dev/null -s -w '%{time_total}\n' http://cache-service/

# Enable affinity and redeploy
kubectl apply -f app-with-affinity.yaml

# Measure after co-location
kubectl exec -it app-pod -- curl -o /dev/null -s -w '%{time_total}\n' http://cache-service/

# Compare results
```

## Best Practices

Deploy anchor services first before deploying services with affinity to them. This prevents scheduling delays while waiting for anchor pods.

Use preferred affinity for most co-location scenarios to maintain scheduling flexibility. Reserve required affinity for cases where co-location is absolutely necessary.

Consider network topology when choosing topology keys. Same-node co-location provides maximum performance but limits distribution. Same-zone co-location balances performance with availability.

Monitor actual pod placement to ensure affinity rules achieve intended co-location. Set up alerts for cases where required affinity prevents scheduling.

Avoid circular dependencies between services requiring affinity to each other. Use a hierarchical affinity model where base services have no affinity, and dependent services have affinity to base services.

## Conclusion

Pod affinity enables strategic co-location of related services to improve performance and reduce costs. By placing tightly coupled components together, you minimize network latency and maximize data locality.

Use required affinity when co-location is critical for functionality or performance. Use preferred affinity for optimization goals that improve performance without blocking deployment. Combine affinity with anti-affinity to create sophisticated placement patterns that balance performance, availability, and resource utilization.

Test affinity configurations thoroughly and measure actual performance improvements to validate that co-location delivers expected benefits.
