# How to Use Dapr and Istio Together

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Istio, Service Mesh, Integration, Kubernetes

Description: Learn how to run Dapr and Istio together on Kubernetes, avoiding duplicate mTLS and leveraging each tool for its distinct strengths.

---

Running Dapr and Istio together gives you the best of both worlds: Dapr's application-level building blocks and Istio's network-level traffic management and observability. Setting them up correctly requires a few key configuration steps.

## Why Run Both?

Dapr handles: state management, pub/sub, service invocation, actors, workflows, bindings, secret stores.

Istio handles: network-level mTLS, traffic routing (canary, A/B), L7 policies, Envoy-based observability.

Together, you get a complete platform: Dapr manages your application infrastructure abstractions while Istio secures and controls the network.

## Installation Order

Install Istio first, then Dapr:

```bash
# Install Istio
istioctl install --set profile=default

# Create the dapr-system namespace and enable Istio sidecar injection
kubectl create namespace dapr-system
kubectl label namespace dapr-system istio-injection=enabled

# Install Dapr
helm install dapr dapr/dapr -n dapr-system --wait
```

## Disabling Duplicate mTLS

Both Dapr and Istio can perform mTLS. Running both creates double encryption and can cause TLS handshake failures. Disable Dapr's mTLS and let Istio handle it:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
  namespace: default
spec:
  mtls:
    enabled: false
```

Apply to your app's namespace and reference it in the pod annotation:

```yaml
annotations:
  dapr.io/config: "appconfig"
```

## Configuring Istio for Dapr Ports

Istio needs to know about Dapr's ports to route traffic correctly. Add the Dapr ports to the Istio service entry or exclude them from interception where needed:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: Sidecar
metadata:
  name: dapr-sidecar-config
  namespace: default
spec:
  egress:
  - port:
      number: 3500
      protocol: HTTP
      name: dapr-http
    hosts:
    - "./*"
  - port:
      number: 50001
      protocol: GRPC
      name: dapr-grpc
    hosts:
    - "./*"
```

## Avoiding Port Conflicts

Istio's Envoy proxy and Dapr's sidecar both inject into the pod. Ensure Envoy does not intercept Dapr's internal ports. Annotate pods to exclude Dapr's ports from Istio interception:

```yaml
annotations:
  traffic.sidecar.istio.io/excludeInboundPorts: "3500,50001,50002"
  traffic.sidecar.istio.io/excludeOutboundPorts: "3500,50001,50002"
```

## Traffic Policy with Istio and Dapr

Use Istio VirtualService for traffic routing while Dapr handles application concerns:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: order-service
spec:
  hosts:
  - order-service
  http:
  - match:
    - headers:
        x-canary:
          exact: "true"
    route:
    - destination:
        host: order-service
        subset: v2
      weight: 100
  - route:
    - destination:
        host: order-service
        subset: v1
```

Dapr service invocation calls go through Istio's Envoy proxy, gaining the routing and observability benefits automatically.

## Summary

Running Dapr and Istio together requires disabling Dapr's built-in mTLS to avoid conflicts, annotating pods to exclude Dapr's internal ports from Envoy interception, and installing in the correct order (Istio first). Once configured, Dapr handles application-level building blocks while Istio manages network-level traffic and security, giving you a comprehensive microservices platform.
