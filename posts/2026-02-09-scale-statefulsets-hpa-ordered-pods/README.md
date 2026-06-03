# How to Scale StatefulSets with HPA and Handle Ordered Pod Creation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, StatefulSet, Autoscaling

Description: Learn how to configure HPA for StatefulSets while managing the challenges of ordered pod creation, persistent volumes, and stateful application requirements.

---

HPA is often used with Deployments and stateless pods that can scale up and down freely, but it can target any workload that implements the scale subresource, including StatefulSets. StatefulSets add complexity with ordered pod creation, stable network identities, and persistent storage. Autoscaling StatefulSets requires understanding these constraints and configuring HPA to work within them.

## StatefulSet Scaling Characteristics

StatefulSets create pods sequentially with predictable names:

- Pods are numbered: `app-0`, `app-1`, `app-2`
- Scaling up creates pods in order: 0, then 1, then 2
- Scaling down removes pods in reverse order: 2, then 1, then 0
- Each pod gets its own persistent volume when you use `volumeClaimTemplates`, and that volume survives pod deletion by default

This ordering matters for distributed systems like databases, message queues, and consensus-based applications where initialization order affects cluster formation.

## Configuring HPA for StatefulSets

Basic HPA configuration works the same as Deployments:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: cassandra
  namespace: database
spec:
  serviceName: cassandra
  replicas: 3
  selector:
    matchLabels:
      app: cassandra
  template:
    metadata:
      labels:
        app: cassandra
    spec:
      containers:
      - name: cassandra
        image: cassandra:4.1
        ports:
        - containerPort: 9042
          name: cql
        resources:
          requests:
            cpu: 500m
            memory: 2Gi
          limits:
            cpu: 2000m
            memory: 4Gi
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
          storage: 100Gi
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: cassandra-hpa
  namespace: database
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: StatefulSet
    name: cassandra
  minReplicas: 3
  maxReplicas: 15
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Pods
        value: 1  # Add at most 1 pod per policy window
        periodSeconds: 300  # Limit scale-up over a 5-minute window
    scaleDown:
      stabilizationWindowSeconds: 600  # Consider the last 10 minutes of recommendations before scaling down
      policies:
      - type: Pods
        value: 1  # Remove at most 1 pod per policy window
        periodSeconds: 600  # Limit scale-down over a 10-minute window
```

The critical differences from Deployment HPA:

- **Slower scaling**: Limit scale-up to 1 pod per 5-minute window to allow cluster membership updates
- **Longer stabilization**: Use a 10-minute scale-down stabilization window so the HPA considers recent recommendations before reducing replicas
- **Conservative policies**: StatefulSet workloads typically can't handle rapid scaling

## Handling Pod Initialization Order

StatefulSets wait for each pod to be Ready before starting the next. Your application must signal readiness appropriately:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: zookeeper
spec:
  serviceName: zookeeper
  replicas: 3
  selector:
    matchLabels:
      app: zookeeper
  template:
    metadata:
      labels:
        app: zookeeper
    spec:
      containers:
      - name: zookeeper
        image: zookeeper:3.8
        ports:
        - containerPort: 2181
          name: client
        - containerPort: 2888
          name: peer
        - containerPort: 3888
          name: leader-election
        readinessProbe:
          exec:
            command:
            - /bin/bash
            - -c
            - |
              # Check if ZooKeeper is serving requests
              echo ruok | nc localhost 2181 | grep imok
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
        livenessProbe:
          exec:
            command:
            - /bin/bash
            - -c
            - |
              echo ruok | nc localhost 2181 | grep imok
          initialDelaySeconds: 60
          periodSeconds: 30
        resources:
          requests:
            cpu: 250m
            memory: 1Gi
```

The readiness probe ensures each pod is serving requests before the next pod starts. For production ZooKeeper clusters, use a readiness check that also verifies the server's ensemble role or quorum health before marking the pod Ready; `ruok` alone only confirms that the local server is running in a non-error state.

## Using PodManagementPolicy for Parallel Scaling

By default, StatefulSets use OrderedReady pod management. For some workloads, you can use Parallel:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: web-cache
spec:
  serviceName: web-cache
  podManagementPolicy: Parallel  # Start all pods simultaneously
  replicas: 5
  selector:
    matchLabels:
      app: web-cache
  template:
    metadata:
      labels:
        app: web-cache
    spec:
      containers:
      - name: redis
        image: redis:7.2
        resources:
          requests:
            cpu: 200m
            memory: 512Mi
```

With Parallel, HPA scale events can complete faster because the StatefulSet controller can create or terminate the target pods simultaneously. Use this when:

- Pods don't need to form a cluster in specific order
- Each pod operates independently
- The StatefulSet is used only for stable identities and persistent storage

## Scaling Based on Application-Specific Metrics

For databases and distributed systems, scale on metrics that reflect actual capacity:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: mongodb-hpa
  namespace: database
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: StatefulSet
    name: mongodb
  minReplicas: 3
  maxReplicas: 9
  metrics:
  # Scale based on connections per node
  - type: Pods
    pods:
      metric:
        name: mongodb_connections
      target:
        type: AverageValue
        averageValue: "500"
  # Scale based on operations per second
  - type: Pods
    pods:
      metric:
        name: mongodb_operations_per_second
      target:
        type: AverageValue
        averageValue: "2000"
  # Also monitor CPU
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 75
  behavior:
    scaleUp:
      policies:
      - type: Pods
        value: 1
        periodSeconds: 600  # One pod every 10 minutes
    scaleDown:
      policies:
      - type: Pods
        value: 1
        periodSeconds: 1800  # One pod every 30 minutes
```

This uses MongoDB-specific metrics exported via Prometheus. Scale-down is extremely conservative (30 minutes between removals) to avoid data rebalancing overhead.

## Handling Persistent Volume Cleanup

When HPA scales down a StatefulSet, PersistentVolumeClaims are retained by default unless you explicitly configure `.spec.persistentVolumeClaimRetentionPolicy.whenScaled: Delete`:

```bash
# After scaling from 5 to 3 replicas

kubectl get pvc -n database
```

Output:

```text
NAME              STATUS   VOLUME                                     CAPACITY
data-mongodb-0    Bound    pvc-123...                                 100Gi
data-mongodb-1    Bound    pvc-456...                                 100Gi
data-mongodb-2    Bound    pvc-789...                                 100Gi
data-mongodb-3    Bound    pvc-abc...                                 100Gi  # Orphaned
data-mongodb-4    Bound    pvc-def...                                 100Gi  # Orphaned
```

Pods 3 and 4 are deleted but their PVCs remain with the default `Retain` policy. If HPA scales back up to 5, pods 3 and 4 reconnect to their old PVCs with existing data.

To clean up retained PVCs automatically without changing the StatefulSet retention policy, use a cleanup controller:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cleanup-orphaned-pvcs
  namespace: database
spec:
  schedule: "0 2 * * *"  # Run daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: pvc-cleaner
          containers:
          - name: cleanup
            image: bitnami/kubectl:latest
            command:
            - /bin/bash
            - -c
            - |
              # Get current StatefulSet replica count
              REPLICAS=$(kubectl get statefulset mongodb -o jsonpath='{.spec.replicas}')

              # Find PVCs for pods beyond current replica count
              for i in $(seq $REPLICAS 100); do
                PVC="data-mongodb-$i"
                if kubectl get pvc $PVC 2>/dev/null; then
                  echo "Deleting orphaned PVC: $PVC"
                  kubectl delete pvc $PVC
                fi
              done
          restartPolicy: OnFailure
```

Only run this if you're certain you don't need the data on scaled-down pods.

## Monitoring StatefulSet Scaling

Track scaling events and pod creation times:

```bash
# Watch StatefulSet replicas
kubectl get statefulset -w

# Monitor pod creation order
kubectl get pods -l app=cassandra -w

# Check HPA status
kubectl describe hpa cassandra-hpa
```

Create alerts for slow pod startup:

```yaml
# Prometheus alert
groups:
- name: statefulset-scaling
  rules:
  - alert: SlowStatefulSetScaling
    expr: |
      (time() - kube_pod_created{pod=~"cassandra-[0-9]+"}) > 600
      and on(namespace, pod)
      kube_pod_status_ready{pod=~"cassandra-[0-9]+",condition="true"} == 0
    for: 5m
    annotations:
      summary: "StatefulSet pod {{ $labels.pod }} taking too long to start"
      description: "Pod has not become Ready within 10 minutes of creation"
```

## Best Practices

**Set minimum replicas to match quorum requirements**: For systems needing quorum (Cassandra, ZooKeeper, etcd), set minReplicas to the minimum cluster size (typically 3).

**Use conservative scaling policies**: StatefulSets handle rapid scaling poorly. Limit to 1 pod per period with long periods (5-10 minutes).

**Monitor replication and rebalancing**: Scaling triggers data rebalancing in distributed databases. Track rebalancing progress:

```promql
# Cassandra pending compactions
cassandra_pending_compactions

# MongoDB replication lag
mongodb_replication_lag_seconds
```

**Test scale-down impact**: Before enabling HPA, manually test scaling down to verify data stays available and performance is acceptable.

**Consider VPA instead**: For StatefulSets that need more resources but not more instances, Vertical Pod Autoscaler might be more appropriate than HPA.

**Document the scaling strategy**: StatefulSet autoscaling decisions affect data placement and availability. Document why you chose specific thresholds:

```yaml
metadata:
  annotations:
    autoscaling-notes: |
      Scales at 70% CPU to maintain <100ms p95 latency.
      Adds 1 pod every 10 minutes to allow cluster rebalancing.
      Minimum 3 pods for quorum. Maximum 9 pods per rack.
```

HPA works with StatefulSets, but you must account for ordered pod creation, persistent storage, and cluster membership. Conservative policies and application-aware metrics ensure scaling enhances rather than disrupts your stateful workloads.
