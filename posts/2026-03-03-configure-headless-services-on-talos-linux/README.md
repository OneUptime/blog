# How to Configure Headless Services on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Headless Service, DNS, Kubernetes, StatefulSet, Service Discovery

Description: Learn how to configure and use headless services on Talos Linux for direct pod-to-pod communication and stateful workload discovery.

---

Regular Kubernetes services give you a single stable IP (ClusterIP) that load-balances traffic across backend pods. That works great for stateless workloads, but sometimes you need to reach individual pods directly. Databases, message brokers, and distributed systems often need clients to connect to specific instances. Headless services solve this by providing DNS records that point directly to pod IPs instead of going through a proxy.

On Talos Linux, headless services work the same way as on any Kubernetes distribution, but there are practical considerations around DNS behavior, StatefulSets, and performance that are worth understanding.

## What Makes a Service Headless

A headless service is simply a service with `clusterIP: None`. Instead of getting a virtual IP, the service's DNS name resolves to the IP addresses of all the pods behind it:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-db
  namespace: default
spec:
  clusterIP: None
  selector:
    app: my-db
  ports:
  - port: 5432
    targetPort: 5432
```

When you look up `my-db.default.svc.cluster.local`, instead of getting a single ClusterIP, you get multiple A records - one for each pod that matches the selector.

```bash
# Regular service - returns one ClusterIP
dig my-web.default.svc.cluster.local +short
# 10.96.1.50

# Headless service - returns individual pod IPs
dig my-db.default.svc.cluster.local +short
# 10.244.1.15
# 10.244.2.23
# 10.244.3.8
```

## When to Use Headless Services

Headless services are the right choice when:

- You need client-side load balancing (the client picks which pod to connect to)
- You are running stateful workloads where each pod has a distinct identity
- You need to enumerate all pod IPs (e.g., for cluster formation in databases)
- You want to use SRV records for service discovery
- Your application protocol handles connection management itself (like database connection pools)

## Headless Services with StatefulSets

The most common use of headless services is with StatefulSets. Each pod in a StatefulSet gets a stable DNS name through the headless service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: data
  labels:
    app: postgres
spec:
  clusterIP: None
  selector:
    app: postgres
  ports:
  - name: pg
    port: 5432
    targetPort: 5432
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: data
spec:
  serviceName: postgres  # Must match the headless service name
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
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-credentials
              key: password
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
          storage: 50Gi
```

This creates predictable DNS names for each pod:

```bash
# Individual pod DNS names (stable across restarts)
postgres-0.postgres.data.svc.cluster.local
postgres-1.postgres.data.svc.cluster.local
postgres-2.postgres.data.svc.cluster.local

# The service name itself resolves to all pod IPs
postgres.data.svc.cluster.local -> [all three pod IPs]
```

## Configuring Applications to Use Headless Services

Different applications handle headless service DNS differently.

### Database Client Configuration

```yaml
# PostgreSQL with primary/replica pattern
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: backend
data:
  # Connect to a specific pod (the primary)
  DB_PRIMARY_HOST: "postgres-0.postgres.data.svc.cluster.local"
  DB_PRIMARY_PORT: "5432"

  # Connect to replicas for read traffic
  DB_REPLICA_HOSTS: "postgres-1.postgres.data.svc.cluster.local,postgres-2.postgres.data.svc.cluster.local"
```

### Redis Cluster Discovery

```yaml
apiVersion: v1
kind: Service
metadata:
  name: redis-cluster
  namespace: cache
spec:
  clusterIP: None
  selector:
    app: redis-cluster
  ports:
  - name: client
    port: 6379
  - name: gossip
    port: 16379
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-cluster
  namespace: cache
spec:
  serviceName: redis-cluster
  replicas: 6
  selector:
    matchLabels:
      app: redis-cluster
  template:
    metadata:
      labels:
        app: redis-cluster
    spec:
      containers:
      - name: redis
        image: redis:7
        ports:
        - containerPort: 6379
        - containerPort: 16379
        command: ["redis-server"]
        args:
        - "--cluster-enabled"
        - "yes"
        - "--cluster-config-file"
        - "/data/nodes.conf"
        - "--cluster-node-timeout"
        - "5000"
```

Initialize the Redis cluster using the headless DNS names:

```bash
# Create the Redis cluster using pod DNS names
kubectl exec -n cache redis-cluster-0 -- redis-cli --cluster create \
    redis-cluster-0.redis-cluster.cache.svc.cluster.local:6379 \
    redis-cluster-1.redis-cluster.cache.svc.cluster.local:6379 \
    redis-cluster-2.redis-cluster.cache.svc.cluster.local:6379 \
    redis-cluster-3.redis-cluster.cache.svc.cluster.local:6379 \
    redis-cluster-4.redis-cluster.cache.svc.cluster.local:6379 \
    redis-cluster-5.redis-cluster.cache.svc.cluster.local:6379 \
    --cluster-replicas 1 --cluster-yes
```

## SRV Records for Port Discovery

Headless services with named ports automatically get SRV records. This is useful when clients need to discover both the host and port:

```bash
# Query SRV records
kubectl run dns-test --rm -it --restart=Never --image=busybox -- \
    nslookup -type=SRV _pg._tcp.postgres.data.svc.cluster.local

# Output:
# _pg._tcp.postgres.data.svc.cluster.local  service = 0 33 5432 postgres-0.postgres.data.svc.cluster.local.
# _pg._tcp.postgres.data.svc.cluster.local  service = 0 33 5432 postgres-1.postgres.data.svc.cluster.local.
# _pg._tcp.postgres.data.svc.cluster.local  service = 0 33 5432 postgres-2.postgres.data.svc.cluster.local.
```

## DNS Caching Considerations

Headless services present a caching challenge. Pod IPs change more frequently than ClusterIPs (pods get rescheduled, scaled up/down), so aggressive DNS caching can cause stale records.

On Talos Linux with CoreDNS, the default TTL for Kubernetes records is 30 seconds. You can adjust this:

```
kubernetes cluster.local in-addr.arpa ip6.arpa {
   pods insecure
   fallthrough in-addr.arpa ip6.arpa
   ttl 5   # Reduce TTL for faster pod discovery updates
}
```

Lower TTLs mean more DNS queries but faster discovery of pod changes. For frequently changing StatefulSets, a TTL of 5-10 seconds is reasonable.

Also consider the application-side caching. Many language runtimes cache DNS results independently. Java, for instance, caches DNS indefinitely by default:

```java
// In Java, disable DNS caching or set a short TTL
java.security.Security.setProperty("networkaddress.cache.ttl", "10");
java.security.Security.setProperty("networkaddress.cache.negative.ttl", "5");
```

## Headless Service Without Selectors

You can create headless services without selectors to point to external resources:

```yaml
# Headless service pointing to an external database
apiVersion: v1
kind: Service
metadata:
  name: external-db
  namespace: data
spec:
  clusterIP: None
  ports:
  - port: 5432
---
apiVersion: v1
kind: Endpoints
metadata:
  name: external-db
  namespace: data
subsets:
- addresses:
  - ip: 192.168.1.100
  - ip: 192.168.1.101
  ports:
  - port: 5432
```

This lets your pods use `external-db.data.svc.cluster.local` to reach external database servers, and the DNS response includes the actual IPs.

## Monitoring Headless Services

Since headless services do not go through kube-proxy, you need different monitoring approaches:

```bash
#!/bin/bash
# check-headless-endpoints.sh
# Monitors endpoint health for headless services

SERVICE=$1
NAMESPACE=$2

# Get the current endpoints
ENDPOINTS=$(kubectl get endpoints "$SERVICE" -n "$NAMESPACE" -o json)
READY=$(echo "$ENDPOINTS" | jq '.subsets[0].addresses | length')
NOT_READY=$(echo "$ENDPOINTS" | jq '.subsets[0].notReadyAddresses | length // 0')

echo "Service: $SERVICE.$NAMESPACE"
echo "Ready endpoints: $READY"
echo "Not ready endpoints: $NOT_READY"

# List all endpoint IPs
echo ""
echo "Endpoint IPs:"
echo "$ENDPOINTS" | jq -r '.subsets[0].addresses[]?.ip'

# Test connectivity to each endpoint
echo ""
echo "Connectivity test:"
for ip in $(echo "$ENDPOINTS" | jq -r '.subsets[0].addresses[]?.ip'); do
    PORT=$(echo "$ENDPOINTS" | jq -r '.subsets[0].ports[0].port')
    kubectl run test-$RANDOM --rm -i --restart=Never --image=busybox -- \
        sh -c "nc -zw2 $ip $PORT && echo '$ip:$PORT - OK' || echo '$ip:$PORT - FAIL'" 2>/dev/null
done
```

## Combining Headless and ClusterIP Services

A common pattern is to have both a headless service (for direct pod access) and a regular ClusterIP service (for load-balanced access):

```yaml
# Headless service for direct pod access
apiVersion: v1
kind: Service
metadata:
  name: postgres-headless
  namespace: data
spec:
  clusterIP: None
  selector:
    app: postgres
  ports:
  - port: 5432

---
# Regular service for load-balanced access
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: data
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
```

Use the headless service when you need specific pods, and the regular service when any pod will do.

## Wrapping Up

Headless services on Talos Linux give you the DNS-based service discovery that stateful workloads need. They work naturally with StatefulSets to provide stable, predictable pod names, and SRV records enable both host and port discovery. The main things to watch out for are DNS TTL tuning (to balance freshness vs. query volume) and application-level DNS caching that can serve stale records. Use headless services when you need direct pod access, and pair them with regular services when you also need load-balanced access.
