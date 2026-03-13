# How to Configure Flagger Istio VirtualService Traffic Routing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flagger, Istio, VirtualService, Traffic Routing, Canary, Kubernetes, Progressive Delivery, Service Mesh

Description: Learn how Flagger manages Istio VirtualService resources for canary traffic routing and how to customize routing configuration.

---

## Introduction

When Flagger operates with Istio as its mesh provider, it manages VirtualService resources to control traffic distribution between primary and canary workloads. The VirtualService is the core Istio resource that defines routing rules, and Flagger automatically creates and updates it during canary analysis to shift traffic weights progressively.

Understanding how Flagger interacts with Istio VirtualServices is important for configuring advanced routing scenarios like header-based routing, URI matching, retries, timeouts, and CORS policies. Flagger allows you to customize the VirtualService through the Canary resource's service spec.

This guide explains how Flagger creates and manages VirtualServices, how to customize routing rules, and how to handle common Istio traffic routing scenarios.

## Prerequisites

- A running Kubernetes cluster with Istio installed
- Flagger installed with `meshProvider=istio`
- kubectl access to your cluster
- An Istio Gateway configured (for ingress traffic)

## How Flagger Manages VirtualServices

When you create a Canary resource with Istio, Flagger automatically creates:

- A primary Deployment (copy of the target)
- A primary Service and a canary Service
- A VirtualService with routing rules
- A DestinationRule with subsets

The VirtualService starts with 100% traffic to the primary. During canary analysis, Flagger updates the traffic weights to shift traffic to the canary.

## Basic Canary with VirtualService

A minimal Canary resource for Istio:

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: my-app
  namespace: default
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  service:
    port: 80
    targetPort: 8080
    gateways:
      - my-gateway.istio-system.svc.cluster.local
    hosts:
      - my-app.example.com
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
```

Flagger generates a VirtualService like this:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: default
spec:
  gateways:
    - my-gateway.istio-system.svc.cluster.local
  hosts:
    - my-app.example.com
  http:
    - route:
        - destination:
            host: my-app-primary
          weight: 100
        - destination:
            host: my-app-canary
          weight: 0
```

During analysis, Flagger updates the weights (e.g., 90/10, 80/20, etc.) according to the `stepWeight` configuration.

## Configuring Gateways and Hosts

The `gateways` and `hosts` fields in the Canary service spec map directly to the VirtualService:

```yaml
  service:
    port: 80
    targetPort: 8080
    gateways:
      - public-gateway.istio-system.svc.cluster.local
      - mesh
    hosts:
      - my-app.example.com
      - my-app.default.svc.cluster.local
```

Including `mesh` in gateways enables routing for internal (mesh) traffic in addition to ingress traffic. Multiple hosts allow the VirtualService to match traffic for different hostnames.

## Adding URI-Based Routing

You can configure URI matching rules through the Canary service spec:

```yaml
  service:
    port: 80
    targetPort: 8080
    match:
      - uri:
          prefix: /api
    gateways:
      - my-gateway.istio-system.svc.cluster.local
    hosts:
      - my-app.example.com
```

This generates a VirtualService that only applies canary routing to requests matching the `/api` prefix. Other requests are unaffected.

## Configuring Retries

Add retry policies to the VirtualService through the Canary service spec:

```yaml
  service:
    port: 80
    targetPort: 8080
    retries:
      attempts: 3
      perTryTimeout: 2s
      retryOn: "gateway-error,connect-failure,refused-stream"
    gateways:
      - my-gateway.istio-system.svc.cluster.local
    hosts:
      - my-app.example.com
```

Flagger includes these retry settings in the generated VirtualService HTTP route.

## Configuring Timeouts

Set request timeouts through the service spec:

```yaml
  service:
    port: 80
    targetPort: 8080
    timeout: 30s
    gateways:
      - my-gateway.istio-system.svc.cluster.local
    hosts:
      - my-app.example.com
```

This sets a 30-second timeout for all requests routed through the VirtualService.

## Header-Based Routing for Canary Testing

Flagger supports header-based routing to send specific requests directly to the canary, regardless of the traffic weight. This is useful for testing the canary with specific traffic before it receives weighted production traffic:

```yaml
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    match:
      - headers:
          x-canary:
            exact: "true"
```

This adds a header-matching rule to the VirtualService. Requests with the `x-canary: true` header are always routed to the canary, while other requests follow the normal weight-based distribution. This allows developers to test the canary directly by including the header in their requests.

## Configuring CORS Policy

Add CORS headers to the VirtualService:

```yaml
  service:
    port: 80
    targetPort: 8080
    corsPolicy:
      allowOrigins:
        - exact: https://app.example.com
      allowMethods:
        - GET
        - POST
        - PUT
        - DELETE
      allowHeaders:
        - Authorization
        - Content-Type
      maxAge: 24h
    gateways:
      - my-gateway.istio-system.svc.cluster.local
    hosts:
      - my-app.example.com
```

## Traffic Mirroring

Flagger supports traffic mirroring as an alternative or supplement to weighted routing. With mirroring, a copy of production traffic is sent to the canary without affecting responses:

```yaml
  analysis:
    interval: 1m
    threshold: 5
    iterations: 10
    mirror: true
    mirrorWeight: 100
```

When `mirror` is enabled, Flagger configures the VirtualService to mirror traffic to the canary. The `mirrorWeight` controls the percentage of traffic to mirror. This is useful for testing the canary with real traffic patterns without risk.

## Multiple Port Configuration

If your service exposes multiple ports, configure them in the service spec:

```yaml
  service:
    port: 80
    targetPort: 8080
    portName: http
    appProtocol: http
    gateways:
      - my-gateway.istio-system.svc.cluster.local
    hosts:
      - my-app.example.com
```

The `portName` and `appProtocol` fields help Istio identify the protocol for proper routing and metric collection.

## Complete Example

Here is a full Canary resource with comprehensive VirtualService configuration:

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: my-app
  namespace: default
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  service:
    port: 80
    targetPort: 8080
    gateways:
      - public-gateway.istio-system.svc.cluster.local
      - mesh
    hosts:
      - my-app.example.com
    retries:
      attempts: 3
      perTryTimeout: 5s
      retryOn: "gateway-error,connect-failure,refused-stream"
    timeout: 30s
    match:
      - uri:
          prefix: /
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    match:
      - headers:
          x-canary:
            exact: "true"
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
      - name: request-duration
        thresholdRange:
          max: 500
        interval: 1m
    webhooks:
      - name: load-test
        type: rollout
        url: http://flagger-loadtester.test/
        timeout: 5s
        metadata:
          cmd: "hey -z 1m -q 10 -c 2 http://my-app-canary.default:80/"
```

## Conclusion

Flagger automates Istio VirtualService management during canary deployments, handling traffic weight updates, routing rules, and promotion. Through the Canary resource's service spec, you can configure gateways, hosts, URI matching, retries, timeouts, CORS policies, and header-based canary routing. The VirtualService is the mechanism by which Flagger controls traffic distribution, and understanding its configuration gives you full control over how traffic flows during progressive delivery with Istio.
