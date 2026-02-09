# How to Use internalTrafficPolicy to Keep Traffic Node-Local

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Networking, Performance

Description: Configure internalTrafficPolicy to route internal cluster traffic only to pods on the same node, reducing network latency and bandwidth usage while improving application performance in Kubernetes clusters.

---

The internalTrafficPolicy field in Kubernetes services controls how traffic from pods within the cluster routes to service endpoints. By setting this policy to Local, you ensure traffic only goes to pods on the same node as the client, eliminating cross-node network hops and reducing latency. This guide explains when and how to use this feature effectively.

## Understanding Traffic Routing Behavior

By default, Kubernetes services use Cluster traffic policy. When a pod sends a request to a service, kube-proxy load balances across all available endpoints regardless of which node they're on.

For a service with pods on nodes A, B, and C, a client pod on node A might send traffic to a pod on node C. This creates a network hop between nodes, adding latency and consuming inter-node bandwidth.

With internalTrafficPolicy set to Local, traffic from node A only goes to pods on node A. If no local pods exist, the connection fails. This behavior differs from externalTrafficPolicy, which applies only to traffic entering through NodePort or LoadBalancer services.

## Basic Configuration

Configure internalTrafficPolicy in your service definition:

```yaml
# node-local-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: cache-service
  namespace: production
spec:
  type: ClusterIP
  internalTrafficPolicy: Local  # Route to local pods only
  selector:
    app: cache
    tier: memory
  ports:
  - protocol: TCP
    port: 6379
    targetPort: 6379
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: cache
  namespace: production
spec:
  selector:
    matchLabels:
      app: cache
      tier: memory
  template:
    metadata:
      labels:
        app: cache
        tier: memory
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        resources:
          limits:
            memory: "512Mi"
            cpu: "500m"
```

Notice the use of DaemonSet instead of Deployment. DaemonSets ensure exactly one pod runs on each node, guaranteeing local endpoints are always available.

Apply the configuration:

```bash
kubectl apply -f node-local-service.yaml
```

## Testing Node-Local Routing

Verify that traffic stays on the same node. Deploy a client pod and check which cache instance it connects to:

```bash
# Deploy a client pod on a specific node
kubectl run cache-client --image=redis:7-alpine --restart=Never \
  --overrides='{"spec":{"nodeName":"worker-node-1"}}' \
  --command -- sleep 3600

# Connect to cache service and check which instance responds
kubectl exec cache-client -- redis-cli -h cache-service PING
```

Check the server info to identify which pod handled the request:

```bash
kubectl exec cache-client -- redis-cli -h cache-service INFO server | grep process_id
```

Compare this with the process IDs of cache pods:

```bash
# Get the cache pod running on the same node
kubectl get pods -l app=cache -o wide | grep worker-node-1

# Check its process ID
kubectl exec cache-abc123 -- redis-cli INFO server | grep process_id
```

The process IDs should match, confirming local routing.

## Use Case: Node-Local Caching

Node-local traffic policy works perfectly for caching layers. Deploy a cache on every node and configure applications to use it:

```yaml
# node-cache-complete.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-cache
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: node-cache
  template:
    metadata:
      labels:
        app: node-cache
    spec:
      containers:
      - name: memcached
        image: memcached:1.6-alpine
        ports:
        - containerPort: 11211
          name: memcache
        resources:
          limits:
            memory: "1Gi"
            cpu: "500m"
          requests:
            memory: "512Mi"
            cpu: "250m"
---
apiVersion: v1
kind: Service
metadata:
  name: node-cache
  namespace: kube-system
spec:
  type: ClusterIP
  internalTrafficPolicy: Local
  selector:
    app: node-cache
  ports:
  - protocol: TCP
    port: 11211
    targetPort: 11211
```

Applications connect to `node-cache.kube-system.svc.cluster.local:11211` and automatically use their local cache instance.

## Handling Missing Local Endpoints

The biggest risk with Local traffic policy is connection failures when no local pod exists. This happens when:

- A node has no matching pods (for Deployments)
- The local pod is unhealthy or terminating
- Pod scheduling constraints prevent local placement

Deploy a monitoring sidecar to detect this scenario:

```yaml
# app-with-monitoring.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 10
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
      - name: app
        image: myapp:latest
        env:
        - name: CACHE_ADDR
          value: "node-cache.kube-system.svc.cluster.local:11211"
      - name: connection-monitor
        image: busybox
        command:
        - sh
        - -c
        - |
          while true; do
            if ! nc -zv node-cache.kube-system.svc.cluster.local 11211 2>&1 | grep -q succeeded; then
              echo "ERROR: Cannot reach local cache"
            fi
            sleep 30
          done
```

Better yet, make your application resilient by implementing fallback logic:

```python
# Python application example
import memcache
import logging

def get_cache_client():
    """Get memcache client with fallback to cluster-wide cache"""
    try:
        # Try node-local cache first
        local_client = memcache.Client(
            ['node-cache.kube-system.svc.cluster.local:11211'],
            socket_timeout=1  # Fail fast
        )
        # Test connection
        local_client.get('test')
        return local_client
    except Exception as e:
        logging.warning(f"Local cache unavailable: {e}, falling back to cluster cache")
        # Fall back to cluster-wide cache with Cluster policy
        return memcache.Client(
            ['cluster-cache.kube-system.svc.cluster.local:11211']
        )

cache = get_cache_client()
```

## Combining with Topology Aware Hints

For more sophisticated routing, combine internalTrafficPolicy with topology aware hints:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: smart-routing-service
  annotations:
    service.kubernetes.io/topology-mode: Auto
spec:
  type: ClusterIP
  internalTrafficPolicy: Local
  selector:
    app: my-app
  ports:
  - port: 80
```

This configuration prefers same-node routing but can fall back to same-zone routing if no local endpoints exist (when supported by your CNI).

## Performance Testing

Measure the latency improvement from node-local routing. Deploy a benchmark tool:

```bash
# Deploy test service with Cluster policy (default)
kubectl apply -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: test-cluster-policy
spec:
  type: ClusterIP
  internalTrafficPolicy: Cluster
  selector:
    app: test-server
  ports:
  - port: 8080
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: test-server
spec:
  selector:
    matchLabels:
      app: test-server
  template:
    metadata:
      labels:
        app: test-server
    spec:
      containers:
      - name: server
        image: hashicorp/http-echo
        args:
        - -text=hello
        ports:
        - containerPort: 8080
EOF

# Deploy same service with Local policy
kubectl apply -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: test-local-policy
spec:
  type: ClusterIP
  internalTrafficPolicy: Local
  selector:
    app: test-server
  ports:
  - port: 8080
EOF
```

Run latency tests from a client pod:

```bash
# Deploy client
kubectl run benchmark --image=fortio/fortio --restart=Never -- sleep 3600

# Test Cluster policy latency
kubectl exec benchmark -- fortio load -c 10 -qps 1000 -t 60s \
  http://test-cluster-policy:8080/

# Test Local policy latency
kubectl exec benchmark -- fortio load -c 10 -qps 1000 -t 60s \
  http://test-local-policy:8080/
```

Typical results show 30-50% latency reduction for node-local routing:

- Cluster policy: avg 2.5ms, p99 8.2ms
- Local policy: avg 1.2ms, p99 3.1ms

## Resource Monitoring Patterns

Node-local services create different resource usage patterns. Monitor pod resource consumption across nodes:

```bash
# Check memory usage distribution
kubectl top pods -l app=node-cache --sort-by=memory

# Verify each node has consistent cache size
kubectl get pods -l app=node-cache -o wide
kubectl exec node-cache-abc -- redis-cli INFO memory | grep used_memory_human
kubectl exec node-cache-def -- redis-cli INFO memory | grep used_memory_human
```

Uneven usage indicates problems with pod distribution or application traffic patterns.

## Common Pitfalls

Avoid these mistakes when using internalTrafficPolicy:

**Don't use Local policy with Deployments that have replicas less than node count**. You'll have nodes without local endpoints:

```yaml
# BAD: Only 3 replicas but 10 nodes
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cache
spec:
  replicas: 3  # Not enough for all nodes!
---
apiVersion: v1
kind: Service
metadata:
  name: cache
spec:
  internalTrafficPolicy: Local  # Will fail on 7 nodes
```

**Use DaemonSet or ensure sufficient replicas**:

```yaml
# GOOD: DaemonSet guarantees local pod on every node
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: cache
```

**Don't forget node selectors**. If your DaemonSet excludes certain nodes, those nodes won't have local endpoints:

```yaml
# Ensure your DaemonSet runs on all nodes that need it
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: cache
spec:
  template:
    spec:
      nodeSelector:
        node-role.kubernetes.io/worker: ""  # Only on workers
```

## Debugging Connection Failures

When clients can't connect to a Local policy service, check these areas:

```bash
# Verify local pod exists on the client's node
CLIENT_NODE=$(kubectl get pod my-client -o jsonpath='{.spec.nodeName}')
kubectl get pods -l app=cache -o wide | grep $CLIENT_NODE

# Check pod readiness
kubectl get pods -l app=cache -o jsonpath='{.items[*].status.conditions[?(@.type=="Ready")].status}'

# Verify service endpoints
kubectl get endpointslices -l kubernetes.io/service-name=cache-service

# Check if endpoints are on the right node
kubectl get endpointslices -l kubernetes.io/service-name=cache-service -o jsonpath='{.items[*].endpoints[*].nodeName}'
```

Use tcpdump to verify traffic stays local:

```bash
# On the client node
kubectl debug node/$CLIENT_NODE -it --image=nicolaka/netshoot
tcpdump -i any port 6379 -n
```

You should only see traffic between local pod IPs, not cross-node traffic.

## Conclusion

InternalTrafficPolicy provides a simple way to optimize east-west traffic in your cluster by keeping connections node-local. It works best with DaemonSets for services like caches, log collectors, and monitoring agents that benefit from local access patterns. The performance gains are substantial, but you must ensure every node has healthy local endpoints to avoid connection failures.
