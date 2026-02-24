# How to Migrate from Linkerd to Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Linkerd, Migration, Service Mesh, Kubernetes

Description: A comprehensive guide to migrating from Linkerd to Istio covering feature mapping, sidecar migration, policy conversion, and a phased transition approach.

---

Linkerd and Istio are both service meshes, but they have different philosophies. Linkerd focuses on simplicity and low resource usage. Istio offers more features and configurability. Teams often start with Linkerd for its ease of adoption and later consider Istio when they need advanced traffic management, richer policy control, or features like traffic mirroring and request-level authorization.

Migrating between service meshes is more involved than switching ingress controllers because the sidecar proxies are deeply integrated with every pod in your cluster. You can't run both meshes on the same pod - a pod gets either a Linkerd proxy or an Envoy sidecar, not both.

## Planning the Migration

The migration needs to happen namespace by namespace or service by service. During the transition, some namespaces will be on Linkerd and some on Istio. Cross-mesh communication works because both meshes can do mTLS in PERMISSIVE mode, allowing plaintext connections from the other mesh.

Here's the approach:

1. Install Istio alongside Linkerd
2. Set Istio to PERMISSIVE mTLS mode
3. Keep Linkerd in its default mode (permissive)
4. Migrate one namespace at a time
5. After all namespaces are migrated, switch Istio to STRICT mode
6. Remove Linkerd

## Feature Mapping

| Linkerd | Istio |
|---|---|
| ServiceProfile | VirtualService + DestinationRule |
| TrafficSplit | VirtualService (weighted routing) |
| Server/ServerAuthorization | AuthorizationPolicy |
| linkerd-viz | Kiali + Prometheus + Grafana |
| Retries (ServiceProfile) | VirtualService retries |
| Timeouts (ServiceProfile) | VirtualService timeout |
| tap/top | istioctl proxy-config / Kiali |
| Multicluster (gateway) | Istio multi-cluster |
| proxy-init | istio-init |

## Step 1: Install Istio

Install Istio with PERMISSIVE mTLS so it can communicate with Linkerd-meshed services:

```bash
istioctl install --set profile=default
```

Set mesh-wide PERMISSIVE mode:

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: PERMISSIVE
```

## Step 2: Convert ServiceProfiles to VirtualServices

Linkerd uses ServiceProfile resources for retries, timeouts, and per-route configuration.

Linkerd ServiceProfile:

```yaml
apiVersion: linkerd.io/v1alpha2
kind: ServiceProfile
metadata:
  name: order-service.default.svc.cluster.local
  namespace: default
spec:
  routes:
  - name: POST /api/orders
    condition:
      method: POST
      pathRegex: /api/orders
    isRetryable: false
    timeout: 10s
  - name: GET /api/orders/{id}
    condition:
      method: GET
      pathRegex: /api/orders/[^/]+
    isRetryable: true
    timeout: 5s
  retryBudget:
    retryRatio: 0.2
    minRetriesPerSecond: 10
    ttl: 30s
```

Istio VirtualService equivalent:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: order-service-vs
  namespace: default
spec:
  hosts:
  - order-service
  http:
  - match:
    - method:
        exact: POST
      uri:
        prefix: /api/orders
    timeout: 10s
    retries:
      attempts: 0
    route:
    - destination:
        host: order-service
  - match:
    - method:
        exact: GET
      uri:
        regex: /api/orders/[^/]+
    timeout: 5s
    retries:
      attempts: 3
      perTryTimeout: 2s
      retryOn: 5xx,reset,connect-failure
    route:
    - destination:
        host: order-service
```

Note: Istio doesn't have a built-in retry budget like Linkerd. You can approximate it with circuit breaking in the DestinationRule.

## Step 3: Convert TrafficSplits

Linkerd uses the SMI TrafficSplit resource for canary deployments.

Linkerd TrafficSplit:

```yaml
apiVersion: split.smi-spec.io/v1alpha2
kind: TrafficSplit
metadata:
  name: order-service-split
  namespace: default
spec:
  service: order-service
  backends:
  - service: order-service-stable
    weight: 900
  - service: order-service-canary
    weight: 100
```

Istio equivalent:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: order-service-dr
  namespace: default
spec:
  host: order-service
  subsets:
  - name: stable
    labels:
      version: stable
  - name: canary
    labels:
      version: canary
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: order-service-vs
  namespace: default
spec:
  hosts:
  - order-service
  http:
  - route:
    - destination:
        host: order-service
        subset: stable
      weight: 90
    - destination:
        host: order-service
        subset: canary
      weight: 10
```

With Linkerd, you use separate Kubernetes Services for each version. With Istio, you use a single Service and DestinationRule subsets based on pod labels. You might need to adjust your deployment manifests to add version labels.

## Step 4: Convert Authorization Policies

Linkerd uses Server and ServerAuthorization resources.

Linkerd:

```yaml
apiVersion: policy.linkerd.io/v1beta2
kind: Server
metadata:
  name: order-service-server
  namespace: default
spec:
  podSelector:
    matchLabels:
      app: order-service
  port: 8080
---
apiVersion: policy.linkerd.io/v1alpha1
kind: ServerAuthorization
metadata:
  name: order-service-authz
  namespace: default
spec:
  server:
    name: order-service-server
  client:
    meshTLS:
      serviceAccounts:
      - name: frontend
```

Istio equivalent:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: order-service-authz
  namespace: default
spec:
  selector:
    matchLabels:
      app: order-service
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - cluster.local/ns/default/sa/frontend
    to:
    - operation:
        ports:
        - "8080"
```

## Step 5: Migrate a Namespace

Pick a low-risk namespace to migrate first. Here's the process:

```bash
# 1. Remove Linkerd injection annotation
kubectl annotate namespace test-namespace linkerd.io/inject-

# 2. Add Istio injection label
kubectl label namespace test-namespace istio-injection=enabled

# 3. Restart all deployments to swap sidecars
kubectl rollout restart deployment -n test-namespace

# 4. Wait for rollout
kubectl rollout status deployment --all -n test-namespace

# 5. Verify pods have Istio sidecars (2/2 containers)
kubectl get pods -n test-namespace
```

After the restart, pods will have the Envoy sidecar instead of the Linkerd proxy.

## Step 6: Verify Cross-Mesh Communication

During migration, some namespaces are on Linkerd and some on Istio. Verify they can still talk to each other:

```bash
# From an Istio-meshed pod, call a Linkerd-meshed service
kubectl exec -it deploy/frontend -n istio-namespace -- \
  curl http://order-service.linkerd-namespace:8080/health

# Check for mTLS issues
istioctl proxy-config cluster deploy/frontend -n istio-namespace | grep order-service
```

Since both meshes are in PERMISSIVE mode, the Istio sidecar will send plaintext to Linkerd services, and vice versa. This works but means traffic between meshes is unencrypted during the transition period. Keep this window as short as practical.

## Step 7: Replace Linkerd Observability

Linkerd comes with linkerd-viz for dashboards and metrics. Replace it with Istio's observability tools:

```bash
# Install Kiali for service mesh visualization
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/kiali.yaml

# Install Prometheus for metrics
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/prometheus.yaml

# Install Grafana for dashboards
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/grafana.yaml
```

Linkerd's `tap` command (for real-time traffic inspection) maps to:

```bash
# See real-time proxy logs
kubectl logs deploy/order-service -c istio-proxy -n default -f

# Inspect proxy configuration
istioctl proxy-config route deploy/order-service -n default
istioctl proxy-config cluster deploy/order-service -n default
istioctl proxy-config listener deploy/order-service -n default
```

## Step 8: Complete Migration and Lock Down

After all namespaces are migrated, switch Istio to STRICT mTLS:

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
```

Then remove Linkerd:

```bash
# Remove Linkerd extensions
linkerd viz uninstall | kubectl delete -f -

# Remove Linkerd control plane
linkerd uninstall | kubectl delete -f -

# Remove Linkerd CRDs
kubectl get crd | grep linkerd | awk '{print $1}' | xargs kubectl delete crd
```

## Rollback Plan

If something goes wrong during migration, you can roll back a namespace:

```bash
# Remove Istio injection
kubectl label namespace problem-namespace istio-injection-

# Re-add Linkerd injection
kubectl annotate namespace problem-namespace linkerd.io/inject=enabled

# Restart deployments
kubectl rollout restart deployment -n problem-namespace
```

Keep Linkerd installed until you're fully confident in the Istio setup. Only uninstall it after all namespaces have been successfully running on Istio for a reasonable period.

The migration from Linkerd to Istio requires careful planning because you're swapping the data plane proxy on every pod. The namespace-by-namespace approach limits risk, and running both meshes in PERMISSIVE mode ensures cross-mesh communication works during the transition. Take your time, test thoroughly, and don't rush the final cleanup.
