# How to Configure Redis with Istio Service Mesh

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Istio, Service Mesh, Kubernetes, mTLS, Traffic Management

Description: Learn how to run Redis inside an Istio service mesh, configuring traffic policies, mTLS, and sidecar injection for secure and observable Redis communication.

---

## Why Redis with Istio?

Istio adds mTLS encryption, traffic policies, observability, and access control to Redis without modifying application code. This is especially useful in Kubernetes environments where Redis pods communicate with multiple microservices.

## Prerequisites

```bash
# Verify Istio is installed
kubectl get pods -n istio-system

# Verify kubectl is configured
kubectl cluster-info
```

## Deploying Redis in a Mesh-Enabled Namespace

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: data-stores
  labels:
    istio-injection: enabled  # Enable automatic sidecar injection
```

```bash
kubectl apply -f namespace.yaml
```

## Redis Deployment with Istio Sidecar

```yaml
# redis-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: data-stores
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
      annotations:
        sidecar.istio.io/inject: "true"
    spec:
      containers:
        - name: redis
          image: redis:7.2-alpine
          ports:
            - containerPort: 6379
          command: ["redis-server", "--requirepass", "$(REDIS_PASSWORD)"]
          env:
            - name: REDIS_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: redis-secret
                  key: password
---
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: data-stores
spec:
  selector:
    app: redis
  ports:
    - port: 6379
      targetPort: 6379
      protocol: TCP
      name: tcp-redis
```

## Important: TCP Traffic and Istio

Istio's Envoy proxy handles HTTP/gRPC traffic natively, but Redis uses a custom binary protocol (RESP). Configure Istio to treat Redis port as raw TCP:

```yaml
# redis-service-entry.yaml
apiVersion: networking.istio.io/v1alpha3
kind: ServiceEntry
metadata:
  name: redis-tcp
  namespace: data-stores
spec:
  hosts:
    - redis.data-stores.svc.cluster.local
  ports:
    - number: 6379
      name: tcp-redis
      protocol: TCP
  resolution: DNS
  location: MESH_INTERNAL
```

## Destination Rule for Redis

```yaml
# redis-destination-rule.yaml
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: redis
  namespace: data-stores
spec:
  host: redis.data-stores.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 5s
        tcpKeepalive:
          time: 7200s
          interval: 75s
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
```

## PeerAuthentication Policy for mTLS

```yaml
# redis-peer-auth.yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: redis-mtls
  namespace: data-stores
spec:
  selector:
    matchLabels:
      app: redis
  mtls:
    mode: STRICT  # Require mTLS for all traffic to Redis
```

## AuthorizationPolicy - Restrict Who Can Access Redis

```yaml
# redis-authz-policy.yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: redis-access
  namespace: data-stores
spec:
  selector:
    matchLabels:
      app: redis
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/app/sa/api-service"
              - "cluster.local/ns/app/sa/worker-service"
```

## Verifying the Setup

```bash
# Check sidecar injection
kubectl get pods -n data-stores -o jsonpath='{.items[*].spec.containers[*].name}'

# Check mTLS status
kubectl exec -n data-stores deploy/redis -c istio-proxy -- \
  pilot-agent request GET /config_dump | grep -i "redis"

# Test Redis connectivity from another pod
kubectl run redis-test --image=redis:7.2-alpine -n app --rm -it -- \
  redis-cli -h redis.data-stores.svc.cluster.local -p 6379 -a "$REDIS_PASSWORD" ping
```

## Observability: Traffic Metrics

Istio automatically exports Prometheus metrics for TCP connections to Redis:

```text
# Key metrics to monitor
istio_tcp_connections_opened_total{destination_service="redis"}
istio_tcp_connections_closed_total{destination_service="redis"}
istio_tcp_sent_bytes_total{destination_service="redis"}
istio_tcp_received_bytes_total{destination_service="redis"}
```

## Monitoring with Kiali

Kiali (Istio's dashboard) shows the service topology including Redis as a TCP node:

```bash
# Port-forward Kiali
kubectl port-forward -n istio-system svc/kiali 20001:20001

# Open in browser
open http://localhost:20001
```

## Summary

Running Redis in Istio requires careful configuration because Redis uses a custom binary protocol rather than HTTP. Name service ports with the `tcp-` prefix so Istio treats them as raw TCP, use destination rules for connection pooling and outlier detection, enforce mTLS with PeerAuthentication, and restrict access with AuthorizationPolicy. Istio then provides mTLS encryption, connection-level metrics, and access control without any code changes.
