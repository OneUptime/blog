# How to Configure gRPC in Kubernetes with IPv4 ClusterIP Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: gRPC, Kubernetes, IPv4, ClusterIP, Service Discovery, Networking

Description: Learn how to configure gRPC services in Kubernetes with IPv4 ClusterIP Services, addressing the load balancing challenge, and choosing between ClusterIP, headless services, and ingress controllers.

## The gRPC + ClusterIP Challenge

Standard Kubernetes `ClusterIP` services provide TCP load balancing at Layer 4. gRPC uses long-lived HTTP/2 connections - a single connection pins all traffic to one pod.

```text
Client → ClusterIP (iptables DNAT) → Pod A (all traffic)
                                    → Pod B (no traffic)
                                    → Pod C (no traffic)
```

**Solutions:**
1. Client-side load balancing with headless service
2. Layer 7 proxy (Nginx Ingress, Envoy, Istio)

## Option 1: Headless Service + Client-Side LB

```yaml
# headless-service.yaml

apiVersion: v1
kind: Service
metadata:
  name: greeter
  namespace: default
spec:
  clusterIP: None         # headless - DNS returns all pod IPs
  selector:
    app: greeter
  ports:
    - name: grpc
      port: 50051
      targetPort: 50051
```

```go
// Go client using DNS round-robin
conn, _ := grpc.NewClient(
    "dns:///greeter.default.svc.cluster.local:50051",
    grpc.WithTransportCredentials(insecure.NewCredentials()),
    grpc.WithDefaultServiceConfig(`{"loadBalancingPolicy":"round_robin"}`),
)
```

## Option 2: Nginx Ingress for gRPC

```yaml
# grpc-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: greeter-grpc
  annotations:
    nginx.ingress.kubernetes.io/backend-protocol: "GRPC"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - grpc.example.com
      secretName: grpc-tls-secret
  rules:
    - host: grpc.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: greeter
                port:
                  number: 50051
```

## Full Kubernetes Manifest

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: greeter
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: greeter
  template:
    metadata:
      labels:
        app: greeter
    spec:
      terminationGracePeriodSeconds: 30
      containers:
        - name: greeter
          image: myrepo/greeter:latest
          ports:
            - containerPort: 50051
              name: grpc
          env:
            - name: GRPC_ADDR
              value: "0.0.0.0:50051"
          readinessProbe:
            grpc:
              port: 50051
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            grpc:
              port: 50051
            initialDelaySeconds: 10
            periodSeconds: 20
          lifecycle:
            preStop:
              exec:
                command: ["sleep", "5"]
```

## Verify from Your Workstation

```bash
# Port-forward for local testing
kubectl port-forward svc/greeter 50051:50051 &

# These grpcurl examples assume server reflection is enabled
grpcurl -plaintext localhost:50051 list
grpcurl -plaintext -d '{"name":"k8s"}' localhost:50051 helloworld.Greeter/SayHello
```

## Conclusion

ClusterIP services do not provide effective per-RPC load balancing for long-lived gRPC connections because a single HTTP/2 connection typically stays attached to one backend. Use a headless service with the `dns:///` scheme and `round_robin` load balancing policy for client-side distribution, or front the service with Nginx Ingress (`backend-protocol: GRPC`) for server-side balancing. Add gRPC readiness probes so pods only receive traffic after they are fully initialised. Configure `terminationGracePeriodSeconds` longer than your application's graceful shutdown timeout so in-flight RPCs have time to complete.
