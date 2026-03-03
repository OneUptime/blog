# How to Set Up Envoy Gateway on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Envoy, Gateway API, Kubernetes, Cloud Native

Description: Learn how to deploy Envoy Gateway on Talos Linux using the Kubernetes Gateway API for modern, standardized traffic management.

---

Envoy Gateway is the official Kubernetes implementation of the Gateway API using Envoy proxy as its data plane. The Gateway API is the successor to the Ingress resource, offering a more expressive, role-oriented, and portable way to manage traffic routing in Kubernetes. On Talos Linux, Envoy Gateway runs without any special requirements, giving you access to cutting-edge traffic management features on a secure, immutable operating system.

This guide covers deploying Envoy Gateway on Talos Linux, understanding the Gateway API resources, and configuring routes for your applications.

## Understanding the Gateway API

Before diving into the setup, it helps to understand what the Gateway API brings to the table. The traditional Ingress resource has known limitations - it does not support TCP/UDP routing well, it relies heavily on annotations that differ between controllers, and it has a flat permission model. The Gateway API solves these problems with three key resources:

- **GatewayClass**: Defines the controller implementation (similar to IngressClass)
- **Gateway**: Represents a load balancer instance with listeners for specific ports and protocols
- **HTTPRoute**: Defines how HTTP traffic should be routed to backend services

This separation allows infrastructure teams to manage GatewayClass and Gateway resources while application teams manage their own HTTPRoute resources.

## Prerequisites

You need:

- A Talos Linux cluster running Kubernetes 1.25 or later
- `kubectl` configured for cluster access
- Helm 3 installed

```bash
# Check Kubernetes version
kubectl version --short

# Verify cluster health
kubectl get nodes
```

## Installing Envoy Gateway

Install Envoy Gateway using Helm:

```bash
# Install the Gateway API CRDs
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.0.0/standard-install.yaml

# Add the Envoy Gateway Helm repo
helm repo add envoy-gateway https://charts.envoyproxy.io
helm repo update

# Install Envoy Gateway
helm install envoy-gateway envoy-gateway/gateway-helm \
  --namespace envoy-gateway-system \
  --create-namespace
```

## Creating a GatewayClass and Gateway

After installation, create the GatewayClass and Gateway resources:

```yaml
# gateway-class.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: envoy-gateway
spec:
  controllerName: gateway.envoyproxy.io/gatewayclass-controller
```

```yaml
# gateway.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: main-gateway
  namespace: default
spec:
  gatewayClassName: envoy-gateway
  listeners:
  - name: http
    protocol: HTTP
    port: 80
    allowedRoutes:
      namespaces:
        from: All
  - name: https
    protocol: HTTPS
    port: 443
    tls:
      mode: Terminate
      certificateRefs:
      - name: gateway-tls-secret
    allowedRoutes:
      namespaces:
        from: All
```

Apply these resources:

```bash
kubectl apply -f gateway-class.yaml
kubectl apply -f gateway.yaml

# Check the Gateway status
kubectl get gateway main-gateway -o yaml
```

Envoy Gateway will automatically provision an Envoy proxy deployment and service to handle traffic for this Gateway.

## Routing Traffic with HTTPRoute

Now create an HTTPRoute to send traffic to your application:

```yaml
# app-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-app
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend-app
  template:
    metadata:
      labels:
        app: backend-app
    spec:
      containers:
      - name: app
        image: hashicorp/http-echo
        args:
        - "-text=Hello from Envoy Gateway on Talos!"
        ports:
        - containerPort: 5678
---
apiVersion: v1
kind: Service
metadata:
  name: backend-app
  namespace: default
spec:
  selector:
    app: backend-app
  ports:
  - port: 80
    targetPort: 5678
```

```yaml
# http-route.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: backend-route
  namespace: default
spec:
  parentRefs:
  - name: main-gateway
  hostnames:
  - "app.example.com"
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /
    backendRefs:
    - name: backend-app
      port: 80
```

Apply and verify:

```bash
kubectl apply -f app-deployment.yaml
kubectl apply -f http-route.yaml

# Check the route status
kubectl get httproute backend-route

# Find the Gateway service IP
kubectl get svc -l gateway.envoyproxy.io/owning-gateway-name=main-gateway

# Test the route
curl -H "Host: app.example.com" http://<GATEWAY_IP>
```

## Advanced Routing Features

The Gateway API supports sophisticated routing rules. Here are some examples:

### Header-Based Routing

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: header-route
  namespace: default
spec:
  parentRefs:
  - name: main-gateway
  hostnames:
  - "api.example.com"
  rules:
  - matches:
    - headers:
      - name: X-Version
        value: "v2"
    backendRefs:
    - name: api-v2
      port: 80
  - matches:
    - path:
        type: PathPrefix
        value: /
    backendRefs:
    - name: api-v1
      port: 80
```

### Traffic Splitting

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: split-route
  namespace: default
spec:
  parentRefs:
  - name: main-gateway
  hostnames:
  - "app.example.com"
  rules:
  - backendRefs:
    - name: app-stable
      port: 80
      weight: 80
    - name: app-canary
      port: 80
      weight: 20
```

### Request Redirect

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: redirect-route
  namespace: default
spec:
  parentRefs:
  - name: main-gateway
  hostnames:
  - "old.example.com"
  rules:
  - filters:
    - type: RequestRedirect
      requestRedirect:
        hostname: new.example.com
        statusCode: 301
```

## Envoy Gateway Policies

Envoy Gateway extends the Gateway API with additional policy resources:

```yaml
# Rate limiting policy
apiVersion: gateway.envoyproxy.io/v1alpha1
kind: BackendTrafficPolicy
metadata:
  name: rate-limit-policy
  namespace: default
spec:
  targetRef:
    group: gateway.networking.k8s.io
    kind: HTTPRoute
    name: backend-route
  rateLimit:
    type: Global
    global:
      rules:
      - limit:
          requests: 100
          unit: Minute
```

## Observability

Envoy Gateway provides built-in observability. You can check the Envoy proxy stats:

```bash
# Port-forward to the admin interface
kubectl port-forward -n envoy-gateway-system svc/envoy-gateway 19001:19001

# Check stats
curl http://localhost:19001/stats

# Check cluster health
curl http://localhost:19001/clusters
```

## Working with Talos Linux

Envoy Gateway deploys entirely through Kubernetes resources, making it a natural fit for Talos Linux. Some tips for running it effectively:

```bash
# Check Envoy Gateway controller logs
kubectl logs -n envoy-gateway-system -l app.kubernetes.io/name=envoy-gateway

# Check the provisioned Envoy proxy logs
kubectl logs -l gateway.envoyproxy.io/owning-gateway-name=main-gateway

# Verify Gateway status
kubectl describe gateway main-gateway
```

If you need to expose the Gateway service on specific node ports for bare-metal Talos clusters, you can patch the service:

```bash
# Patch the gateway service to use NodePort
kubectl patch svc <GATEWAY_SVC_NAME> \
  -p '{"spec": {"type": "NodePort", "ports": [{"port": 80, "nodePort": 30080, "name": "http"}]}}'
```

## Conclusion

Envoy Gateway on Talos Linux represents the future of Kubernetes traffic management. The Gateway API is a significant improvement over the traditional Ingress resource, with better expressiveness, role-based configuration, and portability across implementations. Combined with Envoy's powerful proxy capabilities and Talos Linux's secure, immutable foundation, you get a modern, production-ready traffic management stack that is straightforward to operate and maintain.
