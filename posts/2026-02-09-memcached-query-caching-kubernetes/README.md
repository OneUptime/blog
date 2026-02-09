# How to Deploy Memcached for Database Query Caching on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Memcached, Caching, Database, Performance

Description: Implement Memcached on Kubernetes for database query caching to reduce load and improve response times, including deployment strategies, client integration, cache invalidation patterns, and monitoring.

---

Memcached reduces database load by caching frequently accessed query results in memory. On Kubernetes, deploying Memcached as a distributed cache layer improves application performance while keeping complexity manageable through consistent hashing and automatic discovery.

## Understanding Memcached Architecture

Memcached stores key-value pairs entirely in RAM, providing sub-millisecond access times. Unlike databases, Memcached has no persistence and data disappears on restart. This makes it perfect for caching ephemeral data like query results, session data, or computed values.

The cache operates as a shared resource across application pods. Multiple applications can access the same cached data, reducing redundant database queries. When memory fills up, Memcached evicts least recently used items automatically.

Consistent hashing distributes cache keys across multiple Memcached pods. Clients hash keys to determine which pod stores each item. This distribution spreads load and memory usage evenly. Adding or removing pods affects only a subset of keys rather than invalidating the entire cache.

## Deploying Memcached on Kubernetes

Create a StatefulSet for Memcached:

```yaml
# memcached.yaml
apiVersion: v1
kind: Service
metadata:
  name: memcached
  namespace: caching
  labels:
    app: memcached
spec:
  clusterIP: None
  ports:
    - port: 11211
      name: memcached
  selector:
    app: memcached
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: memcached
  namespace: caching
spec:
  serviceName: memcached
  replicas: 3
  selector:
    matchLabels:
      app: memcached
  template:
    metadata:
      labels:
        app: memcached
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
                        - memcached
                topologyKey: kubernetes.io/hostname
      containers:
        - name: memcached
          image: memcached:1.6-alpine
          ports:
            - containerPort: 11211
              name: memcached
          command:
            - memcached
            - -m 512
            - -c 1024
            - -t 4
            - -v
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "1Gi"
              cpu: "1000m"
          livenessProbe:
            tcpSocket:
              port: 11211
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            tcpSocket:
              port: 11211
            initialDelaySeconds: 5
            periodSeconds: 5
```

Create namespace and deploy:

```bash
kubectl create namespace caching
kubectl apply -f memcached.yaml
```

## Implementing Cache-Aside Pattern

Integrate Memcached with application using cache-aside pattern:

```python
# Python example with pymemcache
from pymemcache.client.hash import HashClient
import psycopg2
import json

# Configure Memcached cluster
MEMCACHED_SERVERS = [
    ('memcached-0.memcached.caching.svc.cluster.local', 11211),
    ('memcached-1.memcached.caching.svc.cluster.local', 11211),
    ('memcached-2.memcached.caching.svc.cluster.local', 11211),
]

cache = HashClient(MEMCACHED_SERVERS)

def get_user(user_id):
    """Get user with caching"""
    cache_key = f"user:{user_id}"
    
    # Try cache first
    cached = cache.get(cache_key)
    if cached:
        return json.loads(cached)
    
    # Cache miss - query database
    conn = psycopg2.connect("postgresql://...")
    cur = conn.cursor()
    cur.execute("SELECT id, username, email FROM users WHERE id = %s", (user_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    
    if row:
        user = {'id': row[0], 'username': row[1], 'email': row[2]}
        # Store in cache for 5 minutes
        cache.set(cache_key, json.dumps(user), expire=300)
        return user
    
    return None

def update_user(user_id, username, email):
    """Update user and invalidate cache"""
    conn = psycopg2.connect("postgresql://...")
    cur = conn.cursor()
    cur.execute(
        "UPDATE users SET username = %s, email = %s WHERE id = %s",
        (username, email, user_id)
    )
    conn.commit()
    cur.close()
    conn.close()
    
    # Invalidate cache
    cache_key = f"user:{user_id}"
    cache.delete(cache_key)
```

## Configuring Service Discovery

Deploy a headless service for automatic discovery:

```yaml
# memcached-discovery.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: memcached-discovery
  namespace: caching
data:
  discover.py: |
    #!/usr/bin/env python3
    import socket
    import sys
    
    def discover_memcached_pods():
        """Discover Memcached pods via DNS"""
        try:
            hostname = "memcached.caching.svc.cluster.local"
            result = socket.getaddrinfo(hostname, 11211, socket.AF_INET)
            servers = [(addr[4][0], 11211) for addr in result]
            return servers
        except Exception as e:
            print(f"Discovery failed: {e}", file=sys.stderr)
            return []
    
    if __name__ == "__main__":
        servers = discover_memcached_pods()
        for server in servers:
            print(f"{server[0]}:{server[1]}")
```

## Implementing Cache Warming

Pre-populate cache with frequently accessed data:

```yaml
# cache-warmer-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cache-warmer
  namespace: caching
spec:
  schedule: "*/30 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: warmer
              image: myapp:latest
              command:
                - python
                - /scripts/warm_cache.py
              env:
                - name: DATABASE_URL
                  valueFrom:
                    secretKeyRef:
                      name: database-credentials
                      key: url
                - name: MEMCACHED_SERVERS
                  value: "memcached-0.memcached.caching.svc.cluster.local:11211,memcached-1.memcached.caching.svc.cluster.local:11211,memcached-2.memcached.caching.svc.cluster.local:11211"
```

## Monitoring Cache Performance

Deploy Memcached exporter for Prometheus:

```yaml
# memcached-exporter.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: memcached-exporter
  namespace: caching
spec:
  replicas: 1
  selector:
    matchLabels:
      app: memcached-exporter
  template:
    metadata:
      labels:
        app: memcached-exporter
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9150"
    spec:
      containers:
        - name: exporter
          image: prom/memcached-exporter:v0.14.0
          args:
            - --memcached.address=memcached-0.memcached.caching.svc.cluster.local:11211
            - --memcached.address=memcached-1.memcached.caching.svc.cluster.local:11211
            - --memcached.address=memcached-2.memcached.caching.svc.cluster.local:11211
          ports:
            - containerPort: 9150
              name: metrics
          resources:
            requests:
              memory: "64Mi"
              cpu: "50m"
            limits:
              memory: "128Mi"
              cpu: "200m"
```

Key metrics to monitor:
- Hit rate (memcached_commands_total{command="get",status="hit"})
- Miss rate (memcached_commands_total{command="get",status="miss"})
- Eviction rate (memcached_items_evicted_total)
- Memory usage (memcached_current_bytes)

## Setting Cache Expiration Policies

Implement smart expiration based on data type:

```python
# Different TTLs for different data types
CACHE_TTL = {
    'user_profile': 600,      # 10 minutes
    'product_catalog': 1800,  # 30 minutes
    'session': 3600,          # 1 hour
    'static_content': 86400,  # 24 hours
}

def cache_with_ttl(data_type, key, value):
    """Cache with appropriate TTL"""
    ttl = CACHE_TTL.get(data_type, 300)  # Default 5 minutes
    cache.set(key, value, expire=ttl)
```

## Handling Cache Stampede

Prevent cache stampede with locking:

```python
import time
import hashlib

def get_with_lock(key, fetch_func, ttl=300):
    """Get from cache with stampede protection"""
    # Try cache first
    cached = cache.get(key)
    if cached:
        return json.loads(cached)
    
    # Acquire lock
    lock_key = f"lock:{key}"
    lock_acquired = cache.add(lock_key, "1", expire=10)
    
    if lock_acquired:
        try:
            # Fetch from database
            value = fetch_func()
            if value:
                cache.set(key, json.dumps(value), expire=ttl)
            return value
        finally:
            cache.delete(lock_key)
    else:
        # Wait for lock holder to populate cache
        time.sleep(0.1)
        return get_with_lock(key, fetch_func, ttl)
```

Memcached on Kubernetes provides a simple yet powerful caching layer that dramatically reduces database load. With proper cache invalidation strategies and monitoring, Memcached enables applications to scale read capacity without proportionally scaling database resources.
