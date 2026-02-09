# How to Schedule Pods to Specific Availability Zones with Node Labels

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Availability Zones, High Availability

Description: Learn how to use node labels and scheduling constraints to distribute pods across availability zones for high availability and fault tolerance in Kubernetes clusters.

---

Availability zones are isolated failure domains within a cloud region. Distributing your workloads across multiple zones ensures your application remains available even if an entire zone fails. Kubernetes makes this easy using node labels and various scheduling mechanisms.

## Understanding Zone Labels

Cloud providers automatically label nodes with their availability zone:

```bash
# View zone labels on nodes
kubectl get nodes -L topology.kubernetes.io/zone

# Example output:
# NAME           STATUS   ZONE
# worker-node-1  Ready    us-east-1a
# worker-node-2  Ready    us-east-1b
# worker-node-3  Ready    us-east-1c
```

The standard label is `topology.kubernetes.io/zone`. Legacy clusters might use `failure-domain.beta.kubernetes.io/zone`.

## Basic Zone Scheduling with NodeSelector

Pin pods to a specific zone:

```yaml
# single-zone-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: zone-a-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: zone-a-app
  template:
    metadata:
      labels:
        app: zone-a-app
    spec:
      # Force all pods to us-east-1a
      nodeSelector:
        topology.kubernetes.io/zone: us-east-1a
      containers:
      - name: app
        image: nginx:1.21
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
```

## Multi-Zone Deployment with Node Affinity

Distribute across specific zones:

```yaml
# multi-zone-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: multi-zone-app
spec:
  replicas: 9
  selector:
    matchLabels:
      app: multi-zone-app
  template:
    metadata:
      labels:
        app: multi-zone-app
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: topology.kubernetes.io/zone
                operator: In
                values:
                - us-east-1a
                - us-east-1b
                - us-east-1c
      containers:
      - name: app
        image: nginx:1.21
```

## Even Distribution with Topology Spread Constraints

Ensure equal distribution across zones:

```yaml
# even-zone-distribution.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: balanced-app
spec:
  replicas: 12
  selector:
    matchLabels:
      app: balanced-app
  template:
    metadata:
      labels:
        app: balanced-app
    spec:
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: balanced-app
      containers:
      - name: app
        image: myapp:v1.0
        resources:
          requests:
            cpu: 1000m
            memory: 1Gi
```

With 12 replicas and 3 zones, this creates exactly 4 pods per zone.

## Preferred Zone Placement

Prefer certain zones but allow others:

```yaml
# preferred-zone-placement.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: preferred-zone-app
spec:
  replicas: 6
  selector:
    matchLabels:
      app: preferred-zone-app
  template:
    spec:
      affinity:
        nodeAffinity:
          # Prefer us-east-1a, but allow others
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            preference:
              matchExpressions:
              - key: topology.kubernetes.io/zone
                operator: In
                values:
                - us-east-1a
          - weight: 50
            preference:
              matchExpressions:
              - key: topology.kubernetes.io/zone
                operator: In
                values:
                - us-east-1b
      containers:
      - name: app
        image: nginx:1.21
```

## Database Deployment Across Zones

Distribute database replicas for HA:

```yaml
# database-multi-zone.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres-ha
spec:
  serviceName: postgres
  replicas: 3
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      # Spread across zones
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: postgres
      # Anti-affinity to ensure no two pods on same node
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchLabels:
                app: postgres
            topologyKey: kubernetes.io/hostname
      containers:
      - name: postgres
        image: postgres:15
        resources:
          requests:
            cpu: 2000m
            memory: 8Gi
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
          storage: 500Gi
```

## Zone-Aware Service Routing

Configure services to route to local zone:

```yaml
# zone-aware-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: app-service
  annotations:
    service.kubernetes.io/topology-aware-hints: auto
spec:
  selector:
    app: balanced-app
  ports:
  - port: 80
    targetPort: 8080
  type: ClusterIP
  # Enable topology-aware routing
  internalTrafficPolicy: Local
```

## Testing Zone Distribution

Verify pods are distributed correctly:

```bash
# Show pods with their zones
kubectl get pods -l app=balanced-app -o wide

# Count pods per zone
kubectl get pods -l app=balanced-app -o json | \
  jq -r '.items[] | .spec.nodeName' | \
  xargs -I {} kubectl get node {} -o jsonpath='{.metadata.labels.topology\.kubernetes\.io/zone}{"\n"}' | \
  sort | uniq -c

# Example output:
#   4 us-east-1a
#   4 us-east-1b
#   4 us-east-1c
```

## Simulating Zone Failure

Test application resilience:

```bash
# Cordon all nodes in a zone
kubectl cordon -l topology.kubernetes.io/zone=us-east-1a

# Drain nodes in the zone
kubectl drain -l topology.kubernetes.io/zone=us-east-1a --ignore-daemonsets --delete-emptydir-data

# Watch pods reschedule
kubectl get pods -l app=balanced-app -w

# Restore the zone
kubectl uncordon -l topology.kubernetes.io/zone=us-east-1a
```

## Multi-Region with Zone Awareness

For multi-region setups:

```yaml
# multi-region-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: global-app
spec:
  replicas: 18
  selector:
    matchLabels:
      app: global-app
  template:
    spec:
      topologySpreadConstraints:
      # Spread across regions
      - maxSkew: 2
        topologyKey: topology.kubernetes.io/region
        whenUnsatisfiable: ScheduleAnyway
        labelSelector:
          matchLabels:
            app: global-app
      # Within each region, spread across zones
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: global-app
      containers:
      - name: app
        image: global-app:v1.0
```

## PodDisruptionBudget for Zone Failures

Protect against zone-wide disruptions:

```yaml
# zone-aware-pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: app-pdb
spec:
  minAvailable: 2  # Keep at least 2 pods running
  selector:
    matchLabels:
      app: balanced-app
```

## Best Practices

1. **Use Topology Spread**: Prefer topology spread constraints over manual zone selection
2. **Set maxSkew=1**: For critical workloads, use maxSkew=1 to ensure equal distribution
3. **Plan Replica Count**: Choose replica counts divisible by number of zones
4. **Combine with Anti-Affinity**: Use pod anti-affinity to avoid single node failures
5. **Test Failures**: Regularly simulate zone failures to validate resilience
6. **Monitor Distribution**: Track pod distribution metrics
7. **Use PDBs**: Protect workloads during maintenance with PodDisruptionBudgets
8. **Consider Costs**: Some zones might have different pricing

## Monitoring Zone Distribution

Create monitoring dashboard:

```bash
# Prometheus query for zone distribution
sum(kube_pod_info) by (node, pod, namespace)

# Alert on uneven distribution
(max(count(kube_pod_info{namespace="production"}) by (zone)) -
 min(count(kube_pod_info{namespace="production"}) by (zone))) > 2
```

Scheduling pods across availability zones using node labels and topology spread constraints is essential for building highly available Kubernetes applications that can tolerate zone-level failures.

