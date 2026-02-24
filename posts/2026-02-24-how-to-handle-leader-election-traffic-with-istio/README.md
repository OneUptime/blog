# How to Handle Leader Election Traffic with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Leader Election, Distributed Systems, Networking

Description: Configure Istio to correctly handle leader election traffic patterns used by distributed systems including lease-based and consensus-based election mechanisms.

---

Leader election is a fundamental pattern in distributed systems. One instance becomes the leader that coordinates work, and the others stand by as followers. The election process relies on timely communication between instances, and when Istio's sidecar proxy sits in the middle of that communication, latency or configuration issues can cause election failures, split-brain scenarios, or unnecessary leader transitions.

This guide covers how to configure Istio to support different leader election patterns without interfering with the election process.

## Kubernetes Lease-Based Leader Election

The most common leader election in Kubernetes uses the Lease API. Controllers and operators compete to acquire a Lease object, and the holder becomes the leader. This traffic goes directly to the Kubernetes API server, not between pods.

For Lease-based election, the critical path is between your pods and the API server:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: controller-sidecar
  namespace: my-system
spec:
  workloadSelector:
    labels:
      app: my-controller
  egress:
  - hosts:
    - "istio-system/*"
    - "kube-system/*"
  - port:
      number: 443
    hosts:
    - "*/kubernetes.default.svc.cluster.local"
```

Make sure the sidecar allows traffic to the Kubernetes API server. If you're using `REGISTRY_ONLY` outbound policy, the API server needs to be reachable.

The biggest risk with Lease-based election through Istio is latency. If sidecar latency causes a leader to miss its renewal deadline, it loses the lease and a new election happens. Check the sidecar's latency overhead:

```bash
# Time a direct API server call vs through the sidecar
kubectl exec my-pod -c app -- curl -w "%{time_total}" -o /dev/null -s https://kubernetes.default.svc:443/healthz
```

## Application-Level Leader Election

Some applications implement their own leader election using direct pod-to-pod communication. etcd uses Raft, ZooKeeper uses ZAB, and many applications use custom protocols. This traffic is latency-sensitive and often uses TCP or gRPC.

For a service that uses gRPC-based election:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-cluster
  namespace: distributed
spec:
  clusterIP: None
  ports:
  - port: 7070
    name: grpc-election
  - port: 8080
    name: http-api
  selector:
    app: my-cluster
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-cluster-election
  namespace: distributed
spec:
  host: my-cluster.distributed.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        connectTimeout: 2s
        tcpKeepalive:
          time: 10s
          interval: 5s
          probes: 3
      http:
        maxRetries: 0
    loadBalancer:
      simple: ROUND_ROBIN
```

Key settings:
- `connectTimeout: 2s` - Election protocols have tight timeouts. Slow connections cause false leader failures.
- `maxRetries: 0` - Don't retry election messages. Retrying a stale vote or heartbeat can cause confusion in the election algorithm.
- Aggressive `tcpKeepalive` - Detect failed peers quickly so elections can proceed.

## etcd and Raft Traffic

If you're running etcd in the mesh (which is rare but possible), the Raft protocol requires:
- Peer communication on port 2380
- Client communication on port 2379

```yaml
apiVersion: v1
kind: Service
metadata:
  name: etcd
  namespace: etcd-system
spec:
  clusterIP: None
  ports:
  - port: 2379
    name: tcp-client
  - port: 2380
    name: tcp-peer
  selector:
    app: etcd
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: etcd-peers
  namespace: etcd-system
spec:
  host: etcd.etcd-system.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 50
        connectTimeout: 1s
        tcpKeepalive:
          time: 10s
          interval: 5s
          probes: 2
```

Raft has an election timeout (typically 1-5 seconds). If the sidecar adds more latency than the election timeout allows, you'll see constant leader elections. Monitor for this:

```promql
# If using etcd metrics
etcd_server_leader_changes_seen_total
```

## Reducing Sidecar Latency for Election Traffic

If sidecar overhead is causing election instability, there are several approaches:

**1. Use headless services for direct pod addressing:**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-cluster
spec:
  clusterIP: None
  ports:
  - port: 7070
    name: grpc-election
```

Headless services resolve to pod IPs directly, skipping the Kubernetes kube-proxy layer.

**2. Bypass the sidecar for election traffic:**

If sidecar latency is truly unacceptable, you can exclude the election port from sidecar interception:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: my-cluster
spec:
  template:
    metadata:
      annotations:
        traffic.sidecar.istio.io/excludeOutboundPorts: "7070"
        traffic.sidecar.istio.io/excludeInboundPorts: "7070"
    spec:
      containers:
      - name: app
        ports:
        - containerPort: 7070
          name: election
        - containerPort: 8080
          name: api
```

This tells the sidecar to not intercept traffic on port 7070. Election traffic flows directly between pods without going through Envoy. You lose mTLS and observability for that port, but you get the lowest possible latency.

**3. Tune the sidecar concurrency:**

```yaml
annotations:
  proxy.istio.io/config: |
    concurrency: 2
```

More worker threads reduce per-request latency under load.

## Handling Election During Deployments

Rolling updates of a StatefulSet with leader election need care. If the leader pod is terminated, a new election must complete before the cluster can accept writes. Configure your deployment strategy:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: my-cluster
spec:
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      partition: 0
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          drainDuration: 30s
    spec:
      terminationGracePeriodSeconds: 60
```

The drain duration should be long enough for the election to complete and for the departing node to transfer its responsibilities. In practice, 30 seconds is usually sufficient for most election algorithms.

## Authorization Policies for Election Traffic

Election traffic should only flow between members of the same cluster. Lock it down with authorization policies:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: election-traffic
  namespace: distributed
spec:
  selector:
    matchLabels:
      app: my-cluster
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/distributed/sa/my-cluster"
    to:
    - operation:
        ports: ["7070"]
  action: ALLOW
```

This ensures only pods with the `my-cluster` service account can send election traffic. An attacker who compromises another pod in the namespace can't interfere with the election.

## Monitoring Election Health

Watch for signs that Istio is interfering with election:

```bash
# Check sidecar latency for election-related connections
istioctl proxy-config log my-cluster-0 --level connection:debug

# Look for connection timeouts
kubectl logs my-cluster-0 -c istio-proxy | grep -i "timeout\|reset\|connection"
```

Application-level metrics are the best indicator:

```promql
# Election events (should be rare)
leader_election_count_total

# Time since last successful leader heartbeat
leader_heartbeat_age_seconds
```

If leader election events spike during deployments or when sidecar configuration pushes happen, you've found the correlation. Leader election and service mesh can coexist well, but it requires attention to timeouts, latency, and proper traffic classification.
