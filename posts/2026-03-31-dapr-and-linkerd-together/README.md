# How to Use Dapr and Linkerd Together

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Linkerd, Service Mesh, Integration, Kubernetes

Description: Configure Dapr and Linkerd to work together on Kubernetes, enabling Linkerd's lightweight mTLS and observability alongside Dapr's application building blocks.

---

Dapr and Linkerd are a natural pairing for teams that want Dapr's application-level building blocks combined with Linkerd's lightweight, zero-config service mesh capabilities. This guide walks through the configuration steps to make them work together correctly.

## Why Combine Dapr and Linkerd

**Dapr provides:** State management, pub/sub, service invocation, actors, workflows, bindings.

**Linkerd provides:** Automatic mTLS between all meshed services, latency-aware load balancing, golden metrics (success rate, requests per second, latency), and traffic splitting with zero application changes.

Together, Linkerd handles the network layer while Dapr handles the application layer.

## Installation

Install Linkerd first, then Dapr:

```bash
# Install Linkerd CLI (edge release)
curl --proto '=https' --tlsv1.2 -sSfL https://run.linkerd.io/install-edge | sh

# Install Linkerd control plane
linkerd install --crds | kubectl apply -f -
linkerd install | kubectl apply -f -
linkerd check

# Install Dapr
helm install dapr dapr/dapr -n dapr-system --create-namespace --wait
```

## Meshing the dapr-system Namespace

Inject Linkerd into the Dapr control plane:

```bash
kubectl annotate namespace dapr-system \
  linkerd.io/inject=enabled
kubectl rollout restart deployment -n dapr-system
```

## Meshing Your Application Namespace

```bash
kubectl annotate namespace default \
  linkerd.io/inject=enabled
```

Or per-deployment:

```yaml
annotations:
  linkerd.io/inject: "enabled"
  dapr.io/enabled: "true"
  dapr.io/app-id: "myapp"
```

## Disabling Dapr's mTLS

Since Linkerd handles mTLS for all pod-to-pod traffic, disable Dapr's built-in mTLS to avoid redundant double encryption:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: dapr-config
  namespace: default
spec:
  mtls:
    enabled: false
```

```yaml
annotations:
  dapr.io/config: "dapr-config"
```

## Handling Port Exclusions

Linkerd should not intercept localhost-only traffic between your application container and the Dapr sidecar, or the metrics scraping port. However, Dapr's internal gRPC port (50002), used for sidecar-to-sidecar communication across the network, must remain proxied by Linkerd so it receives mTLS encryption. Annotate your pods:

```yaml
annotations:
  config.linkerd.io/skip-inbound-ports: "3500,50001,9090"
  config.linkerd.io/skip-outbound-ports: "3500,50001"
```

## Viewing Linkerd Metrics for Dapr Traffic

Dapr service invocation calls appear in Linkerd's observability as regular HTTP/gRPC traffic:

```bash
# Install Linkerd viz
linkerd viz install | kubectl apply -f -
linkerd viz dashboard
```

In the dashboard, you will see success rates and latency for all Dapr-mediated service calls.

## Traffic Splitting with Linkerd

Use Linkerd's HTTPRoute for canary releases of Dapr-enabled services:

```yaml
apiVersion: policy.linkerd.io/v1beta3
kind: HTTPRoute
metadata:
  name: order-service-split
spec:
  parentRefs:
  - name: order-service
    kind: Service
    group: core
    port: 8080
  rules:
  - backendRefs:
    - name: order-service-v1
      port: 8080
      weight: 90
    - name: order-service-v2
      port: 8080
      weight: 10
```

## Summary

Dapr and Linkerd work well together with two key configuration steps: disable Dapr's built-in mTLS to let Linkerd handle encryption, and exclude Dapr's localhost-only sidecar ports from Linkerd's proxy interception while keeping network-facing ports proxied. Linkerd's lightweight proxy adds virtually no overhead while providing automatic mTLS and golden metrics for all Dapr-mediated service calls.
