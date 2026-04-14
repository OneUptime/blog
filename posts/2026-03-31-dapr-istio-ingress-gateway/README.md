# How to Use Dapr with Istio Ingress Gateway

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Istio, Ingress, Service Mesh, Kubernetes

Description: Configure Istio Ingress Gateway to route external traffic to Dapr microservices with mTLS, traffic policies, and Kiali observability integration.

---

## Overview

Istio is a full-featured service mesh that provides traffic management, security, and observability. When deployed with Dapr, Istio Ingress Gateway handles external traffic routing while Dapr manages application-level building blocks like pub/sub, state, and bindings. This guide covers configuring Istio Ingress Gateway for Dapr services with mTLS-aware routing.

## Prerequisites

- Istio installed on Kubernetes
- Dapr installed on the cluster (Dapr mTLS and Istio mTLS coexist)
- kubectl configured

## Installing Istio

```bash
# Download Istio
curl -L https://istio.io/downloadIstio | sh -
cd istio-1.21.0
export PATH=$PWD/bin:$PATH

# Install with default profile
istioctl install --set profile=default -y

# Enable Istio sidecar injection (optional - Dapr already has its own)
kubectl label namespace default istio-injection=enabled
```

## Dapr and Istio Configuration

When running both Dapr and Istio, keep Dapr mTLS enabled and disable Istio mTLS on Dapr-specific ports to avoid double-encryption conflicts. First, ensure Dapr mTLS is enabled:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: dapr-config
  namespace: default
spec:
  mtls:
    enabled: true
    allowedClockSkew: "15m"
```

Then disable Istio mTLS on Dapr sidecar ports using PeerAuthentication:

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: dapr-ports
  namespace: default
spec:
  selector:
    matchLabels:
      app: order-service
  portLevelMtls:
    "3500":
      mode: DISABLE
    "50002":
      mode: DISABLE
    "50001":
      mode: DISABLE
```

## Istio Gateway Configuration

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: dapr-gateway
  namespace: default
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: api-tls-secret
    hosts:
    - api.example.com
  - port:
      number: 80
      name: http
      protocol: HTTP
    hosts:
    - api.example.com
    tls:
      httpsRedirect: true
```

## Virtual Service for Dapr Services

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: order-service-vs
  namespace: default
spec:
  hosts:
  - api.example.com
  gateways:
  - dapr-gateway
  http:
  - match:
    - uri:
        prefix: /orders
    rewrite:
      uri: /
    route:
    - destination:
        host: order-service
        port:
          number: 80
      weight: 90
    - destination:
        host: order-service-v2
        port:
          number: 80
      weight: 10
    retries:
      attempts: 3
      retryOn: 5xx
    timeout: 10s
```

## Traffic Policy for Dapr Services

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: order-service-dr
  namespace: default
spec:
  host: order-service
  trafficPolicy:
    connectionPool:
      http:
        http2MaxRequests: 1000
        maxRequestsPerConnection: 100
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 1m
```

## Viewing Telemetry in Kiali

Access the Kiali service graph:

```bash
istioctl dashboard kiali
```

Filter for Dapr services in the Kiali UI using the `app` label matching your Dapr app IDs.

## Summary

Istio Ingress Gateway provides enterprise-grade traffic management for Dapr microservices with A/B testing, circuit breaking, and TLS at the ingress layer. When running both Istio and Dapr, configuring port-level mTLS exceptions for Dapr's ports ensures the two control planes coexist without conflicts.
