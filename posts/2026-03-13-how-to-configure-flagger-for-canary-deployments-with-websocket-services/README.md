# How to Configure Flagger for Canary Deployments with WebSocket Services

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flagger, canary, kubernetes, websocket, istio, progressive delivery

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

Configure the Flagger Canary resource. WebSocket traffic flows over HTTP, so the standard HTTP configuration works. The important addition is setting appropriate timeouts in the Istio traffic policy to accommodate long-lived WebSocket connections:

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
        http:
          h2UpgradePolicy: UPGRADE
        tcp:
          maxConnections: 1000
      tls:
        mode: ISTIO_MUTUAL
    timeout: 3600s
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

- `timeout: 3600s` prevents Istio from terminating long-lived WebSocket connections.
- `h2UpgradePolicy: UPGRADE` allows HTTP/1.1 to HTTP/2 upgrades, which is relevant for WebSocket connections.
- The analysis interval is set to `1m` instead of `30s` because WebSocket metrics arrive less frequently than typical HTTP request metrics.

## Step 3: Configure Istio for WebSocket Support

Istio supports WebSocket connections by default. The HTTP upgrade mechanism works through the Envoy proxy without additional configuration. However, you should verify that the DestinationRule does not interfere with WebSocket connections:

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
      http:
        h2UpgradePolicy: UPGRADE
        maxRequestsPerConnection: 0
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
```

Setting `maxRequestsPerConnection: 0` ensures connections are not closed after a fixed number of requests, which is essential for persistent WebSocket connections.

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

This gives active connections 15 seconds to close gracefully before the pod is terminated.

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

Flagger supports canary deployments for WebSocket services through Istio's native WebSocket handling. The main considerations are setting appropriate connection timeouts, using longer analysis intervals to account for persistent connections, and implementing graceful connection draining. Traffic shifting applies to new connections only, so plan your rollout duration accordingly. With proper configuration of connection pools, timeouts, and termination grace periods, you can safely roll out updates to WebSocket services without disrupting active client sessions.
