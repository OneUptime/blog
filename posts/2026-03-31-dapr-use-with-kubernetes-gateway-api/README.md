# How to Use Dapr with Kubernetes Gateway API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kubernetes, Gateway API, Ingress, Networking

Description: Learn how to combine Dapr with the Kubernetes Gateway API to manage external traffic routing into Dapr-enabled services using HTTPRoute and GatewayClass resources.

---

The Kubernetes Gateway API is the modern successor to Ingress, offering richer routing capabilities. When running Dapr services, you can use the Gateway API to route external traffic to your services while Dapr handles inter-service communication internally.

## Gateway API and Dapr Architecture

External traffic enters through a Gateway and HTTPRoute, then reaches your service pod. Inside the cluster, service-to-service calls go through Dapr sidecars.

```text
External Client
     |
     v
Gateway (e.g., Envoy Gateway, Nginx Gateway Fabric)
     |
     v
HTTPRoute -> Service -> Pod [App + Dapr Sidecar]
                             |
                       Dapr Sidecar handles
                       internal service calls
```

## Installing the Gateway API CRDs

```bash
# Install Gateway API CRDs (standard channel)
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.2.0/standard-install.yaml

# Install a gateway controller (Envoy Gateway example)
helm install eg oci://docker.io/envoyproxy/gateway-helm \
  --version v1.2.0 \
  -n envoy-gateway-system \
  --create-namespace
```

## Defining a GatewayClass and Gateway

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: envoy
spec:
  controllerName: gateway.envoyproxy.io/gatewayclass-controller
---
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: production-gateway
  namespace: production
spec:
  gatewayClassName: envoy
  listeners:
    - name: http
      port: 80
      protocol: HTTP
      allowedRoutes:
        namespaces:
          from: Same
```

## Routing to Dapr-Enabled Services

Create HTTPRoutes that point to your Dapr services:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: order-api-route
  namespace: production
spec:
  parentRefs:
    - name: production-gateway
  hostnames:
    - "api.example.com"
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /orders
      backendRefs:
        - name: order-service
          port: 8080
```

The HTTPRoute routes to the application's port (8080), not the Dapr sidecar port. Dapr intercepts outbound calls from the app container.

## TLS Termination at the Gateway

Terminate TLS at the Gateway and let Dapr mTLS handle internal traffic:

```yaml
spec:
  listeners:
    - name: https
      port: 443
      protocol: HTTPS
      tls:
        mode: Terminate
        certificateRefs:
          - name: api-cert
            kind: Secret
```

Create the TLS secret:

```bash
kubectl create secret tls api-cert \
  --cert=tls.crt --key=tls.key \
  -n production
```

## Header-Based Routing with Dapr App IDs

Use HTTPRoute header matching to route to specific Dapr app versions:

```yaml
rules:
  - matches:
      - headers:
          - name: x-api-version
            value: "v2"
    backendRefs:
      - name: order-service-v2
        port: 8080
  - backendRefs:
      - name: order-service
        port: 8080
```

## Observability

The Gateway API controller exports standard metrics:

```bash
# Envoy Gateway metrics (port-forward to the controller pod)
export ENVOY_POD_NAME=$(kubectl get pod -n envoy-gateway-system \
  --selector=control-plane=envoy-gateway,app.kubernetes.io/instance=eg \
  -o jsonpath='{.items[0].metadata.name}')
kubectl port-forward pod/$ENVOY_POD_NAME -n envoy-gateway-system 19001:19001
curl http://localhost:19001/metrics | grep gateway_
```

## Summary

The Kubernetes Gateway API manages external traffic ingress to Dapr-enabled services using GatewayClass, Gateway, and HTTPRoute resources. The Gateway handles TLS termination and L7 routing while Dapr's sidecar manages internal service-to-service communication with mTLS and building block abstractions.
