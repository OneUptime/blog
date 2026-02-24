# How to Route Traffic by Source Service in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Traffic Routing, Source Labels, Kubernetes, Microservices

Description: Route traffic to different service versions based on the calling service identity using Istio VirtualService sourceLabels for fine-grained service-to-service routing.

---

In a microservices architecture, the same backend service often gets called by many different frontend services. Sometimes you want to route those calls differently depending on who is calling. Maybe your mobile API gateway should hit a different version of the recommendation service than your web API gateway. Or maybe your batch processing service should be routed to a deployment with higher resource limits while real-time services hit a leaner deployment.

Istio supports this through `sourceLabels` matching in VirtualService, which lets you route based on the labels of the calling pod.

## How sourceLabels Works

When a pod sends a request through the Istio sidecar, the sidecar knows the labels of its own pod. Istio's VirtualService lets you match on these labels using the `sourceLabels` field. If the labels on the calling pod match the specified labels, the corresponding route is used.

This is a powerful primitive because Kubernetes labels are already how you identify workloads. Your deployments probably already have labels like `app: frontend`, `app: mobile-gateway`, or `app: batch-processor`.

## Prerequisites

- Kubernetes cluster with Istio and sidecar injection enabled
- Multiple services with distinct labels
- A target service with multiple versions deployed

## DestinationRule

Set up subsets for the target service:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: recommendation-dr
  namespace: default
spec:
  host: recommendation-service
  subsets:
    - name: realtime
      labels:
        version: v1-realtime
    - name: batch
      labels:
        version: v1-batch
    - name: experimental
      labels:
        version: v2-experimental
```

```bash
kubectl apply -f destination-rule.yaml
```

## Basic Source Service Routing

Route traffic based on which service is making the call:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: recommendation-vs
  namespace: default
spec:
  hosts:
    - recommendation-service
  http:
    - match:
        - sourceLabels:
            app: batch-processor
      route:
        - destination:
            host: recommendation-service
            subset: batch
    - match:
        - sourceLabels:
            app: mobile-gateway
      route:
        - destination:
            host: recommendation-service
            subset: experimental
    - route:
        - destination:
            host: recommendation-service
            subset: realtime
```

When the `batch-processor` service calls `recommendation-service`, it gets routed to the `batch` subset. When `mobile-gateway` calls it, traffic goes to the `experimental` subset. All other callers get the `realtime` subset.

```bash
kubectl apply -f virtual-service.yaml
```

## Matching Multiple Labels

You can match on multiple labels for more specific routing. All labels in a `sourceLabels` block must match (AND logic):

```yaml
- match:
    - sourceLabels:
        app: api-gateway
        tier: premium
  route:
    - destination:
        host: recommendation-service
        subset: premium
- match:
    - sourceLabels:
        app: api-gateway
        tier: standard
  route:
    - destination:
        host: recommendation-service
        subset: standard
```

This routes traffic from the premium-tier API gateway to a premium subset and the standard-tier gateway to a standard subset. Both the `app` and `tier` labels must match.

## Real-World Example: Read vs. Write Callers

Some services call your backend for reads, others for writes. You can route based on the caller type:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: data-service-vs
  namespace: default
spec:
  hosts:
    - data-service
  http:
    - match:
        - sourceLabels:
            role: writer
      route:
        - destination:
            host: data-service
            subset: write-optimized
      timeout: 30s
      retries:
        attempts: 1
    - match:
        - sourceLabels:
            role: reader
      route:
        - destination:
            host: data-service
            subset: read-optimized
      timeout: 5s
      retries:
        attempts: 3
        perTryTimeout: 2s
    - route:
        - destination:
            host: data-service
            subset: read-optimized
      timeout: 10s
```

Writer services get a longer timeout with fewer retries (since writes may not be idempotent). Reader services get shorter timeouts with more retries.

## Combining sourceLabels with Header Matching

You can combine source labels with other match conditions for even more granular routing:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: recommendation-vs
  namespace: default
spec:
  hosts:
    - recommendation-service
  http:
    - match:
        - sourceLabels:
            app: mobile-gateway
          headers:
            x-api-version:
              exact: "v2"
      route:
        - destination:
            host: recommendation-service
            subset: experimental
    - match:
        - sourceLabels:
            app: mobile-gateway
      route:
        - destination:
            host: recommendation-service
            subset: realtime
    - route:
        - destination:
            host: recommendation-service
            subset: realtime
```

Here, the mobile gateway calling with the `x-api-version: v2` header gets the experimental subset. The mobile gateway without that header gets the realtime subset. Everything else also gets realtime.

## Canary Per Caller

You can do caller-specific canary deployments. Roll out a new version for one calling service at a time:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: payment-vs
  namespace: default
spec:
  hosts:
    - payment-service
  http:
    - match:
        - sourceLabels:
            app: checkout-service
      route:
        - destination:
            host: payment-service
            subset: v2
          weight: 20
        - destination:
            host: payment-service
            subset: v1
          weight: 80
    - route:
        - destination:
            host: payment-service
            subset: v1
```

Only the checkout-service gets 20% of its traffic routed to v2. All other callers continue to use v1 exclusively. This reduces blast radius during rollouts.

## Labeling Your Deployments

For sourceLabels to work, your calling services need the appropriate labels on their pods. Here is an example deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mobile-gateway
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: mobile-gateway
  template:
    metadata:
      labels:
        app: mobile-gateway
        tier: premium
        role: reader
    spec:
      containers:
        - name: mobile-gateway
          image: my-registry/mobile-gateway:1.0
          ports:
            - containerPort: 8080
```

The labels `app`, `tier`, and `role` on the pod template are what Istio uses for sourceLabels matching.

## Testing

Send requests from different services and verify routing:

```bash
# Check routing from batch-processor
kubectl exec deploy/batch-processor -c batch-processor -- curl -s http://recommendation-service.default.svc.cluster.local/version

# Check routing from mobile-gateway
kubectl exec deploy/mobile-gateway -c mobile-gateway -- curl -s http://recommendation-service.default.svc.cluster.local/version

# Check routing from web-gateway
kubectl exec deploy/web-gateway -c web-gateway -- curl -s http://recommendation-service.default.svc.cluster.local/version
```

Inspect the routes pushed to specific proxies:

```bash
istioctl proxy-config routes deploy/batch-processor -n default
istioctl proxy-config routes deploy/mobile-gateway -n default
```

## Things to Watch Out For

**Labels must be on pods, not deployments.** The `sourceLabels` match looks at pod labels, which come from the pod template in a Deployment. Labels on the Deployment metadata itself are not used for routing.

**CronJobs and Jobs.** If you use Kubernetes Jobs or CronJobs, make sure the pod template has the right labels. Jobs sometimes get auto-generated labels that you might need to override.

**Sidecar required.** Like all VirtualService matching, sourceLabels only works when the calling pod has the Istio sidecar injected. Without the sidecar, no routing rules apply.

**Label changes need rollout.** If you change labels on a Deployment's pod template, Kubernetes needs to roll out new pods for the change to take effect. Existing pods keep their old labels until they are replaced.

## Validation

```bash
istioctl analyze -n default
kubectl get pods --show-labels -n default
```

The second command helps verify that your pods actually have the labels you expect.

## Summary

Routing by source service in Istio gives you fine-grained control over service-to-service communication. Using `sourceLabels`, you can route based on the identity and characteristics of the calling service, which is great for caller-specific canary deployments, differentiated service tiers, and per-caller policy tuning. It builds on Kubernetes labels you likely already have, so the integration is natural and does not require changes to your application code.
