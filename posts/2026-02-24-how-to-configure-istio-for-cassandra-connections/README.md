# How to Configure Istio for Cassandra Connections

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Cassandra, Service Mesh, Kubernetes, Database

Description: Configure Istio for Apache Cassandra connections in Kubernetes including CQL port routing, gossip protocol handling, multi-node cluster setup, and access control.

---

Apache Cassandra is a distributed database designed for handling large amounts of data across many nodes. It has a unique architecture where every node can accept reads and writes, and nodes communicate with each other using a gossip protocol. Running Cassandra in Kubernetes with Istio requires understanding how these communication patterns interact with the service mesh.

Cassandra uses the CQL (Cassandra Query Language) binary protocol for client connections and its own gossip protocol for inter-node communication. Both are TCP-based, and Istio needs to handle them appropriately.

## Cassandra Ports

Cassandra uses several ports:
- 9042: CQL native transport (client connections)
- 7000: Inter-node cluster communication (gossip)
- 7001: Inter-node TLS communication
- 7199: JMX monitoring
- 9160: Thrift client (legacy, rarely used)

## Service Configuration

You need both a headless service for inter-node communication and a regular service for client access:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: cassandra
  namespace: database
spec:
  selector:
    app: cassandra
  ports:
    - name: tcp-cql
      port: 9042
      targetPort: 9042
---
apiVersion: v1
kind: Service
metadata:
  name: cassandra-headless
  namespace: database
spec:
  clusterIP: None
  selector:
    app: cassandra
  ports:
    - name: tcp-cql
      port: 9042
      targetPort: 9042
    - name: tcp-gossip
      port: 7000
      targetPort: 7000
    - name: tcp-jmx
      port: 7199
      targetPort: 7199
```

All ports use the `tcp-` prefix since Cassandra's protocols are all binary TCP.

## Cassandra StatefulSet

Cassandra needs stable network identities for its gossip protocol, so a StatefulSet is the right choice:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: cassandra
  namespace: database
spec:
  serviceName: cassandra-headless
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
              name: tcp-cql
            - containerPort: 7000
              name: tcp-gossip
            - containerPort: 7199
              name: tcp-jmx
          env:
            - name: CASSANDRA_SEEDS
              value: "cassandra-0.cassandra-headless.database.svc.cluster.local,cassandra-1.cassandra-headless.database.svc.cluster.local"
            - name: CASSANDRA_CLUSTER_NAME
              value: "my-cluster"
            - name: CASSANDRA_DC
              value: "dc1"
            - name: CASSANDRA_RACK
              value: "rack1"
            - name: POD_IP
              valueFrom:
                fieldRef:
                  fieldPath: status.podIP
          resources:
            requests:
              memory: 4Gi
              cpu: "2"
            limits:
              memory: 4Gi
  volumeClaimTemplates:
    - metadata:
        name: cassandra-data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 50Gi
```

The `CASSANDRA_SEEDS` environment variable tells new nodes which existing nodes to contact when joining the cluster. Using the StatefulSet DNS names ensures these are always resolvable.

## DestinationRule for Client Connections

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: cassandra
  namespace: database
spec:
  host: cassandra.database.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 200
        connectTimeout: 10s
        idleTimeout: 3600s
    tls:
      mode: ISTIO_MUTUAL
```

Cassandra drivers maintain connection pools to multiple nodes. The Java driver, for example, opens one connection per node for control operations and configurable connections per node for requests. With 3 nodes and 2 connections per node, each application instance needs at least 6 connections. Multiply by the number of application instances to get the total.

## DestinationRule for Inter-Node Communication

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: cassandra-internal
  namespace: database
spec:
  host: cassandra-headless.database.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 15s
        idleTimeout: 7200s
    tls:
      mode: ISTIO_MUTUAL
```

Inter-node connections should have a longer idle timeout because gossip messages may be infrequent between some node pairs. The connect timeout is also slightly longer to account for nodes that might be slow to respond during compaction or other heavy operations.

## Handling Cassandra's Token-Aware Routing

Cassandra drivers use token-aware routing to send queries directly to the node that owns the data. The driver connects to all nodes and uses the token map to pick the right node for each query. This means your application needs direct connectivity to every Cassandra node.

With the headless service, each Cassandra pod has a DNS entry. The driver discovers all nodes through the initial connection and then connects to each one individually. Istio handles the mTLS for all these connections transparently.

Make sure the driver is configured to use the Kubernetes DNS names, not IP addresses. If Cassandra reports IP addresses in its system tables, the driver might try to connect to IPs that change when pods restart. Configure the `broadcast_rpc_address` in cassandra.yaml to use the pod's hostname.

## Authorization Policy

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: cassandra-access
  namespace: database
spec:
  selector:
    matchLabels:
      app: cassandra
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - cluster.local/ns/app/sa/backend-api
              - cluster.local/ns/app/sa/data-pipeline
      to:
        - operation:
            ports: ["9042"]
    - from:
        - source:
            namespaces:
              - database
      to:
        - operation:
            ports: ["7000", "7199"]
```

CQL access on port 9042 is restricted to specific service accounts. Gossip and JMX traffic on ports 7000 and 7199 is only allowed within the database namespace (for node-to-node communication).

## PeerAuthentication

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: cassandra-strict
  namespace: database
spec:
  selector:
    matchLabels:
      app: cassandra
  mtls:
    mode: STRICT
  portLevelMtls:
    7199:
      mode: PERMISSIVE
```

Strict mTLS for all ports except JMX (7199), which is set to PERMISSIVE because some JMX tools may not support mTLS.

## External Cassandra (DataStax Astra, etc.)

For managed Cassandra services:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: astra-cassandra
  namespace: database
spec:
  hosts:
    - "*.apps.astra.datastax.com"
  ports:
    - number: 29042
      name: tcp-cql
      protocol: TCP
  location: MESH_EXTERNAL
  resolution: NONE
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: astra-cassandra
  namespace: database
spec:
  host: "*.apps.astra.datastax.com"
  trafficPolicy:
    tls:
      mode: SIMPLE
```

DataStax Astra uses a secure connect bundle and port 29042 for CQL connections.

## Monitoring

Track Cassandra connections through Istio:

```
istio_tcp_connections_opened_total{destination_service="cassandra.database.svc.cluster.local"}
istio_tcp_sent_bytes_total{destination_service="cassandra.database.svc.cluster.local"}
```

Monitor inter-node traffic separately:

```
istio_tcp_sent_bytes_total{destination_service="cassandra-headless.database.svc.cluster.local", destination_port="7000"}
```

High inter-node traffic on port 7000 can indicate rebalancing, repairs, or streaming operations.

## Troubleshooting

If the Cassandra cluster cannot form through Istio, the most common cause is gossip traffic being blocked. Verify that:

1. Port 7000 is accessible between all Cassandra pods
2. The AuthorizationPolicy allows intra-namespace traffic on the gossip port
3. The seed list uses correct StatefulSet DNS names

Check Cassandra's nodetool output:

```bash
kubectl exec cassandra-0 -n database -- nodetool status
```

All nodes should show as UN (Up/Normal). If nodes show DN (Down/Normal) or are missing entirely, check the Istio proxy logs on the affected pods for connection errors.

Running Cassandra with Istio gives you encrypted inter-node and client traffic, granular access control, and connection metrics. The key is handling both the client-facing CQL port and the internal gossip port correctly.
