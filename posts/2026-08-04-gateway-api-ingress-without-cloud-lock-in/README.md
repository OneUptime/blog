# Reduce Ingress Lock-In with Kubernetes Gateway API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Gateway API, Ingress, Load Balancing, Cloud Portability, Networking, Platform Engineering

Description: Replace common cloud load-balancer annotations with Gateway API resources while keeping implementation classes, policies, addresses, and conformance differences explicit.

---

Kubernetes Ingress standardized basic HTTP routing, but many real deployments rely on controller annotations for redirects, certificates, health checks, target modes, and load-balancer settings. Those annotations are contracts with one implementation.

Gateway API moves more routing behavior into typed, role-oriented Kubernetes resources. It can reduce lock-in substantially, but it does not turn every cloud load balancer into the same product. Portability depends on the API features and conformance profile that both implementations actually support.

## Find the Annotation Contract You Already Have

Start with rendered manifests and live objects:

```bash
kubectl get ingress,service -A -o yaml > edge-resources.yaml
rg -n 'annotations:|load-balancer|ingress|certificate|backend|health' edge-resources.yaml
```

Classify each annotation:

| Concern | Likely Gateway API home | Portability |
| --- | --- | --- |
| Host, path, redirect, header match | `HTTPRoute` hostnames, filters, and rules | Often portable when supported |
| Listener port, protocol, TLS Secret | `Gateway` listener | Core shape is portable |
| Which controller implements it | `GatewayClass` | Implementation-specific name |
| Cloud load-balancer tier or scheme | implementation policy/parameters | Provider-specific |
| Static public IP | `Gateway` address plus infrastructure | Provider-specific lifecycle |
| WAF, DDoS, private link | implementation policy | Provider-specific |
| Backend health behavior | route, policy, or controller config | Feature support varies |

This inventory prevents a mechanical conversion that silently drops behavior.

## Separate Platform and Application Ownership

Gateway API models distinct roles. A platform team can own the `GatewayClass` and shared `Gateway`; an application team can own an `HTTPRoute` attached to an allowed listener.

The shared edge might be:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: public-web
  namespace: edge
spec:
  gatewayClassName: platform-public # example cluster-local accepted class
  listeners:
    - name: https
      hostname: "*.example.com"
      port: 443
      protocol: HTTPS
      tls:
        mode: Terminate
        certificateRefs:
          - kind: Secret
            name: wildcard-example-com
      allowedRoutes:
        namespaces:
          from: Selector
          selector:
            matchLabels:
              edge-access: public
```

An application route can remain provider-neutral:

Because this listener selects route namespaces by label, the platform must authorize the application namespace before attaching the route:

```bash
kubectl label namespace shop edge-access=public
```

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: checkout
  namespace: shop
spec:
  parentRefs:
    - name: public-web
      namespace: edge
      sectionName: https
  hostnames:
    - checkout.example.com
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /api
      backendRefs:
        - name: checkout-api
          port: 8080
```

The `GatewayClass` named `platform-public` is an example, not a portable constant. A cluster administrator can create an organizationally named class only when the installed controller accepts a `GatewayClass` with its `controllerName`. Some managed implementations expose predefined class names-for example, GKE documents names such as `gke-l7-rilb`. In those environments, keep the `Gateway` platform-owned and overlay `spec.gatewayClassName`; the application `HTTPRoute` can still remain stable.

## Use Core Features as the Baseline

Gateway API categorizes features by support level and implementations report the features they support through conformance. Begin with the intersection of the target implementations' Core features. Treat Extended features as portable only when both implementations claim them and have passed the relevant conformance tests.

Do not infer support from the CRD accepting a field. A controller can accept a resource but set status conditions indicating that a listener, route, or feature was not programmed.

Check status after every deployment:

```bash
kubectl get gateway -n edge public-web -o yaml
kubectl get httproute -n shop checkout -o yaml
```

Require positive conditions such as accepted and programmed according to the resource's status model, and inspect `observedGeneration` so stale success is not mistaken for the current specification.

## Keep Provider Infrastructure in Policy or Overlays

The public/private choice, load-balancer SKU, deletion protection, access logs, firewall integration, and cross-zone behavior still need an implementation-specific expression. Depending on the controller, that may be a `GatewayClass` parameters object, an implementation policy CRD, or annotations.

Keep it outside the application route:

```text
platform/gateway/base/gateway.yaml
platform/gateway/eks/aws-policy.yaml
platform/gateway/aks/azure-policy.yaml
platform/gateway/gke/gcp-policy.yaml
apps/checkout/route.yaml
```

The presence of a provider-specific policy is not a failure. It is a visible adapter. Hiding the same values in opaque Helm conditionals makes the migration surface harder to audit.

## Plan Cross-Namespace References Deliberately

Gateway API does not permit arbitrary cross-namespace references. `ReferenceGrant` lets the owner of a target namespace authorize selected references from another namespace. This avoids an application referencing or consuming resources it does not own.

For example, the `edge` namespace controls which route namespaces can attach through `allowedRoutes`. If a route refers to a backend in another namespace, the backend namespace must grant that reference where the API requires it.

Keep certificate Secrets in the same namespace as the `Gateway` unless there is a tested, intentionally granted cross-namespace design. Confirm the chosen controller supports the relevant reference and policy combination.

## Migrate in Observable Stages

Do not replace the production Ingress in one apply. Use parallel endpoints:

1. install the exact Gateway API CRD release supported by the controller;
2. install the target implementation and inspect its conformance report;
3. create a nonproduction `Gateway` and wait for healthy status;
4. deploy equivalent `HTTPRoute` resources;
5. run functional, TLS, timeout, and load tests;
6. direct a canary hostname or weighted external DNS record to the new endpoint;
7. compare errors, latency, source IP behavior, and logs;
8. move the primary hostname, then retain a rollback window;
9. remove the old Ingress only after DNS and connection lifetimes expire.

Where DNS cannot split traffic safely, test a separate hostname and switch the record only after the new path is proven.

## Build a Cross-Implementation Contract Suite

Test the behavior you depend on against every supported controller:

```text
HTTP -> HTTPS redirect behaves as specified
SNI selects the expected certificate
exact and prefix path matches route correctly
header match and rewrite preserve required values
unready Pods receive no new traffic
client address reaches the application in the documented header
request and idle timeouts match the service SLO
large bodies and streaming responses succeed
route rejection produces an alert
```

Also test deletion and reconciliation. Removing a Gateway should follow the platform's retention expectations for public IPs, DNS records, certificates, security groups, and load balancers.

## Know What Gateway API Does Not Port

Gateway API does not move:

- DNS zones and registrar access;
- certificate authority accounts and DNS challenge credentials;
- public IP reputation or allowlists;
- provider WAF rules and managed rule sets;
- private connectivity and firewall resources;
- controller-specific telemetry dimensions;
- pricing, quotas, performance, or regional availability.

Maintain adapters and runbooks for those dependencies. The API reduces the route configuration surface; it does not remove the surrounding edge platform.

## Official Documentation

- [Kubernetes Gateway API overview](https://kubernetes.io/docs/concepts/services-networking/gateway/)
- [Gateway API concepts](https://gateway-api.sigs.k8s.io/docs/concepts/api-overview/)
- [Gateway API implementations and conformance](https://gateway-api.sigs.k8s.io/implementations/)
- [Gateway API conformance documentation](https://gateway-api.sigs.k8s.io/docs/concepts/conformance/)
- [Gateway API cross-namespace routing](https://gateway-api.sigs.k8s.io/guides/multiple-ns/)
- [Kubernetes Ingress](https://kubernetes.io/docs/concepts/services-networking/ingress/)
- [AWS Load Balancer Controller Gateway API on EKS](https://docs.aws.amazon.com/eks/latest/userguide/aws-load-balancer-controller.html)
- [Deploy Gateways on GKE](https://cloud.google.com/kubernetes-engine/docs/how-to/deploying-gateways)

## Conclusion

Gateway API is a strong portability boundary for common routing behavior because it replaces many untyped annotations with structured resources and conformance tests. Keep routes in the shared contract, keep cloud infrastructure in explicit policies, compare supported features, and test status plus traffic on every implementation. The result is less lock-in, not no lock-in.
