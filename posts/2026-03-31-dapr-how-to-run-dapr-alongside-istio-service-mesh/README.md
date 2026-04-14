# How to Run Dapr Alongside Istio Service Mesh

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Istio, Service Mesh, Kubernetes, mTLS, Observability, Microservice

Description: Learn how to run Dapr and Istio together in Kubernetes, avoiding port conflicts and configuring mTLS, traffic policies, and observability to work harmoniously.

---

Dapr and Istio can coexist in the same Kubernetes cluster, but they overlap in several areas: both inject sidecars, both provide mTLS, and both offer observability features. Running them together without careful configuration leads to double-encryption overhead, broken health checks, and conflicting traffic policies. This guide covers how to configure Dapr and Istio to complement rather than conflict with each other.

## Understanding the Overlap

When both Dapr and Istio are installed, each pod has two sidecar containers:

```text
Pod
+-- App Container (port 8080)
+-- Dapr Sidecar - daprd (ports 3500, 50001, 9090)
+-- Istio Sidecar - Envoy (ports 15001, 15006, 15090)
```

Key areas of overlap:

| Feature | Dapr | Istio |
|---------|------|-------|
| mTLS | Dapr Sentry CA | Istio Citadel/istiod CA |
| Observability | Dapr metrics + traces | Istio telemetry |
| Traffic management | Dapr resiliency | Istio VirtualService |
| Service discovery | Dapr name resolution (K8s DNS) | Istio service registry |

The recommended approach: use Istio for network-level concerns (traffic routing, L4 mTLS enforcement) and Dapr for application-level concerns (state, pub/sub, service invocation APIs). Disable Dapr's mTLS to avoid double-encrypting traffic that Istio already encrypts.

## Disabling Dapr mTLS When Using Istio

Since Istio already enforces mTLS at the pod network level, you can safely disable Dapr's application-level mTLS to avoid double overhead:

```yaml
# dapr-config.yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
  namespace: default
spec:
  mtls:
    enabled: false  # Istio handles mTLS at the network level
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: http://zipkin.istio-system:9411/api/v2/spans
```

Apply to all pods in the namespace by annotating the namespace or referencing it in each app's Dapr annotation:

```yaml
# Pod annotation
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "my-service"
  dapr.io/config: "appconfig"
```

## Configuring Istio to Allow Dapr Traffic

Istio's Envoy proxy intercepts all traffic by default, including Dapr sidecar-to-sidecar communication. You need to configure Istio to permit Dapr's internal ports and the Dapr API ports.

Create an Istio `PeerAuthentication` policy for the Dapr system namespace:

```yaml
# istio-dapr-peer-auth.yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: dapr-system-peer-auth
  namespace: dapr-system
spec:
  mtls:
    mode: PERMISSIVE  # Allow plaintext within dapr-system namespace
```

Exclude Dapr ports from Istio's iptables interception on application pods. Add this annotation to your pods:

```yaml
# Pod spec annotations
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "order-service"
  dapr.io/app-port: "8080"
  # Exclude Dapr internal ports from Istio interception
  traffic.sidecar.istio.io/excludeInboundPorts: "3500,50001,9090"
  traffic.sidecar.istio.io/excludeOutboundPorts: "3500,50001"
```

A complete Kubernetes Deployment with both sidecars configured correctly:

```yaml
# order-service-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-service"
        dapr.io/app-port: "8080"
        dapr.io/config: "appconfig"
        dapr.io/log-level: "info"
        traffic.sidecar.istio.io/excludeInboundPorts: "3500,50001,9090"
        traffic.sidecar.istio.io/excludeOutboundPorts: "3500,50001"
    spec:
      containers:
      - name: order-service
        image: myregistry/order-service:latest
        ports:
        - containerPort: 8080
        env:
        - name: DAPR_HTTP_PORT
          value: "3500"
```

## Using Istio Traffic Management with Dapr Services

Istio VirtualService and DestinationRule apply to traffic that flows through Envoy, not to Dapr sidecar-to-sidecar calls. For traffic from outside the cluster (ingress) or between services via their Kubernetes Service objects, use Istio. For Dapr service invocation calls (service A calls service B via Dapr's `invoke` API), Dapr handles routing.

Istio VirtualService for external traffic to an app:

```yaml
# order-service-vs.yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: order-service-vs
  namespace: default
spec:
  hosts:
  - order-service
  http:
  - match:
    - uri:
        prefix: /orders
    route:
    - destination:
        host: order-service
        port:
          number: 8080
    timeout: 30s
    retries:
      attempts: 3
      perTryTimeout: 10s
```

## Combining Dapr and Istio Observability

Configure both Dapr and Istio to send traces to the same Zipkin or Jaeger instance:

```bash
# Install Istio with Zipkin addon
istioctl install --set profile=demo
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.25/samples/addons/extras/zipkin.yaml

# Configure Dapr to use the same Zipkin
kubectl apply -f - << 'EOF'
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
  namespace: default
spec:
  mtls:
    enabled: false
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: http://zipkin.istio-system:9411/api/v2/spans
EOF
```

Verify both sidecars are healthy:

```bash
# Check that Dapr sidecar is running
kubectl get pods -l app=order-service -o jsonpath='{.items[0].spec.containers[*].name}'
# Expected: order-service daprd istio-proxy

# Check Dapr sidecar logs
kubectl logs deployment/order-service -c daprd | tail -20

# Check Istio proxy logs  
kubectl logs deployment/order-service -c istio-proxy | tail -20

# Verify Dapr health via the sidecar port
kubectl exec -it deployment/order-service -c order-service -- \
  curl http://localhost:3500/v1.0/healthz
```

## Summary

Running Dapr alongside Istio works well when you clearly separate their responsibilities: Dapr provides application-level building blocks (state, pub/sub, service invocation), while Istio handles network-level concerns (traffic routing, L4 mTLS, ingress). Disable Dapr's own mTLS to avoid double encryption, exclude Dapr's internal ports from Istio's iptables interception, and configure both to send traces to the same backend. With these settings, you get the best of both: Dapr's developer experience plus Istio's fine-grained traffic management and security policies.
