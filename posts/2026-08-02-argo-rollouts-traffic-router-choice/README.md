# NGINX, ALB, Istio, or Gateway API: Choosing an Argo Rollouts Traffic Router

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Rollouts, Kubernetes, NGINX Ingress, AWS ALB, Istio, Gateway API, Canary Deployment, Traffic Routing

Description: Choose an Argo Rollouts traffic router by comparing traffic scope, operational ownership, canary features, verification, portability, and current support maturity.

---

The best Argo Rollouts traffic router is usually the data plane your platform already operates and observes—not the provider with the longest feature list. The four common choices solve different problems:

- **NGINX Ingress** is an annotation-driven, ingress-only integration, but the Kubernetes community Ingress NGINX project was retired in March 2026 and should not be a new platform choice.
- **AWS ALB** is a strong fit for EKS applications whose production traffic already enters through AWS Application Load Balancers.
- **Istio** covers mesh and gateway traffic and has Argo's richest managed routing features, at the cost of operating a service mesh.
- **Gateway API** provides a vendor-neutral Kubernetes routing model, but Argo uses a traffic-router plugin, and Argo's plugin mechanism is documented as alpha.

Start with where the traffic flows, who owns the data plane, and which failure you need Argo to detect.

## Comparison at a Glance

| Question | NGINX Ingress | AWS ALB | Istio | Gateway API plugin |
| --- | --- | --- | --- | --- |
| Primary scope | North-south HTTP(S) Ingress | North-south AWS ALB HTTP(S) | North-south gateways and east-west mesh traffic | Depends on Gateway implementation and Route kind |
| Argo integration | Built in | Built in | Built in | Plugin |
| Weight mechanism | Canary Ingress annotations | Weighted ALB target groups via Ingress action | VirtualService destination weights | Route backend weights managed by plugin |
| Stable/canary Services | Required | Required | Required for host-level splitting; subset mode uses DestinationRule design | Expected by Rollouts traffic management/plugin design |
| Header/mirror managed steps | Provider annotations can add NGINX header/cookie behavior; not Argo's generic managed-route feature | Not the core managed-route path | Argo `setHeaderRoute` and `setMirrorRoute` support | Core project table currently lists weight only |
| Provider convergence check | Inspect NGINX controller/config/data plane | Optional AWS target-group IP and weight verification | Inspect Istio config and Envoy proxies | Inspect Route status and implementation data plane |
| Portability | NGINX annotation semantics | AWS-specific | Istio-specific CRDs/data plane | API portable in principle; implementation capabilities vary |
| Main operational cost | Ingress controller fleet and annotation behavior | AWS controller, IAM, ALB cost/limits | Istiod, proxies/ambient data plane, mesh policy | Plugin lifecycle plus chosen Gateway controller |

“Supports weighted routing” is only the first gate. Protocols, internal traffic, stickiness, cross-cluster topology, Route status, and failure verification determine whether a provider is safe for a particular release.

## First Decide Whether You Need a Router

Without `trafficRouting`, Argo uses normal Kubernetes Service balancing and approximates `setWeight` through stable/canary replica counts. That may be enough when:

- the workload has many replicas;
- coarse percentages are acceptable;
- traffic consists of many independent connections;
- header cohorts and mirroring are unnecessary.

A router becomes important when the blast radius must be independent of replica count, the canary has few replicas, clients use sticky or long-lived connections, or the rollout requires application-layer matches.

With any traffic provider, Argo normally keeps distinct stable and canary Services and changes their selectors to target the appropriate ReplicaSet hashes. The router controls the split between those destinations. Validate both router configuration and Service EndpointSlices during every rollout.

## NGINX Ingress: Existing Integration, Retired Community Controller

Argo's built-in NGINX integration references a stable Ingress and creates a canary Ingress. The generated object points to the canary Service and carries annotations equivalent to:

```yaml
nginx.ingress.kubernetes.io/canary: "true"
nginx.ingress.kubernetes.io/canary-weight: "5"
```

A Rollout fragment looks like this:

```yaml
strategy:
  canary:
    stableService: checkout-stable
    canaryService: checkout-canary
    trafficRouting:
      nginx:
        stableIngress: checkout
    steps:
      - setWeight: 5
      - pause:
          duration: 10m
```

This remains mechanically simple and can achieve a 5% edge split with only a few application Pods. Argo supports custom annotation prefixes, additional canary annotations, custom ingress-class names, and multiple stable Ingresses for cases such as separate external and internal ingress controllers.

However, “NGINX” is ambiguous. Argo's documented integration depends on the canary annotation behavior associated with the referenced NGINX Ingress Controller; it does not automatically work with every product that uses NGINX. Verify the exact controller, annotations, ingress class, and support contract.

Most importantly, Kubernetes SIG Network and the Security Response Committee retired the community `kubernetes/ingress-nginx` project in March 2026. Existing deployments continue running, but there are no further releases, bug fixes, or security updates. Kubernetes recommends migrating to Gateway API or another maintained ingress controller.

Therefore:

- do not choose community Ingress NGINX for a new 2026 platform;
- if it is already in use, treat the Argo integration as an interim capability while executing a migration;
- do not assume a commercial or alternative NGINX controller implements identical canary annotations—test its documented Argo compatibility.

## AWS ALB: Best When AWS Is Already the Edge

The AWS Load Balancer Controller translates Ingress annotations into ALB listener rules and target groups. Argo updates the `alb.ingress.kubernetes.io/actions.<service-name>` action so AWS forwards weighted traffic to stable and canary target groups.

```yaml
strategy:
  canary:
    stableService: checkout-stable
    canaryService: checkout-canary
    trafficRouting:
      alb:
        ingress: checkout
        servicePort: 80
    steps:
      - setWeight: 5
      - pause:
          duration: 10m
```

ALB is a good choice when:

- the application is on AWS and already uses the AWS Load Balancer Controller;
- canary scope is edge HTTP(S) traffic;
- AWS target groups, WAF, certificates, logging, and alarms are already operational standards;
- teams prefer a managed load balancer over a cluster ingress proxy fleet.

Its distinctive safety feature is target-group verification. Argo can optionally query AWS to verify that target IPs and weights in the underlying ALB match the desired Ingress annotation. This catches cases where AWS throttling, controller downtime, or reconciliation delay means Kubernetes desired state has not reached the actual load balancer. It requires the controller flag, AWS region, IAM permission, and network access documented by Argo.

Tradeoffs include AWS coupling, ALB provisioning and rule quotas, cost, IAM complexity, controller-to-AWS propagation latency, and target health behavior. Target-group stickiness is supported, but it can make short-window or per-user traffic observations differ from configured weights.

ALB does not automatically solve east-west traffic. If internal service-to-service calls bypass the ALB, they bypass its canary weighting too.

## Istio: Richest Control Across Edge and Mesh

Argo's native Istio integration changes `VirtualService` weights and either:

- modifies two Service selectors for host-level stable/canary splitting; or
- injects stable/canary hash labels into `DestinationRule` subsets for subset-level splitting.

```yaml
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
```

Istio is the strongest choice when:

- both external gateway and internal mesh calls must follow the rollout;
- header-based cohorts or request mirroring are required through Argo's managed routes;
- traffic policy, mTLS, authorization, retries, and telemetry are already standardized on Istio;
- the organization can operate and upgrade the mesh control and data planes.

Argo's generic `managedRoutes`, `setHeaderRoute`, and `setMirrorRoute` documentation currently identifies Istio support. Host-level splitting gives clear stable/canary Service metrics, while subset-level splitting is often cleaner for internal clients using one Service hostname.

The costs are significant: sidecar or ambient enrollment, Istiod capacity, proxy configuration propagation, mesh upgrades, policy interactions, and a larger debugging surface. Argo warns that Pods excluded from the mesh follow default Kubernetes routing. An Istio canary is incomplete if material traffic paths bypass Envoy.

Use Istio because a mesh is already justified by broader networking requirements, not solely to add percentage weights to one public route.

## Gateway API: Strategic API, Alpha Argo Plugin Path

Gateway API separates infrastructure ownership (`GatewayClass` and `Gateway`) from application routing (`HTTPRoute`, `GRPCRoute`, and related types). Weighted HTTP backends are expressed directly:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: checkout
  namespace: shop
spec:
  parentRefs:
    - name: public
      namespace: gateways
  rules:
    - backendRefs:
        - name: checkout-stable
          port: 80
          weight: 100
        - name: checkout-canary
          port: 80
          weight: 0
```

Gateway API is appealing when:

- the platform is moving away from annotation-heavy Ingress;
- a supported Gateway implementation is already operated;
- routing ownership needs Kubernetes-native role separation;
- avoiding a provider-specific application API is a strategic goal.

But distinguish API maturity from integration maturity. Argo's traffic-router plugin system is documented as experimental alpha, and the core Argo Rollouts feature table currently lists Gateway API weight support while not listing managed header, mirror, or Experiment weighting support. The plugin is another executable in the Rollouts controller lifecycle: pin its version and checksum, secure its distribution, verify architecture compatibility, and test controller startup if the artifact source is unavailable.

Gateway API conformance is feature-specific. A Route that is syntactically portable may behave differently or lack filters in a particular implementation. Before selecting it, verify:

- the exact Gateway controller and supported Gateway API version/channel;
- plugin compatibility with that controller and Route kind;
- `status.parents[].conditions` acceptance and resolved references;
- weighted routing, cross-namespace `ReferenceGrant`, TLS, and protocol behavior;
- rollout abort, controller restart, and config-propagation behavior.

Gateway API is often the best greenfield direction, especially after Ingress NGINX retirement, but production adoption should follow an implementation-specific conformance and failure test—not an assumption that the standard makes every data plane identical.

## Choose by Traffic Scope

Map every request path before choosing:

| Traffic path | Natural option |
| --- | --- |
| Public HTTP(S) on EKS through existing ALB | ALB |
| Public HTTP(S) through an existing maintained NGINX-compatible controller | NGINX integration, after exact compatibility verification |
| Public plus internal mesh calls | Istio |
| Platform-standard Gateway with proven plugin/controller support | Gateway API |
| Internal callers that bypass every router | Basic replica weighting or redesign the path |

If external traffic enters ALB while internal traffic uses Istio, Argo supports multiple traffic providers. That can keep both desired weights in one Rollout, but the changes are not magically atomic across AWS and Istio. Measure propagation, define which path gates promotion, and verify both before scaling down stable.

## Choose by Failure Verification

Ask what “weight applied” means operationally:

- **NGINX:** the generated canary Ingress exists, the controller accepted/reloaded it, and requests reach correct EndpointSlices.
- **ALB:** the Ingress action changed, AWS listener/target-group state converged, and targets are healthy; optional Argo verification can enforce this.
- **Istio:** VirtualService/DestinationRule desired state changed, Istiod accepted it, relevant Envoy proxies received it, and all important callers are meshed.
- **Gateway API:** backend weights changed, the Route is `Accepted` with references resolved, and the chosen Gateway data plane programmed it.

Build rollout analysis from provider and application signals. A router object with the right YAML is not proof that real traffic shifted.

## Choose by Feature, Then Prove the Exact Version

Create a versioned capability matrix for the releases you operate:

- raw weighted traffic;
- header/cookie cohorts;
- mirroring;
- HTTP, HTTP/2, gRPC, TCP, and TLS behavior;
- sticky sessions;
- multiple routes or ingress points;
- dynamic canary scale;
- Experiment routing;
- data-plane verification;
- multi-cluster behavior.

Do not generalize one provider's feature from another. For example, NGINX-specific header annotations are not the same lifecycle as Argo's Istio `setHeaderRoute`, and Gateway API itself supporting a filter does not mean the current Argo plugin manages that filter.

## Recommended Decision Process

1. Inventory public, private, mesh, and bypass traffic paths.
2. List required protocols and canary features.
3. Prefer an already supported, monitored data plane.
4. Exclude retired or unsupported controllers from greenfield selection.
5. Verify Argo/provider/plugin version compatibility from official docs.
6. Prototype stable/canary Service selection and a 0/5/50/100 weight sequence.
7. Test sticky and long-lived client behavior.
8. Kill or disconnect the provider controller during a paused rollout and observe safety.
9. Abort at every stage and confirm stable traffic recovery.
10. Validate actual traffic by revision before production adoption.

The winning router is the one whose control plane, data plane, and failure modes your team can operate confidently throughout a bad release.

## Official Documentation

- [Argo Rollouts: Traffic management overview](https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/)
- [Argo Rollouts: NGINX traffic routing](https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/nginx/)
- [Argo Rollouts: AWS ALB traffic routing](https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/alb/)
- [Argo Rollouts: Istio traffic routing](https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/istio/)
- [Argo Rollouts: Traffic-router plugins](https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/plugins/)
- [Argo Rollouts: Multiple traffic providers](https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/multiple/)
- [Argo Rollouts official repository: traffic-shaping support matrix](https://github.com/argoproj/argo-rollouts#supported-traffic-shaping-integrations)
- [Gateway API: HTTP traffic splitting](https://gateway-api.sigs.k8s.io/guides/traffic-splitting/)
- [Kubernetes: Ingress NGINX retirement](https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/)
- [Kubernetes: Ingress2Gateway 1.0](https://kubernetes.io/blog/2026/03/20/ingress2gateway-1-0-release/)
