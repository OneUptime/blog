# How to Set Up Istio for Service Mesh Interface (SMI) Compatibility

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, SMI, Service Mesh, Kubernetes, Interoperability, Standards

Description: Configure Istio to work with the Service Mesh Interface standard using SMI adapter and compatible API resources for portable mesh configurations.

---

The Service Mesh Interface (SMI) is a specification that defines a standard set of APIs for common service mesh functionality. The idea is that you write your traffic policies once using SMI resources, and they work on any service mesh that supports SMI - whether that is Istio, Linkerd, Consul Connect, or Open Service Mesh.

Istio does not natively support SMI APIs. Istio uses its own CRDs (VirtualService, DestinationRule, AuthorizationPolicy, etc.). But you can use the SMI adapter for Istio to translate SMI resources into native Istio configuration. This gives you portability without giving up Istio's advanced features.

## Why Care About SMI

There are a few practical reasons to care about SMI compatibility:

1. **Multi-mesh environments**: Your organization uses Istio in some clusters and Linkerd in others. SMI lets you use the same traffic policies across both.
2. **Tool compatibility**: Some tools (like Flagger, certain CI/CD pipelines) generate SMI resources. If you are using one of these tools, you need your mesh to understand SMI.
3. **Avoiding lock-in**: Writing your policies in SMI means you can switch mesh implementations without rewriting everything.
4. **Simplicity**: SMI APIs are simpler than Istio's. For basic use cases, SMI is easier to work with.

## SMI API Overview

SMI defines four API groups:

- **Traffic Access Control** (`access.smi-spec.io`): Define which services can communicate
- **Traffic Specs** (`specs.smi-spec.io`): Define how traffic looks (HTTP routes, headers)
- **Traffic Split** (`split.smi-spec.io`): Control traffic distribution between service versions
- **Traffic Metrics** (`metrics.smi-spec.io`): Standard API for querying mesh metrics

## Installing the SMI Adapter for Istio

The SMI Istio adapter watches for SMI resources and creates corresponding Istio resources. Install it with:

```bash
kubectl apply -f https://github.com/servicemeshinterface/smi-adapter-istio/releases/latest/download/smi-adapter-istio.yaml
```

Or using Helm:

```bash
helm repo add smi https://servicemeshinterface.github.io/smi-adapter-istio
helm install smi-adapter smi/smi-adapter-istio --namespace istio-system
```

Verify the adapter is running:

```bash
kubectl get pods -n istio-system -l app=smi-adapter-istio
```

## Traffic Split: Canary Deployments with SMI

The TrafficSplit resource is the SMI equivalent of Istio's VirtualService with weighted routing. Here is a canary deployment using SMI:

```yaml
apiVersion: split.smi-spec.io/v1alpha4
kind: TrafficSplit
metadata:
  name: my-service
  namespace: production
spec:
  service: my-service
  backends:
  - service: my-service-v1
    weight: 90
  - service: my-service-v2
    weight: 10
```

This sends 90% of traffic to my-service-v1 and 10% to my-service-v2. The SMI adapter translates this into an Istio VirtualService and DestinationRule behind the scenes.

For this to work, you need separate Kubernetes Services for each version:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
  namespace: production
spec:
  selector:
    app: my-service
  ports:
  - port: 80
    targetPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: my-service-v1
  namespace: production
spec:
  selector:
    app: my-service
    version: v1
  ports:
  - port: 80
    targetPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: my-service-v2
  namespace: production
spec:
  selector:
    app: my-service
    version: v2
  ports:
  - port: 80
    targetPort: 8080
```

The `my-service` is the root service that clients call. `my-service-v1` and `my-service-v2` are the backend services that the TrafficSplit distributes to.

## Traffic Access Control with SMI

SMI's TrafficTarget resource controls which services can talk to which. This translates to Istio's AuthorizationPolicy:

```yaml
apiVersion: access.smi-spec.io/v1alpha3
kind: TrafficTarget
metadata:
  name: allow-frontend-to-backend
  namespace: production
spec:
  destination:
    kind: ServiceAccount
    name: backend-service
    namespace: production
  sources:
  - kind: ServiceAccount
    name: frontend-service
    namespace: production
  rules:
  - kind: HTTPRouteGroup
    name: backend-routes
    matches:
    - api-read
    - api-write
```

This allows the frontend-service (identified by its ServiceAccount) to call the backend-service, but only on the routes defined in the HTTPRouteGroup.

## HTTP Route Groups

The HTTPRouteGroup defines the traffic patterns that access control rules reference:

```yaml
apiVersion: specs.smi-spec.io/v1alpha4
kind: HTTPRouteGroup
metadata:
  name: backend-routes
  namespace: production
spec:
  matches:
  - name: api-read
    pathRegex: "/api/.*"
    methods:
    - GET
  - name: api-write
    pathRegex: "/api/.*"
    methods:
    - POST
    - PUT
    - DELETE
  - name: health
    pathRegex: "/healthz"
    methods:
    - GET
```

This defines three route groups: api-read (GET on /api/*), api-write (POST/PUT/DELETE on /api/*), and health (GET on /healthz).

## Combining TrafficTarget and HTTPRouteGroup

Use them together for fine-grained access control:

```yaml
apiVersion: specs.smi-spec.io/v1alpha4
kind: HTTPRouteGroup
metadata:
  name: order-routes
  namespace: production
spec:
  matches:
  - name: read-orders
    pathRegex: "/api/orders.*"
    methods:
    - GET
  - name: create-order
    pathRegex: "/api/orders"
    methods:
    - POST
---
apiVersion: access.smi-spec.io/v1alpha3
kind: TrafficTarget
metadata:
  name: frontend-read-orders
  namespace: production
spec:
  destination:
    kind: ServiceAccount
    name: order-service
    namespace: production
  sources:
  - kind: ServiceAccount
    name: frontend-service
    namespace: production
  rules:
  - kind: HTTPRouteGroup
    name: order-routes
    matches:
    - read-orders
    - create-order
---
apiVersion: access.smi-spec.io/v1alpha3
kind: TrafficTarget
metadata:
  name: analytics-read-orders
  namespace: production
spec:
  destination:
    kind: ServiceAccount
    name: order-service
    namespace: production
  sources:
  - kind: ServiceAccount
    name: analytics-service
    namespace: production
  rules:
  - kind: HTTPRouteGroup
    name: order-routes
    matches:
    - read-orders
```

The frontend can read and create orders. The analytics service can only read orders, not create them. The SMI adapter translates these into Istio AuthorizationPolicy resources.

## Using Flagger with SMI and Istio

Flagger is a progressive delivery tool that natively supports SMI. If you configure Flagger with SMI, it creates TrafficSplit resources that the SMI adapter translates for Istio:

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: my-service
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-service
  service:
    port: 80
    targetPort: 8080
    meshName: my-service
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
      interval: 30s
  provider: smi:istio
```

The `provider: smi:istio` tells Flagger to use SMI APIs with the Istio adapter. Flagger automates canary deployments by creating and updating TrafficSplit resources.

## Verifying SMI Resources Are Translated

Check that the SMI adapter is creating Istio resources:

```bash
# Check SMI resources
kubectl get trafficsplit -n production
kubectl get traffictarget -n production
kubectl get httproutegroup -n production

# Check the corresponding Istio resources created by the adapter
kubectl get virtualservice -n production
kubectl get destinationrule -n production
kubectl get authorizationpolicy -n production
```

The adapter creates Istio resources with names that reference the original SMI resource. Look for resources with labels like `smi-adapter-istio=true` or similar markers.

## Limitations of the SMI Adapter

SMI covers the basics but does not map to all Istio features:

- **No circuit breaking**: SMI does not have a circuit breaking API. Use native Istio DestinationRules for this.
- **No fault injection**: SMI does not support fault injection. Use native Istio VirtualService fault rules.
- **No request mirroring**: SMI does not have a mirroring API.
- **Limited retry configuration**: SMI does not define retry policies.
- **No rate limiting**: Use native Istio EnvoyFilter for rate limiting.

For advanced features, mix SMI resources with native Istio resources. They can coexist in the same namespace.

## Mixing SMI and Native Istio Resources

You can use SMI for the simple stuff and Istio for the advanced stuff:

```yaml
# SMI for basic traffic splitting
apiVersion: split.smi-spec.io/v1alpha4
kind: TrafficSplit
metadata:
  name: my-service
  namespace: production
spec:
  service: my-service
  backends:
  - service: my-service-v1
    weight: 80
  - service: my-service-v2
    weight: 20
---
# Native Istio for circuit breaking (not available in SMI)
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-service-v2-circuit-breaker
  namespace: production
spec:
  host: my-service-v2
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
```

Be careful when mixing - make sure the SMI-generated Istio resources do not conflict with your hand-written ones. Check for duplicate VirtualServices targeting the same host.

## Testing SMI Compatibility

Verify your SMI setup works correctly:

```bash
# Create a traffic split
kubectl apply -f traffic-split.yaml

# Verify the Istio VirtualService was created
kubectl get virtualservice -n production -o yaml

# Test traffic distribution
for i in $(seq 1 100); do
  kubectl exec deploy/sleep -- curl -s http://my-service/api/version
done | sort | uniq -c
```

You should see roughly 80 responses from v1 and 20 from v2 (matching your traffic split weights).

## Summary

SMI provides a portable API layer on top of service meshes like Istio. Install the SMI adapter for Istio to translate SMI TrafficSplit, TrafficTarget, and HTTPRouteGroup resources into native Istio configuration. Use SMI for basic traffic splitting and access control, and fall back to native Istio resources for advanced features like circuit breaking, fault injection, and rate limiting. SMI is particularly useful when you use tools like Flagger that generate SMI resources or when you need to maintain mesh portability across different mesh implementations. The SMI adapter handles the translation transparently, so the two approaches coexist without conflict.
