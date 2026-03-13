# How to Create Gateway Resources with Kubernetes Gateway API

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Gateway API, Kubernetes, Ingresses, Networking

Description: Step-by-step guide to creating Gateway resources using the Kubernetes Gateway API with Istio, covering listeners, TLS configuration, multi-protocol gateways, and resource management.

---

The Gateway resource in the Kubernetes Gateway API is what actually provisions the load balancer that accepts traffic into your cluster. Unlike the classic Istio Gateway (which just configures an existing ingress gateway deployment), a Gateway API Gateway resource triggers Istio to create the entire infrastructure - deployment, service, and all. This makes gateway management more declarative and self-service.

## Prerequisites

Make sure you have the Gateway API CRDs and Istio installed:

```bash
# Install Gateway API CRDs
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.2.0/standard-install.yaml

# Verify Istio's GatewayClass exists
kubectl get gatewayclass istio
```

## Creating a Basic HTTP Gateway

The simplest Gateway accepts HTTP traffic on port 80:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: web-gateway
  namespace: production
spec:
  gatewayClassName: istio
  listeners:
  - name: http
    protocol: HTTP
    port: 80
    allowedRoutes:
      namespaces:
        from: Same
```

Apply it:

```bash
kubectl apply -f web-gateway.yaml
```

Istio will create the gateway infrastructure. Check what was created:

```bash
kubectl get deployment,service,serviceaccount -n production -l gateway.networking.k8s.io/gateway-name=web-gateway
```

You should see a deployment named `web-gateway-istio`, a corresponding service, and a service account.

Wait for the Gateway to become ready:

```bash
kubectl wait --for=condition=programmed gateway/web-gateway -n production --timeout=60s
```

Get the external IP:

```bash
kubectl get gateway web-gateway -n production -o jsonpath='{.status.addresses[0].value}'
```

## Creating an HTTPS Gateway

For production traffic, you want TLS termination:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: secure-gateway
  namespace: production
spec:
  gatewayClassName: istio
  listeners:
  - name: https
    protocol: HTTPS
    port: 443
    tls:
      mode: Terminate
      certificateRefs:
      - name: app-tls-cert
        kind: Secret
    allowedRoutes:
      namespaces:
        from: Same
```

The TLS certificate needs to exist as a Kubernetes Secret in the same namespace:

```bash
kubectl create secret tls app-tls-cert \
  --cert=path/to/cert.pem \
  --key=path/to/key.pem \
  -n production
```

Or if you're using cert-manager:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: app-tls-cert
  namespace: production
spec:
  secretName: app-tls-cert
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - app.example.com
  - www.example.com
```

## Multi-Protocol Gateway

A single Gateway can have multiple listeners on different ports and protocols:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: multi-protocol-gateway
  namespace: production
spec:
  gatewayClassName: istio
  listeners:
  - name: http
    protocol: HTTP
    port: 80
    allowedRoutes:
      namespaces:
        from: Same
  - name: https
    protocol: HTTPS
    port: 443
    tls:
      mode: Terminate
      certificateRefs:
      - name: app-tls-cert
    allowedRoutes:
      namespaces:
        from: Same
  - name: grpc
    protocol: HTTPS
    port: 8443
    tls:
      mode: Terminate
      certificateRefs:
      - name: grpc-tls-cert
    allowedRoutes:
      namespaces:
        from: Same
```

## Per-Hostname Listeners

You can configure different listeners for different hostnames. This is useful when you host multiple domains on the same gateway:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: multi-domain-gateway
  namespace: production
spec:
  gatewayClassName: istio
  listeners:
  - name: app-a
    protocol: HTTPS
    port: 443
    hostname: "app-a.example.com"
    tls:
      mode: Terminate
      certificateRefs:
      - name: app-a-cert
    allowedRoutes:
      namespaces:
        from: Same
  - name: app-b
    protocol: HTTPS
    port: 443
    hostname: "app-b.example.com"
    tls:
      mode: Terminate
      certificateRefs:
      - name: app-b-cert
    allowedRoutes:
      namespaces:
        from: Same
```

Both listeners share port 443 but serve different certificates based on the hostname (using SNI).

## HTTP to HTTPS Redirect

A common pattern is to accept HTTP traffic and redirect it to HTTPS. You can do this with an HTTPRoute:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: redirect-gateway
  namespace: production
spec:
  gatewayClassName: istio
  listeners:
  - name: http
    protocol: HTTP
    port: 80
    allowedRoutes:
      namespaces:
        from: Same
  - name: https
    protocol: HTTPS
    port: 443
    tls:
      mode: Terminate
      certificateRefs:
      - name: app-tls-cert
    allowedRoutes:
      namespaces:
        from: Same
---
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: redirect-to-https
  namespace: production
spec:
  parentRefs:
  - name: redirect-gateway
    sectionName: http
  rules:
  - filters:
    - type: RequestRedirect
      requestRedirect:
        scheme: https
        statusCode: 301
```

The HTTPRoute targets only the `http` listener (using `sectionName`) and redirects all traffic to HTTPS with a 301.

## Controlling the Gateway Service Type

By default, Istio creates a LoadBalancer service for each Gateway. You can change this:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: internal-gateway
  namespace: production
  annotations:
    networking.istio.io/service-type: ClusterIP
spec:
  gatewayClassName: istio
  listeners:
  - name: http
    protocol: HTTP
    port: 80
    allowedRoutes:
      namespaces:
        from: Same
```

Options for `networking.istio.io/service-type`:
- `LoadBalancer` (default)
- `ClusterIP`
- `NodePort`

## Scaling the Gateway

Control the number of gateway pod replicas:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: high-traffic-gateway
  namespace: production
  annotations:
    autoscaling.istio.io/minReplicas: "3"
    autoscaling.istio.io/maxReplicas: "10"
spec:
  gatewayClassName: istio
  listeners:
  - name: http
    protocol: HTTP
    port: 80
    allowedRoutes:
      namespaces:
        from: All
```

Istio creates an HPA (Horizontal Pod Autoscaler) for the gateway deployment with these settings.

## Cross-Namespace Route Attachment

Gateways can allow routes from other namespaces. This is the key to multi-tenant gateway sharing:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: shared-gateway
  namespace: istio-ingress
spec:
  gatewayClassName: istio
  listeners:
  - name: http
    protocol: HTTP
    port: 80
    allowedRoutes:
      namespaces:
        from: All
  - name: staging
    protocol: HTTP
    port: 8080
    allowedRoutes:
      namespaces:
        from: Selector
        selector:
          matchLabels:
            env: staging
```

The port 80 listener accepts routes from all namespaces. The port 8080 listener only accepts routes from namespaces labeled `env: staging`.

Teams in other namespaces can then create HTTPRoutes that reference this gateway:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: my-app-route
  namespace: team-a
spec:
  parentRefs:
  - name: shared-gateway
    namespace: istio-ingress
  hostnames:
  - "team-a.example.com"
  rules:
  - backendRefs:
    - name: my-app
      port: 80
```

## Checking Gateway Status

The Gateway status is rich with information:

```bash
kubectl get gateway web-gateway -n production -o yaml
```

```yaml
status:
  addresses:
  - type: IPAddress
    value: 34.120.15.88
  conditions:
  - type: Accepted
    status: "True"
  - type: Programmed
    status: "True"
  listeners:
  - name: http
    attachedRoutes: 3
    conditions:
    - type: Accepted
      status: "True"
    - type: Programmed
      status: "True"
    - type: ResolvedRefs
      status: "True"
```

**Accepted** means the Gateway configuration is valid. **Programmed** means the underlying infrastructure is running. **ResolvedRefs** means all referenced resources (like TLS secrets) were found.

## Cleaning Up

When you delete a Gateway, Istio cleans up the infrastructure it created:

```bash
kubectl delete gateway web-gateway -n production
```

This removes the gateway deployment, service, and service account. Routes that referenced this gateway will lose their parent and stop functioning.

Gateway resources are the heart of the Gateway API model. They bridge the gap between infrastructure provisioning and traffic routing, giving you a clean, declarative way to manage how traffic enters your mesh. Once you have a Gateway running, you can attach any number of routes to it without touching the gateway configuration again.
