# How to Handle Storage Replication Traffic with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Storage, Replication, Kubernetes, Service Mesh, Traffic Management

Description: Learn how to properly route and manage storage replication traffic through Istio service mesh without breaking data consistency or performance.

---

Storage replication is one of those things that works perfectly fine until you put a service mesh in front of it. Then suddenly you're dealing with connection resets, unexpected latency, and replication lag that makes your database team very unhappy. If you're running replicated storage systems inside a Kubernetes cluster with Istio, you need to understand how the mesh interacts with replication traffic and how to configure things properly.

## Why Storage Replication Traffic is Different

Most application traffic follows a simple request-response pattern. Storage replication traffic is a different beast entirely. It often involves long-lived TCP connections, large data transfers, and protocols that are sensitive to latency and connection interruptions. When Istio's Envoy sidecar intercepts this traffic, it can introduce overhead that breaks replication or degrades performance.

Common storage systems that rely on replication include:

- Cassandra (inter-node gossip and streaming)
- MongoDB replica sets
- PostgreSQL streaming replication
- Ceph OSD replication
- MinIO erasure-coded replication

Each of these has its own replication protocol, but they all share a need for reliable, low-latency connectivity between nodes.

## Bypassing the Sidecar for Storage Replication

The most straightforward approach is to exclude replication ports from Istio's interception. You can do this with pod annotations:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: cassandra
spec:
  template:
    metadata:
      annotations:
        traffic.sidecar.istio.io/excludeInboundPorts: "7000,7001"
        traffic.sidecar.istio.io/excludeOutboundPorts: "7000,7001"
    spec:
      containers:
      - name: cassandra
        ports:
        - containerPort: 9042
          name: cql
        - containerPort: 7000
          name: intra-node
        - containerPort: 7001
          name: tls-intra-node
```

Port 9042 (the CQL client port) still goes through Istio, so you get mTLS and observability for client connections. But ports 7000 and 7001 (inter-node replication) bypass the sidecar completely.

## Using DestinationRules for Replication Traffic

If you want replication traffic to flow through the mesh but need to tune how Istio handles it, DestinationRules are your friend:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: cassandra-replication
  namespace: storage
spec:
  host: cassandra.storage.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 500
        connectTimeout: 30s
        tcpKeepalive:
          time: 300s
          interval: 60s
          probes: 5
      http:
        h2UpgradePolicy: DO_NOT_UPGRADE
    portLevelSettings:
    - port:
        number: 7000
      connectionPool:
        tcp:
          maxConnections: 100
          connectTimeout: 10s
```

The key settings here are the TCP keepalive configuration and the connection pool limits. Storage replication often holds connections open for extended periods, and without proper keepalive settings, Envoy might close them prematurely.

## Handling Large Data Transfers

Replication often involves transferring large chunks of data, especially during initial sync or recovery operations. Envoy has buffer limits that can cause issues with these transfers. You can adjust them using an EnvoyFilter:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: storage-replication-buffer
  namespace: storage
spec:
  workloadSelector:
    labels:
      app: cassandra
  configPatches:
  - applyTo: CLUSTER
    match:
      context: SIDECAR_OUTBOUND
    patch:
      operation: MERGE
      value:
        per_connection_buffer_limit_bytes: 32768
```

## Setting Up a Dedicated ServiceEntry for External Replication

If your storage replication spans clusters or reaches external nodes, you need ServiceEntry resources:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-cassandra-nodes
  namespace: storage
spec:
  hosts:
  - cassandra-dc2.example.com
  ports:
  - number: 7000
    name: intra-node
    protocol: TCP
  - number: 7001
    name: tls-intra-node
    protocol: TCP
  resolution: DNS
  location: MESH_EXTERNAL
```

This tells Istio about the external replication endpoints so traffic can flow properly. Without this, outbound connections to external replication peers get blocked or misrouted by the mesh.

## PeerAuthentication for Storage Namespaces

If you're running strict mTLS across your cluster, storage replication ports might need special treatment:

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: storage-mtls
  namespace: storage
spec:
  selector:
    matchLabels:
      app: cassandra
  mtls:
    mode: STRICT
  portLevelMtls:
    7000:
      mode: DISABLE
    7001:
      mode: PERMISSIVE
```

This keeps strict mTLS on client-facing ports but relaxes it on replication ports. Port 7001 in Cassandra already uses its own TLS, so layering Istio mTLS on top is redundant and adds unnecessary overhead.

## Monitoring Replication Traffic Through Istio

Even if you bypass the sidecar for replication traffic, you can still monitor it at the network level. But if replication flows through the mesh, Istio gives you useful metrics:

```bash
# Check replication connection counts
kubectl exec -n istio-system deploy/prometheus -- \
  promtool query instant http://localhost:9090 \
  'istio_tcp_connections_opened_total{destination_service="cassandra.storage.svc.cluster.local",destination_port="7000"}'

# Monitor bytes transferred on replication ports
kubectl exec -n istio-system deploy/prometheus -- \
  promtool query instant http://localhost:9090 \
  'istio_tcp_sent_bytes_total{destination_port="7000"}'
```

## Network Policies to Complement Istio

For defense in depth, combine Istio policies with Kubernetes NetworkPolicies:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: cassandra-replication
  namespace: storage
spec:
  podSelector:
    matchLabels:
      app: cassandra
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: cassandra
    ports:
    - port: 7000
      protocol: TCP
    - port: 7001
      protocol: TCP
```

This ensures only Cassandra pods can talk to each other on replication ports, regardless of what Istio is doing.

## Performance Tuning Tips

A few practical things that help when running storage replication through Istio:

1. Set `holdApplicationUntilProxyStarts` to true in your Istio mesh config. This prevents storage pods from trying to replicate before the sidecar is ready.

2. Increase the proxy concurrency for storage workloads:

```yaml
annotations:
  proxy.istio.io/config: |
    concurrency: 4
```

3. Consider using `traffic.sidecar.istio.io/excludeInterfaces` if your storage system uses specific network interfaces for replication.

4. Monitor Envoy memory usage on storage pods. Replication traffic can cause the sidecar to consume significant memory if buffer sizes are not tuned properly.

## When to Skip the Mesh Entirely

Sometimes the best approach is to not mesh your storage pods at all. If you're running a storage system that handles its own encryption, authentication, and is only accessed by internal services, the mesh adds overhead without much benefit. You can exclude entire pods:

```yaml
annotations:
  sidecar.istio.io/inject: "false"
```

The tradeoff is that you lose Istio's observability and policy enforcement for those workloads. But for high-throughput replication, the performance gain can be significant. Measure the impact in your environment and decide based on actual numbers, not assumptions.

Storage replication through a service mesh requires careful consideration of your specific storage system, replication protocol, and performance requirements. Start with port exclusions for replication traffic, then gradually bring more traffic through the mesh as you gain confidence in the configuration.
