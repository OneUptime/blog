# Why Argo Rollouts `setWeight` Does Not Match Real Traffic—and How to Fix It

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Rollouts, Kubernetes, Canary Deployment, setWeight, Traffic Routing, Istio, NGINX Ingress, AWS ALB

Description: Diagnose why an Argo Rollouts setWeight step differs from observed traffic by checking replica approximation, router state, Service endpoints, connection behavior, and metrics.

---

An Argo Rollouts step such as `setWeight: 10` expresses desired canary exposure. With the default `maxTrafficWeight` of 100, that means 10%. What enforces that intent depends on the Rollout strategy:

- without `trafficRouting`, Argo approximates 10% by changing stable and canary **replica counts**;
- with a router, Argo writes a weight into an Istio, NGINX, ALB, Gateway API, or other supported routing resource.

Neither path guarantees that the configured fraction of requests in every short measurement window reaches canary exactly. Replica granularity, persistent connections, sticky sessions, route mismatches, stale endpoints, controller conflicts, and flawed telemetry can all produce a different observed ratio.

The fastest diagnosis is to trace the desired weight through four layers:

```text
Rollout step -> managed router object -> stable/canary endpoints -> observed requests
```

Do not skip directly from the Rollout YAML to an application dashboard.

## Step 1: Determine Whether a Traffic Router Is Configured

Inspect the effective strategy:

```bash
NS=shop
ROLLOUT=checkout

kubectl get rollout "$ROLLOUT" -n "$NS" -o json \
  | jq '.spec.strategy.canary'
kubectl argo rollouts get rollout "$ROLLOUT" -n "$NS"
```

If `.spec.strategy.canary.trafficRouting` is absent, `setWeight` is replica based. If it names `istio`, `nginx`, `alb`, or a plugin, the corresponding routing object must be inspected.

Also confirm the Rollout reached the expected step. A pause, failed AnalysisRun, degraded ReplicaSet, progress deadline, or controller error can leave it at an earlier weight:

```bash
kubectl get rollout "$ROLLOUT" -n "$NS" -o json \
  | jq '{
      generation: .metadata.generation,
      observedGeneration: .status.observedGeneration,
      phase: .status.phase,
      message: .status.message,
      currentStepIndex: .status.currentStepIndex,
      pauseConditions: .status.pauseConditions,
      conditions: .status.conditions
    }'
```

Only rely on `status.phase` and `status.message` when `observedGeneration` equals `generation`; otherwise, the controller has not reported status for the latest Rollout spec.

The plugin's tree view is usually the clearest human-readable display of stable and canary ReplicaSets, step state, and analyses.

## Case A: No Traffic Router—The Weight Is a Pod Ratio

Argo's canary documentation calls this a best-effort approximation. With ten replicas, 10% can be one canary Pod and nine stable Pods. With four replicas, the useful whole-Pod increments are roughly 25 percentage points. The controller chooses the closest achievable ratio while considering surge and availability; the documented 10-replica example maps 41% to four canary Pods because 4/10 is closer than 5/10.

Inspect actual ReplicaSet counts:

```bash
kubectl get replicasets -n "$NS" \
  -l app=checkout \
  -o custom-columns='NAME:.metadata.name,DESIRED:.spec.replicas,READY:.status.readyReplicas,HASH:.metadata.labels.rollouts-pod-template-hash'

kubectl get pods -n "$NS" -l app=checkout \
  -L rollouts-pod-template-hash
```

Then inspect the shared production Service and its Ready endpoints:

```bash
kubectl get service checkout -n "$NS" -o yaml
kubectl get endpointslice -n "$NS" \
  -l kubernetes.io/service-name=checkout \
  -o json \
  | jq '[.items[].endpoints[] | {
      ready: .conditions.ready,
      addresses,
      targetRef: .targetRef.name
    }]'
```

Common fixes are:

- increase `spec.replicas` so the requested percentage is representable;
- make the Service select both revisions through stable application labels, not a fixed hash;
- fix readiness so only serving Pods are eligible for normal Service traffic, and check `publishNotReadyAddresses` if unready Pods appear Ready;
- remove `sessionAffinity: ClientIP` if stickiness is unintended;
- use an integrated traffic router when precise low percentages matter.

Even a correct 1:9 endpoint ratio can produce a skewed request ratio. kube-proxy and upstream proxies distribute connections, while HTTP keep-alive, HTTP/2, and gRPC can carry many requests over one previously selected connection. Measure many independent connections over a representative interval, and measure at the backend revision—not only at the client or edge.

## Case B: Traffic Routing Is Configured

With host-level traffic management, stable and canary Services normally select their respective ReplicaSets, and a router enforces the requested weight. Istio subset-level splitting is an exception: one Service selects the Rollout Pods, while DestinationRule subset labels separate stable and canary revisions. Validate these as two independent claims:

1. Did Argo write the expected router configuration?
2. Did the router's data plane converge and send traffic to the expected endpoints?

For host-level routing, start with the Services:

```bash
kubectl get service checkout-stable checkout-canary -n "$NS" -o yaml
kubectl get endpointslice -n "$NS" \
  -l kubernetes.io/service-name=checkout-stable
kubectl get endpointslice -n "$NS" \
  -l kubernetes.io/service-name=checkout-canary
```

Argo modifies the Service selectors to include the current stable or canary `rollouts-pod-template-hash`. Each Service must have Ready endpoints from only the intended revision. A perfect router weight applied to an empty or wrong Service still gives incorrect results.

Do not permanently hand-edit those hash selectors. Find why the Rollouts controller could not reconcile them, such as RBAC denial, another controller overwriting the Service, a selector/template mismatch, or an unhealthy ReplicaSet.

## Istio: Inspect the Exact Managed Route

For host-level splitting, Argo continuously updates the referenced route in the named `VirtualService` so its stable and canary destination weights reflect the desired step. Istio requires the route weights to total 100.

```bash
kubectl get virtualservice checkout -n "$NS" -o yaml
kubectl get rollout "$ROLLOUT" -n "$NS" -o json \
  | jq '.spec.strategy.canary.trafficRouting.istio'
```

Check:

- the `virtualService.name`, or each entry in `virtualServices`, is correct, including `.namespace` when it is cross-namespace;
- `routes`, `tlsRoutes`, and `tcpRoutes` identify the intended routes: `routes` lists HTTP route names, while TLS and TCP selectors match ports and, for TLS, SNI hosts;
- for host-level splitting, destination hosts match `stableService` and `canaryService`, adding the Service namespace to the host when required for a cross-namespace VirtualService;
- for subset-level splitting, DestinationRule subset names and injected hash labels match the Rollout;
- the external and internal traffic paths actually use this VirtualService and gateway;
- every additional route, gateway, or VirtualService that serves the same host is intentionally managed.

A Rollout can correctly update one route while real users match a higher-precedence route or a different gateway. Trace the request's host, port, SNI, URI, and headers through Istio matching rules.

GitOps is another frequent conflict. Argo's Istio documentation explains that reapplying a Git value of stable 100/canary 0 momentarily resets live weights; Rollouts watches the VirtualService and writes the step weight back, producing flapping. Configure the GitOps controller to ignore Rollout-managed route weight fields and respect that ignore during apply, following the documented Argo CD pattern.

## NGINX: Inspect the Generated Canary Ingress

For the NGINX Ingress Controller, Argo uses a stable Ingress plus a canary Ingress. It sets the configured annotation prefix equivalents of:

```yaml
nginx.ingress.kubernetes.io/canary: "true"
nginx.ingress.kubernetes.io/canary-weight: "10"
```

List and inspect every Ingress for the host:

```bash
kubectl get ingress -n "$NS" -o wide
kubectl get ingress -n "$NS" -o yaml \
  | grep -E 'name:|host:|ingressClassName:|canary|canary-weight'
```

Check that:

- the Rollout references the intended stable Ingress;
- `spec.ingressClassName` or legacy ingress-class annotation selects the NGINX controller Argo expects;
- stable and canary Ingresses use the same host and compatible paths;
- no other ingress controller is also processing the resources;
- header/cookie canary annotations are not intentionally overriding weight behavior;
- the NGINX controller accepted and reloaded the generated configuration.

Argo's NGINX integration supports `trafficRouting.maxTrafficWeight` when a denominator other than 100 is needed. Rollouts then sets the matching `canary-weight-total` annotation, and the effective fraction is `setWeight / maxTrafficWeight`. Make sure dashboard calculations use the same denominator and that additional annotations do not encode a different routing policy.

## AWS ALB: An Annotation Is Not the Final Data Plane

For AWS ALB, the Rollouts controller updates an Ingress action annotation under `alb.ingress.kubernetes.io/actions.<service-name>`. The AWS Load Balancer Controller translates it into listener rules and weighted target groups.

Inspect:

```bash
kubectl get ingress checkout -n "$NS" -o yaml
kubectl describe ingress checkout -n "$NS"
```

Then compare the Kubernetes annotation with the actual ALB listener action and target-group health in AWS. Reconciliation can be delayed by AWS API throttling, controller downtime, invalid annotations, unhealthy targets, or missing permissions.

Argo Rollouts provides optional target-group IP verification for ALBs using IP target mode and weight verification for both IP and instance modes. With `--aws-verify-target-group` and the required AWS region/permissions, Rollouts queries AWS to verify the applicable Pod-IP membership and configured weight rather than assuming the Ingress update reached the ALB. Enable and test this feature when stale ALB state would make promotion unsafe.

ALB target-group stickiness is also explicit Rollout configuration:

```yaml
trafficRouting:
  alb:
    ingress: checkout
    servicePort: 80
    stickinessConfig:
      enabled: true
      durationSeconds: 3600
```

Stickiness can make per-user or short-window observations differ substantially from the configured target-group weights. Decide whether that is required application behavior and design analysis windows accordingly.

## Gateway API and Other Plugins: Verify the Plugin Contract

Traffic-router plugins translate Rollout intent into provider-specific resources. Check:

- plugin name and configuration in the Rollout and controller ConfigMap;
- plugin process/download health and controller logs;
- supported Gateway API kinds and versions for the installed plugin release;
- the exact `HTTPRoute` or other resource weights after the step;
- `status.parents[].conditions` for the current generation showing `Accepted=True`, `ResolvedRefs=True`, and, when reported, `Programmed=True`;
- data-plane rollout and endpoint health.

Do not assume that installing Gateway API CRDs installs the Argo traffic-router plugin, or that every Gateway implementation supports the same filters and weight semantics.

## Check for Scale/Traffic Mismatch

With a router, traffic weight and canary replica scale can be controlled independently using `setCanaryScale`. That is powerful and dangerous:

```yaml
steps:
  - setCanaryScale:
      weight: 10
  - setWeight: 90
  - pause: {}
```

Argo's canary documentation warns that this example can send 90% of traffic to only 10% of the Pods. After an explicit canary scale, subsequent `setWeight` steps do not automatically restore matching scale until this is set:

```yaml
- setCanaryScale:
    matchTrafficWeight: true
```

Check the canary ReplicaSet's Ready count and per-Pod saturation. If traffic is correctly weighted but the small canary pool is overloaded, retries and errors can distort request-count metrics and make the release appear to receive the wrong share.

## Validate the Measurement Itself

Calculate the ratio from the same event population:

```text
canary requests / (canary requests + stable requests)
```

Both terms must use the same time range, ingress/cluster, route, status-code policy, retry policy, and request unit. Frequent telemetry mistakes include:

- comparing canary application requests with stable edge requests;
- grouping by a mutable `latest` image tag instead of ReplicaSet hash or version;
- counting health checks on one backend but not the other;
- mixing external and internal traffic when only one route is weighted;
- counting retries as new requests;
- using a window shorter than connection lifetimes or configuration propagation;
- querying rate metrics with too little traffic for statistical stability.

Expose a bounded release label at the application or proxy and cross-check at two points, such as ingress and application. Ensure the value identifies the actual Pod revision.

## A Reliable Fix Sequence

1. Confirm the current Rollout step and whether routing is basic or provider-managed.
2. For basic canary, compare desired weight with achievable Ready-Pod ratios.
3. For routed canary, inspect the exact live VirtualService, Ingress, ALB action, or Gateway route.
4. Verify stable and canary Service selectors and EndpointSlices, or the shared Service and DestinationRule subsets for Istio subset-level routing.
5. Check controller logs and RBAC for reconciliation failures.
6. Remove GitOps ownership conflicts on fields Rollouts must mutate.
7. Inspect router/controller acceptance and propagation, not only Kubernetes desired state.
8. Check stickiness, long-lived connections, topology, and canary capacity.
9. Recalculate the ratio from consistent revision-labeled telemetry.
10. Hold or abort the Rollout until configuration and observed traffic agree within a justified tolerance.

`setWeight` is a desired-state instruction, not a packet counter. The fix is to find which layer stopped representing that intent accurately.

## Official Documentation

- [Argo Rollouts: Canary strategy](https://argo-rollouts.readthedocs.io/en/stable/features/canary/)
- [Argo Rollouts: Traffic management overview](https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/)
- [Argo Rollouts: Istio traffic routing](https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/istio/)
- [Argo Rollouts: NGINX traffic routing](https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/nginx/)
- [Argo Rollouts: AWS ALB traffic routing](https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/alb/)
- [Argo Rollouts: Traffic-routing plugins](https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/plugins/)
- [Argo Rollouts: Rollout specification](https://argo-rollouts.readthedocs.io/en/stable/features/specification/)
- [Kubernetes: Services](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Kubernetes: EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
