# How to Configure Flagger for Canary Deployments with WebSocket Services

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flagger, Canary, Kubernetes, WebSocket, Istio, Progressive Delivery

Description: Learn how to configure Flagger canary deployments for WebSocket services, handling persistent connections and proper traffic shifting with Istio.

---

## Introduction

WebSocket services present a unique challenge for canary deployments because they rely on long-lived, persistent connections. Unlike standard HTTP request-response cycles, a WebSocket connection is established via an HTTP upgrade and then remains open for bidirectional communication. This means traffic shifting must account for connection stickiness and the fact that existing connections will not move to a new backend mid-session.

This guide shows you how to configure Flagger with Istio to perform canary deployments on WebSocket services while handling these protocol-specific behaviors.

## Prerequisites

- A Kubernetes cluster (v1.25 or later)
- Flagger installed (v1.37 or later)
- Istio service mesh installed
- Prometheus installed for metrics collection
- kubectl access to your cluster

## Step 1: Deploy a WebSocket Service

Create a Deployment for a WebSocket server. The container should handle both the initial HTTP upgrade request and the subsequent WebSocket frames:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ws-server
  namespace: default
  labels:
    app: ws-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ws-server
  template:
    metadata:
      labels:
        app: ws-server
    spec:
      containers:
        - name: ws-server
          image: myregistry/ws-server:1.0.0
          ports:
            - name: http
              containerPort: 8080
              protocol: TCP
          readinessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
```

## Step 2: Create the Canary Resource

Configure the Flagger Canary resource. WebSocket connections start with an HTTP/1.1 upgrade request, so the standard HTTP routing configuration can route the initial handshake. The important addition is avoiding route or connection timeouts that are shorter than your expected WebSocket sessions:

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: ws-server
  namespace: default
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ws-server
  service:
    port: 8080
    targetPort: http
    trafficPolicy:
      connectionPool:
        tcp:
          maxConnections: 1000
          idleTimeout: 0s
        http:
          h2UpgradePolicy: DO_NOT_UPGRADE
          idleTimeout: 0s
      tls:
        mode: ISTIO_MUTUAL
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
      - name: request-duration
        thresholdRange:
          max: 1000
        interval: 1m
```

Key configuration points:

- `idleTimeout: 0s` disables the connection pool idle timeout so idle-but-open WebSocket connections are not closed by the upstream connection pool. If you do not want to disable it, set it higher than the longest expected idle period.
- `h2UpgradePolicy: DO_NOT_UPGRADE` keeps the upstream connection as HTTP/1.1. Standard WebSocket servers usually expect the RFC 6455 HTTP/1.1 upgrade handshake; HTTP/2 WebSocket tunneling requires explicit Extended CONNECT support in the proxy path.
- The analysis interval is set to `1m` instead of `30s` because WebSocket metrics arrive less frequently than typical HTTP request metrics.

## Step 3: Configure Istio for WebSocket Support

Istio supports WebSocket upgrades through Envoy. Flagger creates and reconciles the Istio VirtualService and DestinationRules from the Canary `service` spec, so place the traffic policy in the Canary resource rather than manually editing Flagger-generated objects. If you manage a DestinationRule yourself, verify that it does not interfere with WebSocket connections:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: ws-server
  namespace: default
spec:
  host: ws-server
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 1000
        connectTimeout: 30s
        idleTimeout: 0s
      http:
        h2UpgradePolicy: DO_NOT_UPGRADE
        maxRequestsPerConnection: 0
        idleTimeout: 0s
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
```

Setting `maxRequestsPerConnection: 0` leaves the upstream HTTP connection unlimited by request count, and `idleTimeout: 0s` disables idle connection timeout. If you use a finite idle timeout instead, set it higher than your WebSocket heartbeat interval or expected idle period.

## Step 4: Define WebSocket-Specific Metrics

The standard HTTP metrics apply to the initial WebSocket upgrade request. For ongoing WebSocket communication, you may want to track connection-level metrics:

```yaml
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: ws-active-connections
  namespace: default
spec:
  provider:
    type: prometheus
    address: http://prometheus.istio-system:9090
  query: |
    sum(istio_tcp_connections_opened_total{
      reporter="destination",
      destination_workload_namespace="{{ namespace }}",
      destination_workload="{{ target }}"
    }) -
    sum(istio_tcp_connections_closed_total{
      reporter="destination",
      destination_workload_namespace="{{ namespace }}",
      destination_workload="{{ target }}"
    })
```

Add this to your Canary analysis:

```yaml
  analysis:
    metrics:
      - name: ws-active-connections
        templateRef:
          name: ws-active-connections
          namespace: default
        thresholdRange:
          min: 1
        interval: 1m
```

## Step 5: Handle Connection Draining During Rollout

During a canary rollout, existing WebSocket connections remain on their current backend. New connections are distributed according to the canary weights. This means:

1. Users with active WebSocket connections to the primary (v1) will stay on v1.
2. New connections will be split between primary and canary based on the current weights.
3. After promotion, existing connections to the old version will eventually close naturally or need to be drained.

To facilitate graceful connection draining, configure a `preStop` hook in your Deployment:

```yaml
spec:
  template:
    spec:
      containers:
        - name: ws-server
          lifecycle:
            preStop:
              exec:
                command:
                  - /bin/sh
                  - -c
                  - "sleep 15"
      terminationGracePeriodSeconds: 30
```

This delays the TERM signal for 15 seconds while Kubernetes removes the pod from service endpoints. The full `terminationGracePeriodSeconds` budget includes both the `preStop` hook and application shutdown, so the application should still handle SIGTERM and close WebSocket sessions gracefully.

## WebSocket Canary Traffic Flow

```mermaid
sequenceDiagram
    participant Client
    participant Istio as Istio Proxy
    participant Primary as Primary (v1)
    participant Canary as Canary (v2)

    Client->>Istio: HTTP Upgrade Request
    Istio->>Istio: Check canary weight
    alt Routed to Primary (90%)
        Istio->>Primary: Upgrade to WebSocket
        Primary-->>Client: 101 Switching Protocols
        Client<->Primary: Bidirectional messages
    else Routed to Canary (10%)
        Istio->>Canary: Upgrade to WebSocket
        Canary-->>Client: 101 Switching Protocols
        Client<->Canary: Bidirectional messages
    end
```

## Step 6: Trigger and Monitor

Update the image to start a rollout:

```bash
kubectl set image deployment/ws-server ws-server=myregistry/ws-server:1.1.0
```

Monitor the canary:

```bash
kubectl get canary ws-server -w
```

Because WebSocket connections are persistent, consider using a longer analysis interval and more steps for a gradual rollout. This gives clients time to reconnect and establish new connections routed by the updated weights.

## Conclusion

Flagger supports canary deployments for WebSocket services through Istio's native WebSocket handling. The main considerations are setting appropriate connection idle timeouts, using longer analysis intervals to account for persistent connections, and implementing graceful connection draining. Traffic shifting applies to new connections only, so plan your rollout duration accordingly. With proper configuration of connection pools, timeouts, and termination grace periods, you can safely roll out updates to WebSocket services without disrupting active client sessions.
