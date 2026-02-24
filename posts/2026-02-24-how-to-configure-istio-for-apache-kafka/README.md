# How to Configure Istio for Apache Kafka

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kafka, Service Mesh, Kubernetes, Messaging

Description: How to configure Istio for Apache Kafka in Kubernetes covering TCP routing, broker discovery, mTLS, and handling Kafka's unique protocol requirements.

---

Apache Kafka is the backbone of event-driven architectures, and running it in Kubernetes is increasingly common with tools like Strimzi and Confluent Operator. But Kafka's protocol has some unique characteristics that require careful Istio configuration. If you get it wrong, producers and consumers will fail to connect or experience mysterious timeouts.

The core challenge is that Kafka uses a binary protocol with a broker discovery mechanism that returns broker addresses to clients. This needs special attention in a service mesh environment.

## How Kafka's Protocol Works with Istio

When a Kafka client connects, it first talks to a bootstrap server. That server responds with metadata containing the addresses and ports of all brokers in the cluster. The client then connects directly to the specific broker that holds the partition it needs.

This means every broker must be individually addressable by clients. If you are using a single Service that load-balances across all brokers, the metadata response will contain individual broker addresses that may not match where the client was originally connected.

## Kafka Deployment with StatefulSet

Use a StatefulSet with a headless Service so each broker gets a predictable DNS name:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: kafka-headless
  namespace: messaging
spec:
  clusterIP: None
  selector:
    app: kafka
  ports:
    - name: tcp-kafka
      port: 9092
      targetPort: 9092
---
apiVersion: v1
kind: Service
metadata:
  name: kafka-bootstrap
  namespace: messaging
spec:
  selector:
    app: kafka
  ports:
    - name: tcp-kafka
      port: 9092
      targetPort: 9092
```

The headless service gives each pod a DNS entry like `kafka-0.kafka-headless.messaging.svc.cluster.local`. The regular `kafka-bootstrap` service is what clients use for initial connection.

The StatefulSet:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: kafka
  namespace: messaging
spec:
  serviceName: kafka-headless
  replicas: 3
  selector:
    matchLabels:
      app: kafka
  template:
    metadata:
      labels:
        app: kafka
    spec:
      containers:
        - name: kafka
          image: confluentinc/cp-kafka:7.6.0
          ports:
            - containerPort: 9092
              name: tcp-kafka
          env:
            - name: KAFKA_LISTENER_SECURITY_PROTOCOL_MAP
              value: "PLAINTEXT:PLAINTEXT"
            - name: KAFKA_LISTENERS
              value: "PLAINTEXT://0.0.0.0:9092"
            - name: KAFKA_INTER_BROKER_LISTENER_NAME
              value: PLAINTEXT
```

The critical piece is the `KAFKA_ADVERTISED_LISTENERS` configuration. Each broker must advertise its StatefulSet DNS name so clients can find it. You typically set this with an init container or a startup script that reads the pod's hostname:

```yaml
- name: KAFKA_ADVERTISED_LISTENERS
  value: "PLAINTEXT://$(POD_NAME).kafka-headless.messaging.svc.cluster.local:9092"
- name: POD_NAME
  valueFrom:
    fieldRef:
      fieldPath: metadata.name
```

## DestinationRule for Kafka

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: kafka
  namespace: messaging
spec:
  host: kafka-headless.messaging.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 500
        connectTimeout: 10s
        idleTimeout: 600s
    tls:
      mode: ISTIO_MUTUAL
```

Also create one for the bootstrap service:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: kafka-bootstrap
  namespace: messaging
spec:
  host: kafka-bootstrap.messaging.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 10s
    tls:
      mode: ISTIO_MUTUAL
```

Kafka clients maintain long-lived connections, so set `idleTimeout` high enough to avoid premature disconnections.

## Handling Kafka's Broker Discovery

The biggest gotcha is Kafka's metadata response. When a client asks for metadata, the broker returns a list of all brokers with their hostnames and ports. If those hostnames are not resolvable from the client's pod, connections will fail.

With the StatefulSet and headless Service setup, brokers advertise names like `kafka-0.kafka-headless.messaging.svc.cluster.local:9092`. Any pod in the cluster can resolve these names, and the Istio sidecar can route the traffic correctly.

If your clients are in a different namespace, make sure they can resolve the full DNS name. The FQDN format `<pod>.<headless-service>.<namespace>.svc.cluster.local` works from any namespace.

## VirtualService for Kafka

A basic VirtualService for TCP routing:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: kafka
  namespace: messaging
spec:
  hosts:
    - kafka-headless.messaging.svc.cluster.local
    - kafka-bootstrap.messaging.svc.cluster.local
  tcp:
    - match:
        - port: 9092
      route:
        - destination:
            host: kafka-headless.messaging.svc.cluster.local
            port:
              number: 9092
```

## Connecting to External Kafka (Confluent Cloud, MSK)

For managed Kafka services:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: confluent-cloud
  namespace: messaging
spec:
  hosts:
    - "*.confluent.cloud"
  ports:
    - number: 9092
      name: tcp-kafka
      protocol: TCP
  location: MESH_EXTERNAL
  resolution: NONE
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: confluent-cloud
  namespace: messaging
spec:
  host: "*.confluent.cloud"
  trafficPolicy:
    tls:
      mode: SIMPLE
```

The wildcard is important because Confluent Cloud (and AWS MSK) use different hostnames for each broker. The client discovers these through the metadata response.

## Access Control for Kafka

Restrict which services can produce and consume:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: kafka-access
  namespace: messaging
spec:
  selector:
    matchLabels:
      app: kafka
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - cluster.local/ns/app/sa/order-service
              - cluster.local/ns/app/sa/notification-service
              - cluster.local/ns/app/sa/analytics-consumer
      to:
        - operation:
            ports: ["9092"]
    - from:
        - source:
            namespaces:
              - messaging
      to:
        - operation:
            ports: ["9092"]
```

The last rule allows Kafka brokers to communicate with each other for replication and controller operations.

## ZooKeeper Considerations

If your Kafka deployment still uses ZooKeeper (Kafka is moving to KRaft mode), you also need Istio configuration for ZooKeeper:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: zookeeper-headless
  namespace: messaging
spec:
  clusterIP: None
  selector:
    app: zookeeper
  ports:
    - name: tcp-client
      port: 2181
      targetPort: 2181
    - name: tcp-peer
      port: 2888
      targetPort: 2888
    - name: tcp-election
      port: 3888
      targetPort: 3888
```

All three ZooKeeper ports should be named with the `tcp-` prefix.

## Monitoring Kafka Through Istio

Track connection metrics:

```
istio_tcp_connections_opened_total{destination_service="kafka-headless.messaging.svc.cluster.local"}
istio_tcp_sent_bytes_total{destination_service="kafka-headless.messaging.svc.cluster.local"}
istio_tcp_received_bytes_total{destination_service="kafka-headless.messaging.svc.cluster.local"}
```

Correlate these with Kafka's own JMX metrics for a complete picture of throughput and lag.

## Troubleshooting

If producers or consumers cannot connect through Istio:

1. Check that advertised listeners use the full StatefulSet DNS names
2. Verify the sidecar is injected in both client and broker pods
3. Look at the proxy logs for connection errors: `kubectl logs <kafka-pod> -c istio-proxy`
4. Check that the ServiceEntry covers all broker hostnames for external Kafka
5. Make sure port names start with `tcp-`

Getting Kafka right with Istio requires attention to the broker discovery mechanism. Once every broker is individually addressable and the advertised listeners match resolvable DNS names, things work smoothly. The mTLS and access control features from Istio add a valuable security layer on top of whatever Kafka-native security you have in place.
