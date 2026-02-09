# How to use HPA with StatefulSet for scaling stateful workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, HPA, StatefulSet

Description: Learn how to configure Horizontal Pod Autoscaler to scale StatefulSet workloads while maintaining state consistency and ordered pod management.

---

Scaling stateful applications presents unique challenges compared to stateless workloads. StatefulSets provide stable network identities, persistent storage, and ordered deployment guarantees, but these features complicate autoscaling. The Horizontal Pod Autoscaler can scale StatefulSets, but you need to understand the implications for state management, data distribution, and application consistency. This guide shows you how to safely scale stateful workloads using HPA.

## Understanding StatefulSet Scaling Constraints

StatefulSets differ from Deployments in critical ways that affect autoscaling:

- Pods have stable, predictable names (app-0, app-1, app-2)
- Each pod gets its own persistent volume that persists across restarts
- Pods are created and deleted in order (0, 1, 2 when scaling up; 2, 1, 0 when scaling down)
- Network identities remain stable across rescheduling

These guarantees mean scaling is slower than Deployments. When HPA requests 10 replicas, StatefulSet creates them one at a time, waiting for each to become ready before starting the next. This ordered scaling protects state consistency but can delay capacity additions during traffic spikes.

## When to Use HPA with StatefulSets

HPA works well for StatefulSet workloads that:

- Distribute data using consistent hashing or sharding (like Cassandra, Redis Cluster)
- Can rebalance data when capacity changes (like Elasticsearch)
- Use external coordination for state management (like Kafka with ZooKeeper)
- Handle read replicas that don't require perfect data consistency

Avoid HPA for StatefulSets that:

- Require manual intervention for data migration
- Use master-slave replication without automatic failover
- Cannot tolerate the ordered scaling delays
- Need precise control over which instances handle which data

## Basic HPA Configuration for StatefulSets

Create a StatefulSet for a sharded cache service:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: cache-cluster
  namespace: default
spec:
  serviceName: cache-cluster
  replicas: 3
  selector:
    matchLabels:
      app: cache-cluster
  template:
    metadata:
      labels:
        app: cache-cluster
    spec:
      containers:
      - name: cache
        image: myorg/distributed-cache:1.0
        ports:
        - containerPort: 6379
          name: client
        - containerPort: 16379
          name: gossip
        env:
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: SERVICE_NAME
          value: "cache-cluster"
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 1000m
            memory: 2Gi
        volumeMounts:
        - name: data
          mountPath: /data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 10Gi
```

Create an HPA targeting CPU utilization:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: cache-cluster-hpa
  namespace: default
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: StatefulSet
    name: cache-cluster
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 180
      policies:
      - type: Pods
        value: 1
        periodSeconds: 180
      selectPolicy: Max
    scaleDown:
      stabilizationWindowSeconds: 600
      policies:
      - type: Pods
        value: 1
        periodSeconds: 300
```

The behavior configuration is critical for StatefulSets. Conservative scaling policies (adding/removing only one pod at a time with long stabilization windows) give your application time to rebalance data and maintain consistency.

## Handling Data Rebalancing

When scaling a StatefulSet, new pods need to acquire their share of data, and departing pods must migrate their data elsewhere. Implement this logic in your application.

Example rebalancing logic in Go:

```go
package main

import (
    "context"
    "fmt"
    "hash/fnv"
    "log"
    "os"
    "strconv"
    "strings"
    "time"

    "k8s.io/client-go/kubernetes"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type ClusterManager struct {
    clientset   *kubernetes.Clientset
    podName     string
    serviceName string
    namespace   string
}

// Get current cluster size by querying StatefulSet
func (cm *ClusterManager) GetClusterSize() (int, error) {
    ctx := context.Background()

    statefulsetName := strings.TrimSuffix(cm.podName, "-"+cm.getPodOrdinal())
    sts, err := cm.clientset.AppsV1().StatefulSets(cm.namespace).Get(ctx, statefulsetName, metav1.GetOptions{})
    if err != nil {
        return 0, err
    }

    return int(*sts.Spec.Replicas), nil
}

// Calculate which pod should own a given key
func (cm *ClusterManager) GetOwnerForKey(key string, clusterSize int) int {
    h := fnv.New32a()
    h.Write([]byte(key))
    return int(h.Sum32()) % clusterSize
}

// Get this pod's ordinal number
func (cm *ClusterManager) getPodOrdinal() string {
    parts := strings.Split(cm.podName, "-")
    return parts[len(parts)-1]
}

// Watch for cluster size changes and trigger rebalancing
func (cm *ClusterManager) WatchAndRebalance() {
    ticker := time.NewTicker(30 * time.Second)
    defer ticker.Stop()

    previousSize := 0

    for range ticker.C {
        currentSize, err := cm.GetClusterSize()
        if err != nil {
            log.Printf("Error getting cluster size: %v", err)
            continue
        }

        if currentSize != previousSize && previousSize > 0 {
            log.Printf("Cluster size changed from %d to %d, rebalancing...", previousSize, currentSize)
            cm.rebalanceData(previousSize, currentSize)
        }

        previousSize = currentSize
    }
}

// Rebalance data when cluster size changes
func (cm *ClusterManager) rebalanceData(oldSize, newSize int) {
    myOrdinal, _ := strconv.Atoi(cm.getPodOrdinal())

    // Scan local keys and migrate those that no longer belong to this pod
    localKeys := cm.getLocalKeys()

    for _, key := range localKeys {
        newOwner := cm.GetOwnerForKey(key, newSize)

        if newOwner != myOrdinal {
            // This key should now be owned by a different pod
            targetPod := fmt.Sprintf("%s-%d.%s.%s.svc.cluster.local",
                strings.TrimSuffix(cm.podName, fmt.Sprintf("-%d", myOrdinal)),
                newOwner, cm.serviceName, cm.namespace)

            cm.migrateKey(key, targetPod)
        }
    }

    log.Printf("Rebalancing complete")
}

func (cm *ClusterManager) getLocalKeys() []string {
    // Implementation depends on your data store
    return []string{}
}

func (cm *ClusterManager) migrateKey(key, targetPod string) {
    // Implementation depends on your data store
    log.Printf("Migrating key %s to %s", key, targetPod)
}
```

This code watches for StatefulSet replica count changes and redistributes data using consistent hashing.

## Using Custom Metrics for Stateful Workloads

CPU and memory metrics often don't reflect the actual load on stateful systems. Consider using application-specific metrics like:

- Cache hit rate (scale up when hit rate drops)
- Query latency (scale up when latency increases)
- Data shard size (scale up when shards grow too large)
- Replication lag (scale up read replicas when lag increases)

Example HPA using custom metrics:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: cache-cluster-hpa
  namespace: default
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: StatefulSet
    name: cache-cluster
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Pods
    pods:
      metric:
        name: cache_hit_rate
      target:
        type: AverageValue
        averageValue: "80"
  - type: Pods
    pods:
      metric:
        name: avg_query_latency_ms
      target:
        type: AverageValue
        averageValue: "100"
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 300
      policies:
      - type: Pods
        value: 1
        periodSeconds: 300
    scaleDown:
      stabilizationWindowSeconds: 900
      policies:
      - type: Pods
        value: 1
        periodSeconds: 600
```

## Handling Scale-Down Safely

Scale-down is particularly risky for StatefulSets. The highest-numbered pod is always removed first, but this might hold critical data. Implement these safeguards:

### 1. PreStop Hook for Data Migration

Add a preStop lifecycle hook that migrates data before pod termination:

```yaml
lifecycle:
  preStop:
    exec:
      command:
      - /bin/sh
      - -c
      - |
        # Signal the application to stop accepting new writes
        curl -X POST http://localhost:8080/prepare-shutdown

        # Wait for data migration to complete
        while [ $(curl -s http://localhost:8080/migration-status) != "complete" ]; do
          sleep 5
        done

        # Allow graceful shutdown
        sleep 10
```

### 2. PodDisruptionBudget

Prevent too many pods from being removed simultaneously:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: cache-cluster-pdb
  namespace: default
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: cache-cluster
```

This ensures at least 2 pods remain available during any disruption, including HPA scale-down.

## Monitoring StatefulSet Scaling

Track these metrics to understand scaling behavior:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: statefulset-alerts
  namespace: monitoring
data:
  alerts.yml: |
    groups:
    - name: statefulset_scaling
      interval: 30s
      rules:
      - alert: StatefulSetScalingTooFast
        expr: rate(kube_statefulset_replicas[5m]) > 0.1
        annotations:
          summary: "StatefulSet {{ $labels.statefulset }} scaling too rapidly"

      - alert: StatefulSetPodNotReady
        expr: kube_statefulset_status_replicas_ready < kube_statefulset_replicas
        for: 10m
        annotations:
          summary: "StatefulSet {{ $labels.statefulset }} has pods not ready"

      - alert: HPAMaxedOut
        expr: kube_hpa_status_current_replicas == kube_hpa_spec_max_replicas
        for: 15m
        annotations:
          summary: "HPA {{ $labels.hpa }} at maximum replicas"
```

## Advanced: Per-Pod Scaling Metrics

For fine-grained control, use per-pod metrics to identify which specific pods are overloaded:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: cache-cluster-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: StatefulSet
    name: cache-cluster
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Pods
    pods:
      metric:
        name: data_shard_size_gb
        selector:
          matchLabels:
            shard: "hot"
      target:
        type: AverageValue
        averageValue: "50"
```

This scales based on the average shard size across pods, ensuring no single pod becomes a hotspot.

## Conclusion

Scaling StatefulSets with HPA requires careful consideration of data distribution, ordered scaling constraints, and state consistency. Use conservative scaling policies with long stabilization windows, implement application-level data rebalancing, and monitor both infrastructure and application metrics. When configured properly, HPA can effectively scale stateful workloads while maintaining the guarantees that StatefulSets provide. Focus on gradual scaling, graceful data migration, and comprehensive monitoring to ensure reliable operation.
