# How to Use Pod Topology Spread Constraints with StatefulSets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, StatefulSets, Topology

Description: Learn how to apply Pod Topology Spread Constraints to StatefulSets for high availability, ensuring stateful workloads are distributed across failure domains while maintaining pod identity and ordering.

---

StatefulSets manage stateful applications that require stable network identities and persistent storage. When running StatefulSets across multiple availability zones or failure domains, you need to ensure pods are distributed evenly to maintain high availability during zone failures.

Pod Topology Spread Constraints work with StatefulSets to automatically distribute pods across topology domains while respecting StatefulSet's ordering and identity requirements.

## Basic Topology Spread for StatefulSets

Here's a StatefulSet with zone-level topology spread:

```yaml
# database-statefulset-topology.yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: databases
spec:
  clusterIP: None
  selector:
    app: postgres
  ports:
  - port: 5432
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: databases
spec:
  serviceName: postgres
  replicas: 6
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      # Spread across availability zones
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: postgres
      containers:
      - name: postgres
        image: postgres:15
        ports:
        - containerPort: 5432
        resources:
          requests:
            cpu: 2000m
            memory: 8Gi
          limits:
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
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 500Gi
```

With 6 replicas and 3 zones, this creates 2 pods per zone.

## Multi-Level Topology Spread

Combine zone-level and node-level spreading:

```yaml
# multi-level-topology-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: cassandra
  namespace: databases
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
      topologySpreadConstraints:
      # Spread across zones
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: cassandra
      # Also spread across nodes within each zone
      - maxSkew: 1
        topologyKey: kubernetes.io/hostname
        whenUnsatisfiable: ScheduleAnyway
        labelSelector:
          matchLabels:
            app: cassandra
      containers:
      - name: cassandra
        image: cassandra:4.1
        ports:
        - containerPort: 9042
        env:
        - name: CASSANDRA_SEEDS
          value: "cassandra-0.cassandra,cassandra-1.cassandra,cassandra-2.cassandra"
        - name: CASSANDRA_CLUSTER_NAME
          value: "production-cluster"
        resources:
          requests:
            cpu: 4000m
            memory: 16Gi
        volumeMounts:
        - name: data
          mountPath: /var/lib/cassandra
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: local-ssd
      resources:
        requests:
          storage: 1Ti
```

## Rack-Aware Topology for Distributed Databases

Use rack topology for distributed systems:

```yaml
# rack-aware-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: scylla
  namespace: databases
spec:
  serviceName: scylla
  replicas: 12
  selector:
    matchLabels:
      app: scylla
  template:
    metadata:
      labels:
        app: scylla
    spec:
      topologySpreadConstraints:
      # Spread across racks
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/rack
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: scylla
      # Also spread across zones
      - maxSkew: 2
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: scylla
      containers:
      - name: scylla
        image: scylladb/scylla:5.2
        resources:
          requests:
            cpu: 8000m
            memory: 32Gi
        volumeMounts:
        - name: data
          mountPath: /var/lib/scylla
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 2Ti
```

## Elasticsearch with Topology Awareness

Configure Elasticsearch nodes across zones:

```yaml
# elasticsearch-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: elasticsearch
  namespace: logging
spec:
  serviceName: elasticsearch
  replicas: 9
  selector:
    matchLabels:
      app: elasticsearch
      role: data
  template:
    metadata:
      labels:
        app: elasticsearch
        role: data
    spec:
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: elasticsearch
            role: data
      initContainers:
      - name: increase-vm-max-map
        image: busybox:1.36
        command: ["sysctl", "-w", "vm.max_map_count=262144"]
        securityContext:
          privileged: true
      containers:
      - name: elasticsearch
        image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
        env:
        - name: cluster.name
          value: production-cluster
        - name: node.name
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: discovery.seed_hosts
          value: "elasticsearch-0.elasticsearch,elasticsearch-1.elasticsearch,elasticsearch-2.elasticsearch"
        - name: cluster.initial_master_nodes
          value: "elasticsearch-0,elasticsearch-1,elasticsearch-2"
        - name: ES_JAVA_OPTS
          value: "-Xms16g -Xmx16g"
        # Enable zone awareness
        - name: node.attr.zone
          valueFrom:
            fieldRef:
              fieldPath: metadata.labels['topology.kubernetes.io/zone']
        - name: cluster.routing.allocation.awareness.attributes
          value: zone
        resources:
          requests:
            cpu: 4000m
            memory: 32Gi
        volumeMounts:
        - name: data
          mountPath: /usr/share/elasticsearch/data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 1Ti
```

## MinDomains for Minimum Distribution

Ensure minimum number of topology domains:

```yaml
# min-domains-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: etcd
  namespace: kube-system
spec:
  serviceName: etcd
  replicas: 5
  selector:
    matchLabels:
      app: etcd
  template:
    metadata:
      labels:
        app: etcd
    spec:
      topologySpreadConstraints:
      - maxSkew: 1
        minDomains: 3  # Require at least 3 zones
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: etcd
      containers:
      - name: etcd
        image: quay.io/coreos/etcd:v3.5.10
        command:
        - etcd
        - --name=$(POD_NAME)
        - --initial-advertise-peer-urls=http://$(POD_NAME).etcd:2380
        - --listen-peer-urls=http://0.0.0.0:2380
        - --listen-client-urls=http://0.0.0.0:2379
        - --advertise-client-urls=http://$(POD_NAME).etcd:2379
        - --initial-cluster-state=new
        env:
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        resources:
          requests:
            cpu: 2000m
            memory: 4Gi
        volumeMounts:
        - name: data
          mountPath: /var/lib/etcd
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
```

## MatchLabelKeys for Rolling Updates

Use matchLabelKeys to handle StatefulSet updates:

```yaml
# statefulset-with-matchlabelkeys.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mongodb
  namespace: databases
spec:
  serviceName: mongodb
  replicas: 6
  selector:
    matchLabels:
      app: mongodb
  template:
    metadata:
      labels:
        app: mongodb
    spec:
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: mongodb
        # Only spread among pods with same controller-revision-hash
        matchLabelKeys:
        - controller-revision-hash
      containers:
      - name: mongodb
        image: mongo:7.0
        resources:
          requests:
            cpu: 2000m
            memory: 8Gi
        volumeMounts:
        - name: data
          mountPath: /data/db
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 500Gi
```

## Monitoring Topology Distribution

Check pod distribution across zones:

```bash
# View pod distribution
kubectl get pods -n databases -l app=postgres -o wide

# Count pods per zone
kubectl get pods -n databases -l app=postgres -o json | \
  jq -r '.items[] | .spec.nodeName' | \
  xargs -I {} kubectl get node {} -o jsonpath='{.metadata.labels.topology\.kubernetes\.io/zone}{"\n"}' | \
  sort | uniq -c

# Verify topology spread is working
kubectl describe pod postgres-0 -n databases | grep -A 10 "Topology Spread Constraints"
```

## Volume Topology with StatefulSets

Ensure volumes are in the same zone as pods:

```yaml
# volume-topology-statefulset.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: zonal-storage
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp3
volumeBindingMode: WaitForFirstConsumer
allowedTopologies:
- matchLabelExpressions:
  - key: topology.kubernetes.io/zone
    values:
    - us-east-1a
    - us-east-1b
    - us-east-1c
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
spec:
  serviceName: redis
  replicas: 6
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: redis
      containers:
      - name: redis
        image: redis:7.2
        resources:
          requests:
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
      storageClassName: zonal-storage
      resources:
        requests:
          storage: 100Gi
```

## Best Practices

1. **Match Replication Factor**: Set replicas to match your topology requirements
2. **Use WhenUnsatisfiable Carefully**: DoNotSchedule for critical HA, ScheduleAnyway for best-effort
3. **Consider Volume Binding**: Use WaitForFirstConsumer for volume topology awareness
4. **Test Failover**: Validate application handles zone failures correctly
5. **Monitor Distribution**: Regularly check pod distribution across zones
6. **Use MinDomains**: Specify minimum zones for critical workloads
7. **Combine with PDBs**: Use PodDisruptionBudgets to protect during maintenance
8. **Plan for Scaling**: Ensure topology constraints work at different replica counts

## Troubleshooting

If StatefulSet pods are pending:

```bash
# Check scheduling events
kubectl describe statefulset postgres -n databases

# View pod events
kubectl describe pod postgres-0 -n databases | grep -A 10 Events

# Check zone labels on nodes
kubectl get nodes -L topology.kubernetes.io/zone

# Verify there are enough zones
kubectl get nodes -o json | \
  jq -r '.items[].metadata.labels["topology.kubernetes.io/zone"]' | \
  sort -u

# Check if storage is available in target zones
kubectl get pv -o json | \
  jq -r '.items[] | {name: .metadata.name, zone: .metadata.labels["topology.kubernetes.io/zone"]}'
```

Pod Topology Spread Constraints with StatefulSets ensure your stateful workloads maintain high availability by distributing pods across failure domains while preserving the ordering and identity guarantees that StatefulSets provide.

