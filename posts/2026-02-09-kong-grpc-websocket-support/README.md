# How to Configure Kong Ingress Controller with gRPC and WebSocket Support

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kong, gRPC

Description: Learn how to configure Kong Ingress Controller for gRPC and WebSocket protocols including protocol detection, load balancing, health checks, and authentication for modern real-time applications.

---

Kong Ingress Controller provides native support for gRPC and WebSocket protocols, enabling you to route modern real-time applications alongside traditional HTTP services. This guide shows you how to configure Kong for these protocols effectively.

## gRPC Configuration

Configure Kong to route gRPC traffic.

### Basic gRPC Service

```yaml
# grpc-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: grpc-service
  namespace: default
  annotations:
    konghq.com/protocol: "grpc"
spec:
  selector:
    app: grpc-app
  ports:
  - port: 50051
    targetPort: 50051
    name: grpc
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: grpc-ingress
  namespace: default
  annotations:
    konghq.com/protocols: "grpc,grpcs"
spec:
  ingressClassName: kong
  rules:
  - host: grpc.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: grpc-service
            port:
              number: 50051
```

### gRPC with TLS

```yaml
# grpc-tls.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: grpc-tls
  namespace: default
  annotations:
    konghq.com/protocols: "grpcs"
spec:
  ingressClassName: kong
  tls:
  - hosts:
    - grpc.example.com
    secretName: grpc-tls-cert
  rules:
  - host: grpc.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: grpc-service
            port:
              number: 50051
```

## WebSocket Configuration

Configure WebSocket support.

### Basic WebSocket

```yaml
# websocket-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: websocket-service
  namespace: default
  annotations:
    konghq.com/protocol: "http"
spec:
  selector:
    app: websocket-app
  ports:
  - port: 80
    targetPort: 8080
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: websocket-ingress
  namespace: default
  annotations:
    konghq.com/protocols: "http,https"
    konghq.com/preserve-host: "true"
spec:
  ingressClassName: kong
  rules:
  - host: ws.example.com
    http:
      paths:
      - path: /ws
        pathType: Prefix
        backend:
          service:
            name: websocket-service
            port:
              number: 80
```

## Combined gRPC and HTTP

Route multiple protocols.

### Multi-Protocol Ingress

```yaml
# multi-protocol.yaml
# HTTP/REST service
apiVersion: v1
kind: Service
metadata:
  name: http-service
  namespace: default
spec:
  selector:
    app: myapp
  ports:
  - port: 80
    name: http
---
# gRPC service
apiVersion: v1
kind: Service
metadata:
  name: grpc-service
  namespace: default
  annotations:
    konghq.com/protocol: "grpc"
spec:
  selector:
    app: myapp
  ports:
  - port: 50051
    name: grpc
---
# Combined ingress
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: multi-protocol
  namespace: default
spec:
  ingressClassName: kong
  rules:
  - host: api.example.com
    http:
      paths:
      # REST endpoints
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: http-service
            port:
              number: 80
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: grpc-path
  namespace: default
  annotations:
    konghq.com/protocols: "grpc"
spec:
  ingressClassName: kong
  rules:
  - host: api.example.com
    http:
      paths:
      # gRPC endpoints
      - path: /grpc
        pathType: Prefix
        backend:
          service:
            name: grpc-service
            port:
              number: 50051
```

## Authentication for gRPC

Secure gRPC services.

### JWT Authentication

```yaml
# grpc-jwt.yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: grpc-jwt
  namespace: default
config:
  claims_to_verify:
  - exp
  key_claim_name: iss
plugin: jwt
---
apiVersion: v1
kind: Service
metadata:
  name: grpc-service
  namespace: default
  annotations:
    konghq.com/protocol: "grpc"
    konghq.com/plugins: grpc-jwt
spec:
  selector:
    app: grpc-app
  ports:
  - port: 50051
```

## Health Checks

Configure health checking for gRPC and WebSocket.

### gRPC Health Check

```yaml
# grpc-health.yaml
apiVersion: configuration.konghq.com/v1
kind: KongIngress
metadata:
  name: grpc-health-check
  namespace: default
upstream:
  healthchecks:
    active:
      type: grpc
      grpc_service: "health.HealthService"
      grpc_status: 12  # UNIMPLEMENTED
      http_path: /grpc.health.v1.Health/Check
      healthy:
        interval: 10
        successes: 2
      unhealthy:
        interval: 5
        http_failures: 3
---
apiVersion: v1
kind: Service
metadata:
  name: grpc-service
  namespace: default
  annotations:
    konghq.com/override: grpc-health-check
spec:
  selector:
    app: grpc-app
  ports:
  - port: 50051
```

## Testing

Test gRPC and WebSocket endpoints:

```bash
# Test gRPC
grpcurl -plaintext grpc.example.com:443 list
grpcurl -plaintext grpc.example.com:443 my.package.MyService/MyMethod

# Test WebSocket
wscat -c wss://ws.example.com/ws

# Load test gRPC
ghz --insecure \
  --proto ./service.proto \
  --call my.package.MyService/MyMethod \
  -d '{"name":"test"}' \
  grpc.example.com:443
```

## Conclusion

Kong provides robust support for gRPC and WebSocket protocols, enabling you to route modern application protocols through a unified API gateway. Proper configuration of protocol detection, health checks, and authentication ensures reliable and secure real-time communication.
