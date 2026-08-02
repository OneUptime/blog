# Header-Based Canary Routing with Argo Rollouts and Istio for External and Internal Traffic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Rollouts, Istio, Kubernetes, Header Routing, Canary Deployment, VirtualService, Service Mesh, Progressive Delivery

Description: Configure Argo Rollouts setHeaderRoute with Istio so authorized test requests reach canary through both an ingress gateway and in-mesh service calls.

---

Header-based canaries let testers exercise a new revision while ordinary users stay on stable. Argo Rollouts can create and remove a higher-precedence Istio route during a canary update with `setHeaderRoute`:

- a request carrying a chosen header is sent entirely to the canary destination;
- unmatched requests continue through the normal weighted stable/canary route;
- the managed header route is removed when the step removes it, and managed routes are cleaned up when the Rollout completes or aborts.

To cover both north-south and east-west traffic, the referenced Istio `VirtualService` must apply to the ingress gateway **and** the reserved `mesh` gateway. Internal callers must actually be in the mesh; a Pod without Istio traffic interception follows ordinary Kubernetes Service routing and never evaluates the VirtualService header rule.

## Architecture

This example uses host-level Istio traffic splitting:

```text
External client -> Istio ingress gateway --+
                                             +-> VirtualService -> checkout-canary
Meshed service -> sidecar (`mesh`) ----------+                 -> checkout-stable
```

The same VirtualService recognizes two hostnames:

- `checkout.example.com` for external requests entering through the public Istio Gateway;
- `checkout-stable.shop.svc.cluster.local` for internal callers using the stable Service DNS name.

The Rollouts controller manages:

- the stable Service selector's `rollouts-pod-template-hash`;
- the canary Service selector's `rollouts-pod-template-hash`;
- weights on the named primary VirtualService route;
- the temporary header route listed under `managedRoutes`.

## Prerequisites

Verify that Argo Rollouts and Istio APIs are available:

```bash
kubectl api-resources --api-group=argoproj.io | grep -w Rollout
kubectl api-resources --api-group=networking.istio.io | grep -E 'VirtualService|Gateway'
kubectl get deployment -n argo-rollouts
kubectl get pods -n istio-system
```

The Rollouts controller needs permission to get, watch, and update the referenced Istio resources and Services. Application Pods and internal test clients need sidecar injection or the equivalent ambient-mesh enrollment used by your Istio design. Argo's official Istio integration specifically warns that Pods excluded from the mesh use default Kubernetes routing.

## Create Stable and Canary Services

Both Services begin with the Rollout's common application selector. Argo injects the appropriate ReplicaSet hash as it reconciles:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: checkout-stable
  namespace: shop
spec:
  selector:
    app: checkout
  ports:
    - name: http
      port: 80
      targetPort: http
---
apiVersion: v1
kind: Service
metadata:
  name: checkout-canary
  namespace: shop
spec:
  selector:
    app: checkout
  ports:
    - name: http
      port: 80
      targetPort: http
```

Do not put a hard-coded `rollouts-pod-template-hash` in Git. The controller owns that dynamic selector value.

Use named Service and container ports with an HTTP-aware name so Istio can determine the application protocol. The Rollout Pod template below exposes the matching `http` port.

## Bind One VirtualService to External and Mesh Gateways

Assume a platform-managed Istio `Gateway` named `public-gateway` exists in `istio-system` and its server permits `checkout.example.com`.

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: checkout-routing
  namespace: shop
spec:
  hosts:
    - checkout.example.com
    - checkout-stable.shop.svc.cluster.local
  gateways:
    - istio-system/public-gateway
    - mesh
  http:
    - name: primary
      route:
        - destination:
            host: checkout-stable.shop.svc.cluster.local
            port:
              number: 80
          weight: 100
        - destination:
            host: checkout-canary.shop.svc.cluster.local
            port:
              number: 80
          weight: 0
```

The `primary` route name is important: the Rollout references it. Its two destination hosts correspond to the Rollout's stable and canary Services, and Istio requires their weights to add to 100.

The top-level gateway list has two distinct scopes:

- `istio-system/public-gateway` applies the rules to that ingress gateway;
- the reserved name `mesh` applies the rules to mesh sidecars.

If `mesh` is omitted, internal sidecars do not use this VirtualService. If the ingress Gateway is omitted, external gateway traffic does not use it. The Gateway's own server hosts must also match `checkout.example.com`, and the VirtualService must be exported/scoped so the gateway can see it.

An internal caller should use the hostname listed in `spec.hosts`:

```text
http://checkout-stable.shop.svc.cluster.local
```

Calling the canary Service directly bypasses the stable-host VirtualService decision and defeats the test. Calling another alias that is not in `hosts` may also miss the rule.

## Configure the Rollout and Managed Header Route

The following update holds ordinary traffic at 0% canary while running two canary Pods for header-selected testing:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: checkout
  namespace: shop
spec:
  replicas: 8
  selector:
    matchLabels:
      app: checkout
  template:
    metadata:
      labels:
        app: checkout
        sidecar.istio.io/inject: "true"
    spec:
      containers:
        - name: checkout
          image: registry.example.com/shop/checkout:2.5.0
          ports:
            - name: http
              containerPort: 8080
          readinessProbe:
            httpGet:
              path: /ready
              port: http
            periodSeconds: 5
  strategy:
    canary:
      stableService: checkout-stable
      canaryService: checkout-canary
      trafficRouting:
        managedRoutes:
          - name: qa-header
        istio:
          virtualService:
            name: checkout-routing
            routes:
              - primary
      steps:
        - setCanaryScale:
            replicas: 2
        - setWeight: 0
        - setHeaderRoute:
            name: qa-header
            match:
              - headerName: x-checkout-canary
                headerValue:
                  exact: enabled
        - pause: {}
        - setHeaderRoute:
            name: qa-header
        - setCanaryScale:
            matchTrafficWeight: true
        - setWeight: 20
        - pause:
            duration: 10m
        - setWeight: 50
        - pause:
            duration: 10m
```

`managedRoutes` grants Argo ownership over the named temporary route and defines precedence. Argo places managed routes, in listed order, above manually defined routes. Never list a permanent hand-written route under `managedRoutes`: Argo removes every listed managed route at Rollout completion or abort.

The `setHeaderRoute` name must exactly match the `managedRoutes` entry. Its header value must specify exactly one of `exact`, `prefix`, or `regex`. A later `setHeaderRoute` containing only the name disables/removes that header route.

`setCanaryScale` is essential when weighted traffic remains at zero. Without canary capacity, a matching route would point at an empty canary destination. After explicit scale control, `matchTrafficWeight: true` restores the default behavior in which canary scale tracks later `setWeight` steps.

Initial creation of a Rollout skips update steps because there is no prior revision. Deploy and verify the initial stable revision first, then change `spec.template` to exercise this header-canary sequence.

## Secure the Header at the Edge

A routing header is not authentication. If the public gateway accepts a predictable header from anyone, any internet client can opt into canary.

Choose an explicit policy:

- strip `x-checkout-canary` from untrusted inbound requests;
- inject it only after an authenticated test-user or corporate-access check;
- restrict the canary hostname or route at the gateway;
- use Istio authorization and the organization's identity layer where appropriate;
- avoid putting credentials or secrets in the route header itself.

The application may log the header for debugging, so treat its value as a routing signal rather than a bearer secret. A robust edge policy can translate an authenticated identity or protected test mechanism into the internal routing header.

Internal services can set the same header, but only authorized test workloads should do so. Apply egress or workload authorization appropriate to the risk of exposing the canary.

## Test External Traffic

Wait for the Rollout to reach the indefinite pause:

```bash
kubectl argo rollouts get rollout checkout -n shop --watch
```

Make ordinary and header-selected requests through the ingress gateway:

```bash
curl --fail --show-error https://checkout.example.com/version

curl --fail --show-error \
  -H 'x-checkout-canary: enabled' \
  https://checkout.example.com/version
```

The endpoint used for testing should return or expose a non-sensitive build version. Repeated requests without the header should stay on stable while `setWeight` is zero; header-matched requests should reach canary.

If the result does not switch, verify that the edge proxy preserved or injected the header, the request Host matches the VirtualService, and the public Gateway selected this VirtualService.

## Test Internal Mesh Traffic

Run the test from a Pod that is confirmed to participate in the mesh:

```bash
kubectl get pod -n shop <client-pod> \
  -o jsonpath='{.spec.containers[*].name}{"\n"}'

kubectl exec -n shop <client-pod> -c <application-container> -- \
  curl --fail --show-error \
  http://checkout-stable.shop.svc.cluster.local/version

kubectl exec -n shop <client-pod> -c <application-container> -- \
  curl --fail --show-error \
  -H 'x-checkout-canary: enabled' \
  http://checkout-stable.shop.svc.cluster.local/version
```

A non-meshed Pod calling `checkout-stable` goes directly through the Kubernetes Service and should remain on stable. That is expected and is an important negative test. If all internal callers must participate in the canary, enforce mesh enrollment and monitor bypass paths rather than assuming the VirtualService captures every Pod.

## Verify What Argo Wrote

Inspect the live VirtualService while paused:

```bash
kubectl get virtualservice checkout-routing -n shop -o yaml
kubectl get service checkout-stable checkout-canary -n shop -o yaml
kubectl get endpointslice -n shop \
  -l kubernetes.io/service-name=checkout-stable
kubectl get endpointslice -n shop \
  -l kubernetes.io/service-name=checkout-canary
```

The managed header route should appear ahead of `primary`, and its destination should be canary. The stable and canary EndpointSlices should contain Ready Pods from their respective ReplicaSet hashes.

Use Istio's configuration tools to catch invalid or unapplied configuration:

```bash
istioctl analyze -n shop
istioctl proxy-config routes <ingress-gateway-pod> -n istio-system
istioctl proxy-config routes <client-pod> -n shop
```

Inspecting both proxies proves that external and internal data planes received the route, rather than merely showing the desired VirtualService object.

## Promotion, Removal, and Abort

After testing, promotion advances to the explicit route-removal step:

```bash
kubectl argo rollouts promote checkout -n shop
```

Confirm the `qa-header` managed route disappears before weighted canary exposure increases. On abort, Argo removes managed routes listed in `managedRoutes` and returns traffic toward the stable version according to the strategy.

```bash
kubectl argo rollouts abort checkout -n shop
kubectl get virtualservice checkout-routing -n shop -o yaml
```

Test abort in a non-production environment, including external and internal paths. A safe configuration needs a verified cleanup path, not only a successful enable path.

## GitOps Ownership

The VirtualService is declared in Git, while Argo Rollouts dynamically changes its weights and managed routes. A GitOps controller that repeatedly reapplies the original route list can create weight or route flapping.

Follow Argo's documented Istio integration guidance to ignore Rollout-managed weight fields and make the GitOps controller respect ignored differences during apply. Account for the temporary managed route fields too, based on the exact structure produced by your Rollouts version. Keep permanent route structure, hosts, gateways, TLS, and other policy in Git; delegate only the dynamic fields required by Rollouts.

## Common Failure Modes

### External works, internal does not

The VirtualService omitted `mesh`, the caller is not meshed, or the internal request uses a hostname not listed in `hosts`.

### Internal works, external does not

The VirtualService is not bound to the ingress Gateway, the Gateway server host does not match, or an upstream proxy strips the header.

### Header traffic returns 503

The canary Service has no Ready endpoints. Check explicit canary scale, readiness, Service hash selector, EndpointSlices, and DestinationRule/TLS policy.

### Header route never appears

Confirm the Rollout is on the `setHeaderRoute` step, the names match, the route is listed under `managedRoutes`, the provider is Istio, and controller logs contain no RBAC or reconciliation errors.

### More users reach canary than expected

The header is publicly spoofable, a proxy injects it too broadly, or a weighted `setWeight` greater than zero is also sending unmatched traffic to canary.

### A permanent route vanished

It was mistakenly listed under `managedRoutes`. That array is exclusively for routes Argo owns and removes.

## Official Documentation

- [Argo Rollouts: Traffic management and managed routes](https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/)
- [Argo Rollouts: Istio traffic routing](https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/istio/)
- [Argo Rollouts: Istio getting-started guide](https://argo-rollouts.readthedocs.io/en/stable/getting-started/istio/)
- [Argo Rollouts: Canary strategy and dynamic scale](https://argo-rollouts.readthedocs.io/en/stable/features/canary/)
- [Argo Rollouts: Rollout specification](https://argo-rollouts.readthedocs.io/en/stable/features/specification/)
- [Istio: VirtualService reference](https://istio.io/latest/docs/reference/config/networking/virtual-service/)
- [Istio: Gateway reference](https://istio.io/latest/docs/reference/config/networking/gateway/)
- [Istio: Request routing](https://istio.io/latest/docs/tasks/traffic-management/request-routing/)
- [Istio: Traffic management concepts](https://istio.io/latest/docs/concepts/traffic-management/)
