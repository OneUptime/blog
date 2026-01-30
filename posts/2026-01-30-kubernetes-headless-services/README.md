# How to Create Kubernetes Headless Services

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Kubernetes, Networking, DNS, StatefulSets

Description: Implement headless services in Kubernetes for direct pod addressing, StatefulSet DNS, and service discovery without load balancing.

---

Regular Kubernetes Services give you a stable ClusterIP that load-balances traffic across pods. But sometimes you need to talk to specific pods directly. Databases with replication, distributed caches, and peer-to-peer systems all need to know the exact identity of each member. That is where headless services come in.

A headless service skips the ClusterIP entirely. Instead of one virtual IP, DNS returns the individual pod IPs. Your application decides which pod to connect to.

## What Makes a Service Headless

The only difference between a regular service and a headless service is a single field:

```yaml
clusterIP: None
```

That is it. Set `clusterIP` to `None` and Kubernetes will not assign a virtual IP. DNS queries for the service name will return A records for each pod backing the service.

## Regular Service vs. Headless Service

| Aspect | Regular Service | Headless Service |
| --- | --- | --- |
| ClusterIP | Assigned automatically | `None` |
| DNS A record | Single IP (the ClusterIP) | Multiple IPs (one per pod) |
| Load balancing | Built-in via kube-proxy | None, client must choose |
| Pod identity | Hidden behind VIP | Exposed via DNS |
| Use case | Stateless apps, web servers | Databases, message queues, peer discovery |

## Creating a Basic Headless Service

This service selects pods with the label `app: redis` and exposes port 6379.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: default
spec:
  # Setting clusterIP to None makes this a headless service
  clusterIP: None
  # Selector determines which pods belong to this service
  selector:
    app: redis
  ports:
    - port: 6379
      targetPort: 6379
      name: redis
```

Apply and verify:

```bash
kubectl apply -f redis-headless-service.yaml
kubectl get svc redis
```

Output will show:

```
NAME    TYPE        CLUSTER-IP   EXTERNAL-IP   PORT(S)    AGE
redis   ClusterIP   None         <none>        6379/TCP   10s
```

The `CLUSTER-IP` column shows `None` instead of an IP address.

## DNS Behavior for Headless Services

From inside any pod in the cluster, you can resolve the headless service name:

```bash
# Run a temporary pod to test DNS
kubectl run -it --rm dns-test --image=busybox:1.28 --restart=Never -- nslookup redis
```

For a headless service with three pods, you will see three A records:

```
Server:    10.96.0.10
Address 1: 10.96.0.10 kube-dns.kube-system.svc.cluster.local

Name:      redis
Address 1: 10.244.1.5 redis-0.redis.default.svc.cluster.local
Address 2: 10.244.2.8 redis-1.redis.default.svc.cluster.local
Address 3: 10.244.3.2 redis-2.redis.default.svc.cluster.local
```

Each pod gets its own DNS entry. Your application receives all three IPs and can connect to any or all of them.

## Headless Services with StatefulSets

The real power of headless services emerges when paired with StatefulSets. StatefulSets give pods stable, predictable names like `redis-0`, `redis-1`, `redis-2`. Combined with a headless service, each pod gets a stable DNS name that survives pod restarts.

### Complete StatefulSet with Headless Service

This example deploys a three-node Redis cluster where each node is directly addressable.

```yaml
# First, create the headless service
# This must exist before the StatefulSet so pods can register DNS entries
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: default
  labels:
    app: redis
spec:
  clusterIP: None
  selector:
    app: redis
  ports:
    - port: 6379
      targetPort: 6379
      name: redis
---
# The StatefulSet references the headless service by name
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
  namespace: default
spec:
  # serviceName links this StatefulSet to the headless service
  # This field is required and must match the service name exactly
  serviceName: redis
  replicas: 3
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
        - name: redis
          image: redis:7.2
          ports:
            - containerPort: 6379
              name: redis
          # Each pod gets its own persistent volume
          volumeMounts:
            - name: data
              mountPath: /data
  # VolumeClaimTemplate creates a PVC for each pod
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes:
          - ReadWriteOnce
        resources:
          requests:
            storage: 1Gi
```

### Pod DNS Naming Convention

With the above configuration, Kubernetes creates these DNS entries:

| Pod Name | Full DNS Name | Purpose |
| --- | --- | --- |
| redis-0 | redis-0.redis.default.svc.cluster.local | Primary/first replica |
| redis-1 | redis-1.redis.default.svc.cluster.local | Second replica |
| redis-2 | redis-2.redis.default.svc.cluster.local | Third replica |

The DNS naming pattern is:

```
<pod-name>.<service-name>.<namespace>.svc.cluster.local
```

From within the same namespace, you can use the short form:

```
<pod-name>.<service-name>
```

### Verifying DNS Resolution

```bash
# List the pods first
kubectl get pods -l app=redis -o wide

# Test DNS from a pod
kubectl run -it --rm dns-test --image=busybox:1.28 --restart=Never -- sh

# Inside the test pod, query each Redis instance
nslookup redis-0.redis
nslookup redis-1.redis
nslookup redis-2.redis
```

## Stable Network Identity Across Restarts

Pods keep their identity even after restarts. If `redis-1` crashes and gets rescheduled to a different node, it still comes back as `redis-1` with the same DNS name and the same PersistentVolumeClaim.

```bash
# Delete a pod to simulate failure
kubectl delete pod redis-1

# Watch it come back with the same name
kubectl get pods -l app=redis -w
```

The replacement pod will:
- Have the same name: `redis-1`
- Mount the same PVC: `data-redis-1`
- Register the same DNS entry: `redis-1.redis`
- Get a new IP address (but the DNS name stays the same)

Applications should connect using DNS names, not IP addresses, to handle this correctly.

## Use Case: Database Replication

Databases with primary-replica setups need to know which instance is primary and how to reach each replica.

### PostgreSQL Replication Example

```yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: database
spec:
  clusterIP: None
  selector:
    app: postgres
  ports:
    - port: 5432
      name: postgres
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: database
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
      containers:
        - name: postgres
          image: postgres:16
          ports:
            - containerPort: 5432
          env:
            # Pod-specific configuration using downward API
            - name: POD_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
            # Replicas know to connect to postgres-0 as primary
            - name: PRIMARY_HOST
              value: "postgres-0.postgres.database.svc.cluster.local"
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes:
          - ReadWriteOnce
        resources:
          requests:
            storage: 10Gi
```

The replicas can determine their role based on their pod name:
- `postgres-0`: Always the primary
- `postgres-1`, `postgres-2`: Replicas that connect to `postgres-0`

### Connection Strings

Applications that need to write go to the primary:

```
postgresql://postgres-0.postgres.database:5432/mydb
```

Applications that can read from any replica query the service name:

```
postgresql://postgres.database:5432/mydb
```

## Use Case: Peer Discovery in Distributed Systems

Distributed systems like Elasticsearch, Cassandra, and Kafka need nodes to discover each other. Headless services provide the mechanism.

### Elasticsearch Cluster Discovery

```yaml
apiVersion: v1
kind: Service
metadata:
  name: elasticsearch
  namespace: search
spec:
  clusterIP: None
  selector:
    app: elasticsearch
  ports:
    - port: 9200
      name: http
    - port: 9300
      name: transport
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: elasticsearch
  namespace: search
spec:
  serviceName: elasticsearch
  replicas: 3
  selector:
    matchLabels:
      app: elasticsearch
  template:
    metadata:
      labels:
        app: elasticsearch
    spec:
      initContainers:
        # Increase virtual memory for Elasticsearch
        - name: sysctl
          image: busybox
          command: ["sysctl", "-w", "vm.max_map_count=262144"]
          securityContext:
            privileged: true
      containers:
        - name: elasticsearch
          image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
          ports:
            - containerPort: 9200
              name: http
            - containerPort: 9300
              name: transport
          env:
            - name: node.name
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
            - name: cluster.name
              value: "es-cluster"
            # Seed hosts for cluster formation
            # Each node discovers others via headless service DNS
            - name: discovery.seed_hosts
              value: "elasticsearch-0.elasticsearch,elasticsearch-1.elasticsearch,elasticsearch-2.elasticsearch"
            - name: cluster.initial_master_nodes
              value: "elasticsearch-0,elasticsearch-1,elasticsearch-2"
            - name: ES_JAVA_OPTS
              value: "-Xms512m -Xmx512m"
          volumeMounts:
            - name: data
              mountPath: /usr/share/elasticsearch/data
          resources:
            requests:
              memory: 1Gi
              cpu: 500m
            limits:
              memory: 2Gi
              cpu: 1000m
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes:
          - ReadWriteOnce
        resources:
          requests:
            storage: 10Gi
```

The `discovery.seed_hosts` environment variable lists the DNS names of all potential cluster members. When a new node starts, it queries these DNS names and connects to form or join the cluster.

## Combining Headless and Regular Services

Sometimes you need both direct pod access and load-balanced access. Create two services pointing at the same pods.

```yaml
# Headless service for direct pod access and StatefulSet DNS
apiVersion: v1
kind: Service
metadata:
  name: cassandra
  namespace: database
spec:
  clusterIP: None
  selector:
    app: cassandra
  ports:
    - port: 9042
      name: cql
---
# Regular service for load-balanced client connections
apiVersion: v1
kind: Service
metadata:
  name: cassandra-client
  namespace: database
spec:
  # ClusterIP is assigned automatically
  selector:
    app: cassandra
  ports:
    - port: 9042
      name: cql
```

Clients that need any available node connect to `cassandra-client`. Nodes that need to discover peers use the headless `cassandra` service.

## Debugging Headless Services

### Check Endpoints

Endpoints are the pod IPs backing a service. Verify they exist:

```bash
# List endpoints for the headless service
kubectl get endpoints redis

# Detailed view showing IPs and ports
kubectl describe endpoints redis
```

Expected output for a three-replica StatefulSet:

```
Name:         redis
Namespace:    default
Labels:       app=redis
Subsets:
  Addresses:          10.244.1.5,10.244.2.8,10.244.3.2
  NotReadyAddresses:  <none>
  Ports:
    Name     Port  Protocol
    ----     ----  --------
    redis    6379  TCP
```

### Verify Pod Readiness

Pods only appear in endpoints if they pass readiness probes:

```bash
# Check pod status
kubectl get pods -l app=redis

# Check readiness probe status
kubectl describe pod redis-0 | grep -A 5 "Readiness"
```

### Test DNS from Inside the Cluster

```bash
# Create a debug pod
kubectl run -it --rm debug --image=busybox:1.28 --restart=Never -- sh

# Test service DNS
nslookup redis

# Test individual pod DNS
nslookup redis-0.redis
nslookup redis-1.redis

# Test with dig for more detail
kubectl run -it --rm debug --image=tutum/dnsutils --restart=Never -- dig redis.default.svc.cluster.local
```

### Common Issues and Solutions

| Problem | Symptom | Solution |
| --- | --- | --- |
| No endpoints | DNS returns NXDOMAIN | Check selector labels match pod labels |
| Missing pod DNS | Can resolve service but not pods | Verify StatefulSet serviceName matches service name |
| Stale DNS | Old IPs returned | Wait for DNS TTL (30s default) or restart coredns |
| Pods not ready | Endpoints list is incomplete | Check readiness probes and pod logs |

## Publishing Not Ready Addresses

By default, pods only get DNS entries when they are Ready. For some applications, you want DNS entries even for pods that are starting up or failing probes. Use `publishNotReadyAddresses`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: redis
spec:
  clusterIP: None
  # Include pods regardless of readiness state
  publishNotReadyAddresses: true
  selector:
    app: redis
  ports:
    - port: 6379
```

This is useful when:
- Nodes need to discover peers before they finish initialization
- You want to connect to a pod for debugging even if it is failing health checks
- Your application handles unavailable nodes gracefully

## Performance Considerations

Headless services add DNS queries to your application flow. Consider these optimizations:

### DNS Caching

```yaml
# Add dnsConfig to your pod spec
spec:
  dnsConfig:
    options:
      - name: ndots
        value: "2"
      - name: timeout
        value: "2"
      - name: attempts
        value: "2"
```

### Connection Pooling

Instead of resolving DNS for every request, maintain connection pools to known pod IPs:

```python
# Python example: resolve once, reuse connections
import socket

# Get all pod IPs
ips = socket.getaddrinfo('redis', 6379, socket.AF_INET)
pod_ips = [ip[4][0] for ip in ips]

# Create connections to each pod
connections = {ip: create_connection(ip, 6379) for ip in pod_ips}
```

### Watch for Endpoint Changes

For applications that need real-time updates when pods are added or removed, watch the Endpoints resource:

```bash
kubectl get endpoints redis -w
```

## Summary

Headless services give you direct access to pods without load balancing. The key points:

1. Set `clusterIP: None` to create a headless service
2. DNS returns A records for each pod IP instead of a single ClusterIP
3. Pair with StatefulSets for stable pod DNS names like `pod-0.service`
4. Use for databases, distributed systems, and peer-to-peer discovery
5. Combine with regular services when you need both direct and load-balanced access

The pattern is simple but powerful. When your application needs to know exactly which pod it is talking to, headless services provide the foundation.
