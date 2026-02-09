# How to Configure Pod Affinity with TopologyKey for Rack-Aware Placement

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Pod Affinity, Topology

Description: Learn how to use pod affinity with topologyKey to implement rack-aware scheduling in Kubernetes, ensuring pods are distributed or co-located based on physical infrastructure topology.

---

Physical infrastructure has failure domains beyond zones - racks, power circuits, and network segments. Rack-aware scheduling uses pod affinity with custom topology keys to ensure your pods are distributed across these physical boundaries or co-located when performance requires it.

## Understanding TopologyKey

The `topologyKey` in pod affinity rules determines the scope of topology for pod placement. Pods are considered in the same topology domain if they share the same value for the specified label key.

Common topology keys:
- `kubernetes.io/hostname` - Single node
- `topology.kubernetes.io/zone` - Availability zone
- `topology.kubernetes.io/rack` - Physical rack
- `topology.kubernetes.io/region` - Cloud region

## Labeling Nodes with Rack Information

First, label nodes with rack topology:

```bash
# Label nodes in rack-1
kubectl label nodes node-1 node-2 node-3 topology.kubernetes.io/rack=rack-1

# Label nodes in rack-2
kubectl label nodes node-4 node-5 node-6 topology.kubernetes.io/rack=rack-2

# Label nodes in rack-3
kubectl label nodes node-7 node-8 node-9 topology.kubernetes.io/rack=rack-3

# Verify labels
kubectl get nodes -L topology.kubernetes.io/rack
```

## Pod Anti-Affinity for Rack Distribution

Distribute pods across different racks:

```yaml
# rack-distributed-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: distributed-app
spec:
  replicas: 6
  selector:
    matchLabels:
      app: distributed-app
  template:
    metadata:
      labels:
        app: distributed-app
    spec:
      affinity:
        podAntiAffinity:
          # Hard requirement: spread across racks
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - distributed-app
            topologyKey: topology.kubernetes.io/rack
      containers:
      - name: app
        image: distributed-app:v1.0
        resources:
          requests:
            cpu: 1000m
            memory: 2Gi
```

This ensures no two pods run in the same rack.

## Pod Affinity for Rack Co-Location

Co-locate related pods in the same rack for low latency:

```yaml
# rack-colocated-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cache-layer
spec:
  replicas: 3
  selector:
    matchLabels:
      app: cache
  template:
    metadata:
      labels:
        app: cache
    spec:
      affinity:
        podAffinity:
          # Co-locate with app pods in same rack
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - distributed-app
            topologyKey: topology.kubernetes.io/rack
      containers:
      - name: redis
        image: redis:7.2
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
```

## Soft Rack Affinity

Prefer rack co-location but allow exceptions:

```yaml
# soft-rack-affinity.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: analytics-worker
spec:
  replicas: 12
  selector:
    matchLabels:
      app: analytics-worker
  template:
    spec:
      affinity:
        podAffinity:
          # Prefer to be in same rack as data layer
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - data-layer
              topologyKey: topology.kubernetes.io/rack
        podAntiAffinity:
          # But don't put multiple workers on same node
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - analytics-worker
            topologyKey: kubernetes.io/hostname
      containers:
      - name: worker
        image: analytics-worker:v1.0
```

## Multi-Level Topology

Combine rack and zone topology:

```yaml
# multi-level-topology.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database-cluster
spec:
  serviceName: database
  replicas: 9
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
          # Hard requirement: different racks
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - database
            topologyKey: topology.kubernetes.io/rack
          # Prefer different zones
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - database
              topologyKey: topology.kubernetes.io/zone
      containers:
      - name: postgres
        image: postgres:15
        resources:
          requests:
            cpu: 4000m
            memory: 16Gi
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 1Ti
```

## Cassandra Ring with Rack Awareness

Deploy Cassandra with rack awareness:

```yaml
# cassandra-rack-aware.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: cassandra
spec:
  serviceName: cassandra
  replicas: 9
  selector:
    matchLabels:
      app: cassandra
  template:
    metadata:
      labels:
        app: cassandra
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - cassandra
            # Ensure pods spread across racks
            topologyKey: topology.kubernetes.io/rack
      containers:
      - name: cassandra
        image: cassandra:4.1
        env:
        - name: CASSANDRA_SEEDS
          value: "cassandra-0.cassandra,cassandra-1.cassandra,cassandra-2.cassandra"
        - name: CASSANDRA_CLUSTER_NAME
          value: "RackAwareCluster"
        # Enable rack awareness
        - name: CASSANDRA_DC
          value: "datacenter1"
        - name: CASSANDRA_RACK
          valueFrom:
            fieldRef:
              fieldPath: metadata.labels['topology.kubernetes.io/rack']
        - name: CASSANDRA_ENDPOINT_SNITCH
          value: "GossipingPropertyFileSnitch"
        resources:
          requests:
            cpu: 2000m
            memory: 8Gi
        volumeMounts:
        - name: data
          mountPath: /var/lib/cassandra
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 500Gi
```

## Power Circuit Awareness

Use custom topology for power circuits:

```bash
# Label nodes by power circuit
kubectl label nodes node-1 node-4 node-7 topology.example.com/power-circuit=circuit-a
kubectl label nodes node-2 node-5 node-8 topology.example.com/power-circuit=circuit-b
kubectl label nodes node-3 node-6 node-9 topology.example.com/power-circuit=circuit-c
```

```yaml
# power-aware-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: power-aware-app
spec:
  replicas: 6
  selector:
    matchLabels:
      app: power-aware-app
  template:
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - power-aware-app
            # Spread across power circuits
            topologyKey: topology.example.com/power-circuit
      containers:
      - name: app
        image: critical-app:v1.0
```

## Network Segment Topology

For network-sensitive workloads:

```bash
# Label nodes by network segment
kubectl label nodes node-1 node-2 node-3 topology.example.com/network-segment=segment-1
kubectl label nodes node-4 node-5 node-6 topology.example.com/network-segment=segment-2
kubectl label nodes node-7 node-8 node-9 topology.example.com/network-segment=segment-3
```

```yaml
# network-aware-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: latency-sensitive-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: latency-app
      tier: frontend
  template:
    spec:
      affinity:
        podAffinity:
          # Co-locate frontend and backend in same network segment
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - latency-app
              - key: tier
                operator: In
                values:
                - backend
            topologyKey: topology.example.com/network-segment
      containers:
      - name: frontend
        image: frontend:v1.0
```

## Monitoring Rack Distribution

Check pod distribution across racks:

```bash
# View pod distribution
kubectl get pods -l app=distributed-app -o json | \
  jq -r '.items[] | .spec.nodeName' | \
  xargs -I {} kubectl get node {} -o jsonpath='{.metadata.name}{"\t"}{.metadata.labels.topology\.kubernetes\.io/rack}{"\n"}'

# Count pods per rack
kubectl get pods -l app=distributed-app -o json | \
  jq -r '.items[] | .spec.nodeName' | \
  xargs -I {} kubectl get node {} -o jsonpath='{.metadata.labels.topology\.kubernetes\.io/rack}{"\n"}' | \
  sort | uniq -c
```

## Best Practices

1. **Label Consistently**: Use standard topology keys when possible
2. **Document Topology**: Maintain documentation of physical infrastructure mapping
3. **Test Failures**: Simulate rack failures to validate distribution
4. **Combine Strategies**: Use both affinity and anti-affinity for complex requirements
5. **Monitor Distribution**: Track pod placement across topology domains
6. **Consider Capacity**: Ensure each rack has sufficient capacity
7. **Use Soft Affinity**: Prefer soft affinity over hard when possible
8. **Update Labels**: Keep topology labels accurate as infrastructure changes

## Troubleshooting

If pods aren't scheduling according to rack affinity:

```bash
# Check node labels
kubectl get nodes --show-labels | grep rack

# Verify pod affinity configuration
kubectl get pod <pod-name> -o jsonpath='{.spec.affinity}' | jq

# Check scheduling events
kubectl describe pod <pod-name> | grep -A 20 Events

# Count available nodes per rack
kubectl get nodes -o json | \
  jq -r '.items[] | .metadata.labels["topology.kubernetes.io/rack"]' | \
  sort | uniq -c
```

Rack-aware scheduling using pod affinity with custom topology keys ensures your workloads are distributed according to physical infrastructure boundaries, improving fault tolerance and optimizing network performance based on your data center layout.

