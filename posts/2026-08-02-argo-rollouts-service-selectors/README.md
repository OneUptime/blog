# Argo Rollouts Service Selectors Explained: Stable, Canary, Active, and Preview Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Rollouts, Kubernetes, Services, Selectors, Canary Deployment, Blue-Green Deployment, ReplicaSets, Traffic Routing

Description: Understand how Argo Rollouts rewrites stable, canary, active, and preview Service selectors with ReplicaSet hashes, and troubleshoot endpoints safely.

---

Argo Rollouts does not send traffic directly. It creates ReplicaSets and updates Kubernetes Service selectors so each named Service resolves to the correct revision. For the standard strategies:

- a traffic-routed **canary** uses `stableService` for the promoted revision and `canaryService` for the newest revision under evaluation;
- **blue-green** uses `activeService` for production and an optional `previewService` for the newest revision before promotion.

The names are not magic. A Service becomes “stable” or “preview” because the Rollout references its metadata name. Argo then adds or changes the dynamic `rollouts-pod-template-hash` selector so the Service targets one owned ReplicaSet rather than every Pod with the application's base label.

Understanding that mutation explains most Rollouts routing incidents.

## Base Selectors and Revision Selectors

Start with a Rollout whose base identity is `app: checkout`:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: checkout
  namespace: shop
spec:
  replicas: 6
  selector:
    matchLabels:
      app: checkout
  template:
    metadata:
      labels:
        app: checkout
    spec:
      containers:
        - name: checkout
          image: registry.example.com/shop/checkout:2.5.0
          ports:
            - name: http
              containerPort: 8080
```

Every ReplicaSet and Pod for this Rollout has the common `app: checkout` label. Argo also labels each revision with a unique hash, conceptually:

```yaml
labels:
  app: checkout
  rollouts-pod-template-hash: 7bf84f9696
```

Services begin with the common selector:

```yaml
spec:
  selector:
    app: checkout
```

Once referenced by a strategy, Argo changes the effective selector to include a revision:

```yaml
spec:
  selector:
    app: checkout
    rollouts-pod-template-hash: 7bf84f9696
```

Kubernetes selector entries use AND semantics, so an endpoint must have both labels. This preserves tenant/application scoping while narrowing the Service to one Rollout revision.

Do not calculate, copy, or pin this hash yourself. It is generated from the Pod template and changes when a new ReplicaSet is created.

## Canary: Stable Service and Canary Service

Fine-grained canary traffic routing uses two Services:

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

Reference them in the Rollout:

```yaml
spec:
  strategy:
    canary:
      stableService: checkout-stable
      canaryService: checkout-canary
      trafficRouting:
        istio:
          virtualService:
            name: checkout
            routes:
              - primary
      steps:
        - setWeight: 5
        - pause:
            duration: 10m
        - setWeight: 25
        - pause: {}
```

During an update:

- `checkout-stable` selects the ReplicaSet recorded as stable;
- `checkout-canary` selects the latest ReplicaSet being evaluated;
- the traffic router sends the desired percentage to each Service.

Argo's Istio documentation describes the controller continuously updating both selectors with their corresponding hashes. The same stable/canary destination concept underpins NGINX, ALB, and other traffic integrations, though each provider controls weights differently.

At promotion, the latest ReplicaSet becomes stable and Argo switches the stable Service selector to it. `scaleDownDelaySeconds` gives the router or cluster network time to observe that switch before the old stable ReplicaSet is scaled down.

### Basic canary is different

When `trafficRouting` is omitted, stable and canary Services are not required. A basic canary normally uses one shared Service whose base selector matches Ready Pods from both old and new ReplicaSets. Argo approximates `setWeight` by replica count.

Do not copy a traffic-routed Service design into a basic canary without understanding the result. If the only production Service is narrowed to the stable hash and no router ever sends traffic to a canary Service, changing canary replica counts will not expose the canary at all.

## Blue-Green: Active Service and Preview Service

Blue-green always requires an active Service and optionally uses a preview Service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: checkout-active
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
  name: checkout-preview
  namespace: shop
spec:
  selector:
    app: checkout
  ports:
    - name: http
      port: 80
      targetPort: http
```

```yaml
spec:
  strategy:
    blueGreen:
      activeService: checkout-active
      previewService: checkout-preview
      autoPromotionEnabled: false
      previewReplicaCount: 2
      scaleDownDelaySeconds: 60
```

The documented selector sequence is precise:

1. At steady state, active and preview Services both point to the current promoted ReplicaSet.
2. A Pod-template change creates a new ReplicaSet.
3. Argo changes the preview Service selector to the new hash; active remains on the old hash.
4. Argo scales and waits for the preview ReplicaSet to become available.
5. Pre-promotion analysis and/or a manual pause can test the preview Service.
6. On promotion, Argo changes the active Service selector to the new hash.
7. The preview Service also points to that newest revision.
8. After the scale-down delay and applicable analysis, the old ReplicaSet scales down.

The preview Service always follows the newest ReplicaSet. If a third Pod-template change arrives before the current preview is promoted, Argo switches preview to that newest revision. Test automation should therefore identify the expected hash or image, not assume a preview hostname remains attached to an older candidate.

`previewReplicaCount` reduces pre-promotion resource use, but the new ReplicaSet is scaled to full `spec.replicas` before Argo switches the active Service. This avoids directing full production traffic at an intentionally undersized preview stack.

## Inspect Selectors, ReplicaSets, and Endpoints Together

Use one view for strategy references:

```bash
NS=shop
ROLLOUT=checkout

kubectl get rollout "$ROLLOUT" -n "$NS" -o json \
  | jq '{
      canary: .spec.strategy.canary,
      blueGreen: .spec.strategy.blueGreen,
      status: {
        stableRS: .status.stableRS,
        currentPodHash: .status.currentPodHash
      }
    }'
```

Then compare every Service selector:

```bash
kubectl get service -n "$NS" \
  checkout-stable checkout-canary checkout-active checkout-preview \
  -o json \
  | jq -r '.items[] | [.metadata.name, (.spec.selector | tojson)] | @tsv'
```

Only query the Service names used by the strategy; the four-name command is illustrative across both strategies.

Map hashes to ReplicaSets and Pods:

```bash
kubectl get replicasets -n "$NS" -l app=checkout \
  -o custom-columns='NAME:.metadata.name,HASH:.metadata.labels.rollouts-pod-template-hash,DESIRED:.spec.replicas,READY:.status.readyReplicas,IMAGE:.spec.template.spec.containers[0].image'

kubectl get pods -n "$NS" -l app=checkout \
  -L rollouts-pod-template-hash
```

Finally, inspect the objects Kubernetes actually uses for Service backends:

```bash
kubectl get endpointslice -n "$NS" \
  -l kubernetes.io/service-name=checkout-stable -o yaml
```

A correct selector with no Ready endpoints indicates a Pod readiness or port problem, not necessarily a Rollouts selector bug.

## Endpoint Readiness and Port Mapping Still Apply

A selector match only makes a Pod eligible. EndpointSlice readiness normally reflects Pod readiness, and the Service `targetPort` must resolve to the container port.

```yaml
ports:
  - name: http
    port: 80
    targetPort: http
```

If the Pod's named port is `web` instead of `http`, the Service will not behave as intended. If the readiness probe never succeeds, the Service can have the correct hash selector but no Ready backends.

Use:

```bash
kubectl describe service checkout-canary -n "$NS"
kubectl get endpointslice -n "$NS" \
  -l kubernetes.io/service-name=checkout-canary -o yaml
kubectl describe pod -n "$NS" <canary-pod>
```

## GitOps Must Not Fight Dynamic Hashes

Keep the stable base selector in source control:

```yaml
selector:
  app: checkout
```

The live object will also have the controller-managed hash. A GitOps engine that continually replaces the entire selector with the Git version can briefly broaden a stable Service to all revisions or remove the canary's revision pin. Configure field ownership or ignored differences for the dynamic hash field according to the GitOps product's official guidance.

Do not ignore the entire Service. Ports, type, annotations, IP-family policy, and base selectors should remain governed. Delegate only the exact field Argo must mutate.

Similarly, do not run a script that copies the current hash back into Git after every release. That makes Git stale at the next Pod-template change and turns a controller output into an input.

## Promotion Has a Propagation Window

Changing a Service selector updates EndpointSlices and then the network or external router. Argo's blue-green documentation explains that nodes can temporarily retain old iptables state; this is why `scaleDownDelaySeconds` defaults to a delay rather than immediately killing the old ReplicaSet.

Traffic providers have their own propagation paths:

- NGINX must rebuild/reload the canary ingress configuration;
- Istio must distribute updated VirtualService/endpoint state to proxies;
- AWS Load Balancer Controller must update target groups, which may require AWS API calls and health checks;
- Gateway controllers must accept the Route and program their data plane.

Choose a delay from measured worst-case convergence, not from how quickly `kubectl get service` shows the new selector. Argo's optional ALB target-group verification can block progression until actual target state matches, which is stronger evidence than a fixed sleep alone.

## Abort Behavior

For canary, an abort returns routed traffic to the stable ReplicaSet and scales down or retains the candidate according to strategy state and delay settings. The stable Service should continue selecting the previously promoted hash.

For blue-green before promotion, active remains on the old stable hash. If post-promotion analysis fails or errors, Argo switches active traffic back to the previous stable ReplicaSet. Retaining that old ReplicaSet through the post-promotion window is what makes the selector reversal possible quickly.

Always test abort while watching Services and EndpointSlices:

```bash
kubectl argo rollouts abort checkout -n "$NS"
kubectl get service,endpointslice -n "$NS" -w
```

## Ping-Pong Is an Intentional Exception

Current Rollout specification also documents canary `pingPong` for ALB, Istio, and plugin-based routers. Instead of changing stable/canary Service selectors at promotion, two persistent Services alternate roles. Rollout status records which is currently stable.

This exists to avoid selector swaps for long-lived TCP/gRPC connections and scenarios such as ALB Pod readiness-gate injection. When `pingPong` is configured, ordinary `stableService` and `canaryService` are not required. Operational tooling must read Rollout status rather than infer role permanently from a Service name.

## Common Selector Failures

### Stable and canary both receive every revision

The hash was removed or a different, unreferenced Service is carrying traffic. Check GitOps/controller conflicts and the router's real destinations.

### Canary Service has no endpoints

The candidate has zero replicas, is not Ready, uses mismatched base labels, or the Service port is wrong. With `setWeight: 0`, use `setCanaryScale` if header testing still needs canary Pods.

### Active switched, but clients still hit old Pods

The data plane has not converged, clients have persistent connections, or an external target group still contains old targets. Preserve the old ReplicaSet for a sufficient scale-down delay and use provider verification where available.

### Preview exposes production data unexpectedly

Preview is a real Service. Limit its routing, network access, authorization, and credentials. “Not active” does not mean unreachable.

### Manual selector fix keeps reverting

The controller is reconciling declared strategy intent. Repair the Rollout reference, labels, RBAC, or readiness condition rather than fighting the managed hash.

## Official Documentation

- [Argo Rollouts: Canary strategy](https://argo-rollouts.readthedocs.io/en/stable/features/canary/)
- [Argo Rollouts: Blue-green strategy](https://argo-rollouts.readthedocs.io/en/stable/features/bluegreen/)
- [Argo Rollouts: Traffic management overview](https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/)
- [Argo Rollouts: Istio Service selector behavior](https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/istio/)
- [Argo Rollouts: AWS ALB and ping-pong](https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/alb/)
- [Argo Rollouts: Rollout specification](https://argo-rollouts.readthedocs.io/en/stable/features/specification/)
- [Kubernetes: Services and selectors](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Kubernetes: EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
