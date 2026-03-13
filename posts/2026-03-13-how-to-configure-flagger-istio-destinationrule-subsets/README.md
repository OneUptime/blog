# How to Configure Flagger Istio DestinationRule Subsets

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flagger, Istio, DestinationRule, Subsets, Canary, Kubernetes, Progressive Delivery, Traffic Policy

Description: Learn how Flagger manages Istio DestinationRule subsets during canary deployments and how to configure traffic policies for primary and canary workloads.

---

## Introduction

When Flagger operates with Istio, it creates and manages DestinationRule resources alongside VirtualServices. DestinationRules define traffic policies that apply to traffic after routing has occurred. They control connection pool settings, outlier detection, load balancing, and TLS settings for specific service subsets.

Flagger automatically creates DestinationRule subsets for the primary and canary workloads. Understanding how these subsets work lets you configure connection pooling, circuit breaking, and other traffic policies that affect canary behavior during progressive delivery.

This guide covers how Flagger manages DestinationRule subsets, how to customize traffic policies, and common configuration patterns.

## Prerequisites

- A running Kubernetes cluster with Istio installed
- Flagger installed with `meshProvider=istio`
- kubectl access to your cluster
- A basic understanding of Istio DestinationRules

## How Flagger Creates DestinationRules

When you create a Canary resource, Flagger generates a DestinationRule with subsets that identify the primary and canary workloads. The VirtualService references these subsets in its routing rules.

For a Canary targeting a Deployment named `my-app`, Flagger creates a DestinationRule like:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-app
  namespace: default
spec:
  host: my-app
  subsets:
    - name: primary
      labels:
        app: my-app-primary
    - name: canary
      labels:
        app: my-app
```

The subsets use label selectors to distinguish between primary and canary pods. Flagger manages the labels on the Deployments to ensure correct subset matching.

## Adding Traffic Policies through the Canary Spec

Flagger allows you to specify traffic policy settings in the Canary resource's service spec using the `trafficPolicy` field:

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
    trafficPolicy:
      connectionPool:
        tcp:
          maxConnections: 100
        http:
          h2UpgradePolicy: DEFAULT
          http1MaxPendingRequests: 100
          http2MaxRequests: 1000
      outlierDetection:
        consecutive5xxErrors: 5
        interval: 30s
        baseEjectionTime: 30s
        maxEjectionPercent: 50
    gateways:
      - my-gateway.istio-system.svc.cluster.local
    hosts:
      - my-app.example.com
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
```

Flagger applies these traffic policies to the generated DestinationRule, affecting both primary and canary subsets.

## Connection Pool Settings

Connection pool settings control how the Envoy proxy manages connections to the upstream service:

```yaml
  service:
    port: 80
    targetPort: 8080
    trafficPolicy:
      connectionPool:
        tcp:
          maxConnections: 200
          connectTimeout: 30s
        http:
          http1MaxPendingRequests: 200
          http2MaxRequests: 500
          maxRequestsPerConnection: 100
          maxRetries: 3
```

These settings help prevent connection exhaustion during canary analysis when traffic is split between primary and canary:

- `maxConnections`: Maximum TCP connections to the service
- `http1MaxPendingRequests`: Maximum pending HTTP/1.1 requests
- `http2MaxRequests`: Maximum active HTTP/2 requests
- `maxRequestsPerConnection`: Maximum requests per connection before closing
- `maxRetries`: Maximum number of retries

## Outlier Detection (Circuit Breaking)

Outlier detection configures circuit breaking behavior for the service:

```yaml
  service:
    port: 80
    targetPort: 8080
    trafficPolicy:
      outlierDetection:
        consecutive5xxErrors: 5
        interval: 10s
        baseEjectionTime: 30s
        maxEjectionPercent: 100
```

This ejects unhealthy pods from the load balancing pool:

- `consecutive5xxErrors`: Number of consecutive 5xx errors before ejection (replaces the deprecated `consecutiveErrors` field)
- `interval`: How often the ejection analysis runs
- `baseEjectionTime`: Minimum ejection duration
- `maxEjectionPercent`: Maximum percentage of hosts that can be ejected

Outlier detection works alongside Flagger's metric-based analysis. While Flagger evaluates canary health at the analysis interval, Istio's outlier detection provides pod-level circuit breaking within each analysis step.

## Load Balancing Configuration

Configure the load balancing algorithm:

```yaml
  service:
    port: 80
    targetPort: 8080
    trafficPolicy:
      loadBalancer:
        simple: LEAST_REQUEST
```

Available algorithms include:

- `ROUND_ROBIN`: Default round-robin distribution
- `LEAST_REQUEST`: Routes to the host with the fewest active requests
- `RANDOM`: Random host selection
- `PASSTHROUGH`: Direct connection without load balancing

For canary deployments, `LEAST_REQUEST` can help distribute traffic more evenly when pods have different response times.

## TLS Settings

Configure TLS mode for traffic between the proxy and the service:

```yaml
  service:
    port: 80
    targetPort: 8080
    trafficPolicy:
      tls:
        mode: ISTIO_MUTUAL
```

TLS modes include:

- `DISABLE`: No TLS
- `SIMPLE`: Originate TLS to upstream
- `MUTUAL`: Mutual TLS with client certificates
- `ISTIO_MUTUAL`: Mutual TLS using Istio-generated certificates

When Istio's mesh-wide mTLS is enabled, `ISTIO_MUTUAL` ensures that the DestinationRule aligns with the mesh configuration.

## Complete Example with All Traffic Policies

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
    trafficPolicy:
      connectionPool:
        tcp:
          maxConnections: 200
          connectTimeout: 30s
        http:
          http1MaxPendingRequests: 200
          http2MaxRequests: 500
          maxRetries: 3
      loadBalancer:
        simple: LEAST_REQUEST
      outlierDetection:
        consecutive5xxErrors: 5
        interval: 10s
        baseEjectionTime: 30s
        maxEjectionPercent: 50
      tls:
        mode: ISTIO_MUTUAL
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

## Inspecting the Generated DestinationRule

After applying a Canary resource, inspect the DestinationRule that Flagger creates:

```bash
kubectl get destinationrule my-app -o yaml
```

This shows the full DestinationRule with subsets and traffic policies as configured through the Canary spec.

## Conclusion

Flagger automatically manages Istio DestinationRule subsets for primary and canary workloads during progressive delivery. Through the Canary resource's `trafficPolicy` field, you can configure connection pooling, outlier detection, load balancing, and TLS settings that apply to the generated DestinationRule. These traffic policies work alongside Flagger's metric-based analysis to provide both mesh-level resilience and progressive delivery safety. Understanding the DestinationRule configuration helps you tune how Istio handles traffic to your services during and after canary deployments.
