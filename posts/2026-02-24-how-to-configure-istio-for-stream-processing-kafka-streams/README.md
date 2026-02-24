# How to Configure Istio for Stream Processing (Kafka Streams)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kafka, Stream Processing, Kubernetes, Service Mesh

Description: How to configure Istio for Kafka Streams and other stream processing workloads on Kubernetes with proper TCP settings and protocol handling.

---

Stream processing applications like Kafka Streams, Apache Flink, and Spark Streaming have unique networking requirements that can clash with Istio's default configuration. These applications maintain long-lived TCP connections to message brokers, communicate over non-HTTP protocols, and transfer high volumes of data continuously. Getting Istio to play nicely with these workloads takes some specific tuning.

This guide focuses on Kafka Streams as the primary example, but the principles apply to other stream processing frameworks running on Kubernetes.

## How Kafka Streams Communicates

Kafka Streams applications connect to Kafka brokers using the Kafka binary protocol over TCP. They also use an internal RPC mechanism for interactive queries between application instances. None of this is HTTP traffic, which means Istio's default HTTP-centric configuration does not apply well.

The main traffic patterns are:

- Consumer connections to Kafka brokers (long-lived TCP)
- Producer connections to Kafka brokers (long-lived TCP)
- Inter-instance communication for state store queries (HTTP or custom protocol)
- Health check and metrics endpoints (HTTP)

## Setting Up the Namespace

```bash
kubectl create namespace stream-processing
kubectl label namespace stream-processing istio-injection=enabled
```

## Deploying Kafka Streams with Istio

Here is a typical Kafka Streams deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-processor
  namespace: stream-processing
  labels:
    app: order-processor
spec:
  replicas: 3
  selector:
    matchLabels:
      app: order-processor
  template:
    metadata:
      labels:
        app: order-processor
    spec:
      containers:
      - name: streams-app
        image: myregistry/order-processor:1.0
        ports:
        - containerPort: 8080
          name: http-health
        - containerPort: 9095
          name: tcp-rpc
        env:
        - name: KAFKA_BOOTSTRAP_SERVERS
          value: "kafka-0.kafka.kafka.svc.cluster.local:9092,kafka-1.kafka.kafka.svc.cluster.local:9092,kafka-2.kafka.kafka.svc.cluster.local:9092"
        - name: APPLICATION_SERVER
          valueFrom:
            fieldRef:
              fieldPath: status.podIP
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1"
```

The Service definition needs proper port naming so Istio handles the protocols correctly:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: order-processor
  namespace: stream-processing
spec:
  selector:
    app: order-processor
  ports:
  - name: http-health
    port: 8080
    targetPort: 8080
  - name: tcp-rpc
    port: 9095
    targetPort: 9095
```

Notice the port naming. Ports prefixed with `http-` are treated as HTTP. Ports prefixed with `tcp-` are treated as raw TCP. This is critical for Istio to handle the traffic correctly.

## Configuring Access to Kafka Brokers

If your Kafka cluster is outside the mesh (which is common), you need ServiceEntry resources:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: kafka-brokers
  namespace: stream-processing
spec:
  hosts:
  - "kafka-0.kafka.kafka.svc.cluster.local"
  - "kafka-1.kafka.kafka.svc.cluster.local"
  - "kafka-2.kafka.kafka.svc.cluster.local"
  ports:
  - number: 9092
    name: tcp-kafka
    protocol: TCP
  resolution: DNS
  location: MESH_EXTERNAL
```

If Kafka is in a different namespace within the mesh, a Sidecar resource can control visibility:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Sidecar
metadata:
  name: order-processor-sidecar
  namespace: stream-processing
spec:
  workloadSelector:
    labels:
      app: order-processor
  egress:
  - hosts:
    - "kafka/*"
    - "stream-processing/*"
    - "istio-system/*"
```

## Connection Pool Tuning for Kafka Connections

Kafka connections are long-lived and should not be closed prematurely:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: kafka-connection-pool
  namespace: stream-processing
spec:
  host: "kafka-0.kafka.kafka.svc.cluster.local"
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 200
        connectTimeout: 30s
        tcpKeepalive:
          time: 120s
          interval: 30s
          probes: 5
```

Apply similar DestinationRules for each Kafka broker. The TCP keepalive settings prevent connections from being dropped by intermediate network devices.

## Handling Kafka Protocol Sniffing

Istio tries to detect the protocol being used on each connection. For Kafka's binary protocol, this detection can cause issues. You can tell Istio to skip protocol detection for Kafka traffic:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: kafka-no-tls
  namespace: stream-processing
spec:
  host: "*.kafka.kafka.svc.cluster.local"
  trafficPolicy:
    tls:
      mode: DISABLE
```

If you need mTLS between your streams application and Kafka, configure it at the Kafka level using SASL/SSL rather than relying on Istio's mTLS.

## Inter-Instance Communication

Kafka Streams allows you to query state stores across instances using interactive queries. This requires each instance to be reachable by other instances. A headless service works well for this:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: order-processor-headless
  namespace: stream-processing
spec:
  clusterIP: None
  selector:
    app: order-processor
  ports:
  - name: tcp-rpc
    port: 9095
    targetPort: 9095
```

Configure an Istio DestinationRule for the inter-instance traffic:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: order-processor-internal
  namespace: stream-processing
spec:
  host: order-processor-headless
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 50
        connectTimeout: 5s
    loadBalancer:
      simple: ROUND_ROBIN
```

## Avoiding Sidecar Interference with Kafka Rebalancing

Kafka Streams uses consumer group rebalancing to distribute partitions across instances. If the Istio sidecar is not ready when the application starts, the rebalancing can fail. Use the hold annotation:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-processor
  namespace: stream-processing
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          holdApplicationUntilProxyStarts: true
```

This ensures the Envoy proxy is fully initialized before your Kafka Streams application starts connecting to brokers.

## Resource Limits for the Sidecar

Stream processing applications are already resource-intensive. Keep the sidecar's footprint small:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-processor
  namespace: stream-processing
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/proxyCPU: "100m"
        sidecar.istio.io/proxyMemory: "128Mi"
        sidecar.istio.io/proxyCPULimit: "500m"
        sidecar.istio.io/proxyMemoryLimit: "256Mi"
```

## Monitoring Stream Processing with Istio Metrics

Even though Kafka traffic is TCP, Istio still generates useful metrics:

```bash
# Check TCP connections from stream processors
kubectl exec -n istio-system deploy/prometheus -- \
  promtool query instant 'sum(istio_tcp_connections_opened_total{source_workload_namespace="stream-processing"}) by (source_workload, destination_service)'

# Check bytes sent/received
kubectl exec -n istio-system deploy/prometheus -- \
  promtool query instant 'sum(rate(istio_tcp_sent_bytes_total{source_workload_namespace="stream-processing"}[5m])) by (source_workload)'
```

## When to Skip the Sidecar

For some stream processing workloads, the Istio sidecar adds more overhead than value. If your streams application only talks to Kafka and does not expose HTTP APIs or receive inbound requests from other services, consider excluding it from the mesh:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: simple-consumer
  namespace: stream-processing
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/inject: "false"
```

## Summary

Configuring Istio for Kafka Streams and stream processing boils down to: proper port naming for TCP traffic, generous connection pool and keepalive settings, ServiceEntry resources for external Kafka brokers, and making sure the sidecar is ready before the application starts. The biggest pitfalls are protocol detection issues with Kafka's binary protocol and premature connection closing due to default timeout settings.
