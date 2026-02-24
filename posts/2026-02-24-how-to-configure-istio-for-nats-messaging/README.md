# How to Configure Istio for NATS Messaging

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, NATS, Service Mesh, Kubernetes, Messaging

Description: How to configure Istio service mesh for NATS messaging in Kubernetes including client connections, cluster routing, JetStream, and monitoring setup.

---

NATS is a lightweight, high-performance messaging system that is popular in cloud-native architectures. It is fast, simple, and supports multiple messaging patterns including pub/sub, request/reply, and queuing. Running NATS behind Istio adds mTLS encryption and access control without needing to configure NATS-native TLS.

NATS uses a text-based protocol over TCP that is somewhat similar to HTTP but is not HTTP. Istio treats it as TCP traffic, and the configuration is straightforward once you know which ports to expose.

## NATS Ports

NATS has three main ports:
- 4222: Client connections
- 6222: Cluster routing (server-to-server)
- 8222: HTTP monitoring endpoint

## Service and Deployment

```yaml
apiVersion: v1
kind: Service
metadata:
  name: nats
  namespace: messaging
spec:
  selector:
    app: nats
  ports:
    - name: tcp-client
      port: 4222
      targetPort: 4222
    - name: http-monitoring
      port: 8222
      targetPort: 8222
---
apiVersion: v1
kind: Service
metadata:
  name: nats-headless
  namespace: messaging
spec:
  clusterIP: None
  selector:
    app: nats
  ports:
    - name: tcp-client
      port: 4222
      targetPort: 4222
    - name: tcp-cluster
      port: 6222
      targetPort: 6222
    - name: http-monitoring
      port: 8222
      targetPort: 8222
```

Port 8222 gets the `http-` prefix because the NATS monitoring endpoint serves actual HTTP/JSON responses. Port 4222 and 6222 use `tcp-` since they use NATS' custom protocol.

The Deployment for a single NATS server:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nats
  namespace: messaging
  labels:
    app: nats
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nats
  template:
    metadata:
      labels:
        app: nats
    spec:
      containers:
        - name: nats
          image: nats:2.10
          ports:
            - containerPort: 4222
              name: tcp-client
            - containerPort: 8222
              name: http-monitoring
          args:
            - "-m"
            - "8222"
```

## NATS Cluster with StatefulSet

For high availability, run a NATS cluster:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: nats
  namespace: messaging
spec:
  serviceName: nats-headless
  replicas: 3
  selector:
    matchLabels:
      app: nats
  template:
    metadata:
      labels:
        app: nats
    spec:
      containers:
        - name: nats
          image: nats:2.10
          ports:
            - containerPort: 4222
              name: tcp-client
            - containerPort: 6222
              name: tcp-cluster
            - containerPort: 8222
              name: http-monitoring
          args:
            - "--cluster_name"
            - "my-nats"
            - "--cluster"
            - "nats://0.0.0.0:6222"
            - "--routes"
            - "nats://nats-0.nats-headless.messaging.svc.cluster.local:6222,nats://nats-1.nats-headless.messaging.svc.cluster.local:6222,nats://nats-2.nats-headless.messaging.svc.cluster.local:6222"
            - "-m"
            - "8222"
```

Each NATS server in the cluster needs to know the routes to other servers. Using the StatefulSet DNS names ensures these routes are stable and resolvable.

## DestinationRule

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: nats
  namespace: messaging
spec:
  host: nats.messaging.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 1000
        connectTimeout: 5s
        idleTimeout: 300s
    tls:
      mode: ISTIO_MUTUAL
```

NATS connections are typically long-lived, but NATS has its own ping/pong mechanism that keeps connections alive. The default NATS ping interval is 2 minutes, so an `idleTimeout` of 300 seconds (5 minutes) works well.

The `maxConnections` is set high because NATS is designed for many concurrent connections. A single NATS server can handle tens of thousands of connections.

For the headless service (cluster routing):

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: nats-cluster
  namespace: messaging
spec:
  host: nats-headless.messaging.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 5s
    tls:
      mode: ISTIO_MUTUAL
```

## JetStream Configuration

NATS JetStream provides persistence and at-least-once delivery. It runs on the same client port (4222) so no additional Istio configuration is needed for the port. However, JetStream uses more data transfer and longer connections, so adjust your settings:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: nats-jetstream
  namespace: messaging
spec:
  host: nats.messaging.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 1000
        connectTimeout: 5s
        idleTimeout: 600s
    tls:
      mode: ISTIO_MUTUAL
```

Increase the `idleTimeout` for JetStream workloads since consumers may have periods of inactivity between messages.

## NATS with LeafNode Connections

NATS supports leaf nodes, which are NATS servers that connect to a central cluster to extend the messaging topology. Leaf nodes typically connect on port 7422:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: nats-leafnode
  namespace: messaging
spec:
  selector:
    app: nats
  ports:
    - name: tcp-leafnode
      port: 7422
      targetPort: 7422
```

Configure your NATS server to accept leaf node connections:

```yaml
args:
  - "--cluster_name"
  - "my-nats"
  - "--cluster"
  - "nats://0.0.0.0:6222"
  - "--leafnodes"
  - "nats://0.0.0.0:7422"
```

## External NATS

For connecting to a NATS server outside the mesh:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-nats
  namespace: messaging
spec:
  hosts:
    - nats.external.example.com
  ports:
    - number: 4222
      name: tcp-nats
      protocol: TCP
  location: MESH_EXTERNAL
  resolution: DNS
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: external-nats
  namespace: messaging
spec:
  host: nats.external.example.com
  trafficPolicy:
    tls:
      mode: SIMPLE
```

## Access Control

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: nats-access
  namespace: messaging
spec:
  selector:
    matchLabels:
      app: nats
  action: ALLOW
  rules:
    - from:
        - source:
            namespaces:
              - app
              - backend
              - workers
      to:
        - operation:
            ports: ["4222"]
    - from:
        - source:
            namespaces:
              - messaging
      to:
        - operation:
            ports: ["6222"]
    - from:
        - source:
            principals:
              - cluster.local/ns/monitoring/sa/prometheus
      to:
        - operation:
            ports: ["8222"]
```

Client connections from application namespaces go to port 4222. Cluster routing on port 6222 is restricted to the messaging namespace. The monitoring endpoint on 8222 is only accessible to Prometheus.

## Monitoring NATS Through Istio

NATS has a built-in HTTP monitoring endpoint. You can scrape it with Prometheus directly:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: nats
  namespace: messaging
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "8222"
    prometheus.io/path: "/varz"
```

In addition to NATS-native metrics, Istio provides TCP-level metrics:

```
istio_tcp_connections_opened_total{destination_service="nats.messaging.svc.cluster.local"}
istio_tcp_sent_bytes_total{destination_service="nats.messaging.svc.cluster.local"}
```

And HTTP metrics for the monitoring endpoint:

```
istio_requests_total{destination_service="nats.messaging.svc.cluster.local", destination_port="8222"}
```

## Sidecar Scope

NATS servers do not need to know about most services in the mesh. Reduce the proxy memory footprint:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: nats-sidecar
  namespace: messaging
spec:
  workloadSelector:
    labels:
      app: nats
  egress:
    - hosts:
        - "istio-system/*"
        - "messaging/*"
```

## Troubleshooting

If NATS clients cannot connect, check port naming first. If the NATS cluster cannot form, verify that port 6222 is accessible between pods and that the route URLs match the StatefulSet DNS names. Check the NATS server logs for connection errors and the Istio proxy logs for any TLS handshake failures.

```bash
kubectl logs nats-0 -n messaging -c nats
kubectl logs nats-0 -n messaging -c istio-proxy --tail=50
```

NATS and Istio work well together because NATS is already designed for cloud-native environments. The mesh adds encryption and access control on top of an already lightweight and efficient messaging system.
