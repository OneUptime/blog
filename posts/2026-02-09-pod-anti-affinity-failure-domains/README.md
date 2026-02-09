# How to Configure Kubernetes Pod Anti-Affinity to Spread Replicas Across Failure Domains

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Pod Anti-Affinity, High Availability, Failure Domains

Description: Configure pod anti-affinity rules that distribute application replicas across nodes, zones, and other failure domains to ensure high availability and resilience to infrastructure failures.

---

Running multiple replicas provides redundancy, but if all replicas run on the same node, a single node failure takes down your entire application. Pod anti-affinity rules prevent this by forcing Kubernetes to distribute replicas across different failure domains like nodes, availability zones, or racks. This transforms replicas from theoretical redundancy into actual fault tolerance.

The challenge is balancing distribution requirements with scheduling flexibility. Strict anti-affinity rules can prevent pods from scheduling when insufficient resources exist across domains. Relaxed rules allow better resource utilization but reduce failure protection. The key is choosing appropriate anti-affinity strategies that match your availability requirements.

Understanding the different types of anti-affinity and when to use each enables building truly resilient applications.

## Required vs Preferred Anti-Affinity

Anti-affinity rules come in two types: required and preferred. Required rules are hard constraints that must be satisfied. Preferred rules are soft preferences that the scheduler tries to honor but can violate.

Required anti-affinity for critical services:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: payment
  template:
    metadata:
      labels:
        app: payment
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - payment
            topologyKey: kubernetes.io/hostname
      containers:
      - name: payment
        image: payment:v1.0.0
```

This ensures no two payment pods ever run on the same node. If only two nodes are available, the third pod remains pending rather than violating the constraint.

Preferred anti-affinity for flexibility:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-service
spec:
  replicas: 5
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - web
              topologyKey: kubernetes.io/hostname
      containers:
      - name: web
        image: web:v1.0.0
```

The scheduler tries to spread pods but allows co-location when necessary. This prevents scheduling deadlocks while still improving distribution.

## Zone-Level Anti-Affinity

Distribute pods across availability zones for zone-level fault tolerance:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
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
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - api
            topologyKey: topology.kubernetes.io/zone
      containers:
      - name: api
        image: api:v1.0.0
```

With three availability zones, this places two pods per zone. Zone failure affects only one-third of capacity.

Combine node and zone anti-affinity:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database
spec:
  replicas: 3
  serviceName: database
  selector:
    matchLabels:
      app: database
  template:
    metadata:
      labels:
        app: database
    spec:
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
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - database
            topologyKey: topology.kubernetes.io/zone
      containers:
      - name: postgres
        image: postgres:15
```

This ensures each database replica runs on a different node in a different zone, maximizing fault tolerance.

## Anti-Affinity for StatefulSets

StatefulSets benefit especially from anti-affinity because they manage stateful workloads where pod identity and data locality matter:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: elasticsearch
spec:
  replicas: 5
  serviceName: elasticsearch
  selector:
    matchLabels:
      app: elasticsearch
  template:
    metadata:
      labels:
        app: elasticsearch
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - elasticsearch
              topologyKey: kubernetes.io/hostname
          - weight: 50
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - elasticsearch
              topologyKey: topology.kubernetes.io/zone
      containers:
      - name: elasticsearch
        image: elasticsearch:8.0
```

This spreads Elasticsearch nodes across nodes and zones with appropriate weights, balancing distribution with scheduling flexibility.

## Testing Anti-Affinity Configurations

Verify anti-affinity rules work correctly:

```bash
# Deploy test application
kubectl apply -f deployment-with-anti-affinity.yaml

# Wait for deployment
kubectl rollout status deployment/test-app

# Check pod distribution across nodes
kubectl get pods -l app=test-app -o wide | awk '{print $7}' | sort | uniq -c

# Check pod distribution across zones
kubectl get pods -l app=test-app -o json | \
  jq -r '.items[] | .spec.nodeName' | \
  xargs -I {} kubectl get node {} -o jsonpath='{.metadata.labels.topology\.kubernetes\.io/zone}{"\n"}' | \
  sort | uniq -c
```

Test behavior when violating constraints:

```bash
# Scale beyond available nodes with required anti-affinity
kubectl scale deployment/test-app --replicas=10

# Check pending pods
kubectl get pods -l app=test-app --field-selector=status.phase=Pending

# View scheduling failures
kubectl describe pod test-app-xxx | grep -A 5 "Events:"
```

## Combining with Topology Spread Constraints

For sophisticated distribution requirements, combine anti-affinity with topology spread constraints:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: advanced-distribution
spec:
  replicas: 12
  selector:
    matchLabels:
      app: advanced
  template:
    metadata:
      labels:
        app: advanced
    spec:
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: advanced
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchLabels:
                  app: advanced
              topologyKey: kubernetes.io/hostname
      containers:
      - name: app
        image: app:latest
```

Topology spread ensures even zone distribution while anti-affinity encourages node distribution within zones.

## Monitoring Distribution Effectiveness

Track how well anti-affinity achieves desired distribution:

```promql
# Pods per node for an application
count by (node) (kube_pod_info{pod=~"app-.*"})

# Pods per zone for an application
count by (topology_zone) (
  kube_pod_info{pod=~"app-.*"} *
  on(node) group_left(topology_zone)
  kube_node_labels
)
```

Alert on suboptimal distribution:

```yaml
groups:
- name: distribution-alerts
  rules:
  - alert: PoorPodDistribution
    expr: |
      stddev(count by (node) (kube_pod_info{namespace="production"})) > 5
    for: 30m
    labels:
      severity: warning
    annotations:
      summary: "Pod distribution across nodes is uneven"
```

Pod anti-affinity is essential for building resilient applications in Kubernetes. By distributing replicas across failure domains like nodes and zones, you ensure that infrastructure failures affect only a portion of your capacity rather than all of it. Proper anti-affinity configuration transforms multiple replicas from redundancy on paper into genuine fault tolerance in practice.
