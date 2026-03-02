# How to Set Up Istio Resource Naming Conventions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Naming Convention, Best Practices, Kubernetes, Configuration Management

Description: Establish consistent naming conventions for Istio VirtualServices, DestinationRules, Gateways, and other resources to keep your mesh configuration maintainable.

---

When you have five Istio resources, naming does not matter much. When you have five hundred, good naming conventions are the difference between finding what you need in seconds and spending twenty minutes scrolling through kubectl output trying to figure out which VirtualService is the right one.

Naming conventions sound boring, but they save real time. They make troubleshooting faster, code reviews easier, and onboarding new team members smoother. Here is a practical approach to naming Istio resources consistently.

## General Naming Rules

Before getting into resource-specific conventions, some ground rules apply to everything:

- Use lowercase letters, numbers, and hyphens only
- No underscores (they are technically valid but break some tools)
- Keep names under 63 characters (Kubernetes limit)
- Be descriptive but not verbose
- Include the service name or purpose in the resource name
- Use consistent suffixes or prefixes to indicate resource type when needed

Kubernetes resource names must match the following regex, so stick to that pattern:

```
[a-z0-9]([-a-z0-9]*[a-z0-9])?
```

## VirtualService Naming

VirtualServices control routing, so their names should make it clear what traffic they manage.

Pattern: `{service-name}` or `{service-name}-{context}`

```yaml
# Good: Clear which service this routes to
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: orders-service
  namespace: production
spec:
  hosts:
    - orders-service
  http:
    - route:
        - destination:
            host: orders-service
```

```yaml
# Good: When you need multiple VirtualServices for different contexts
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: orders-service-external
  namespace: production
spec:
  hosts:
    - orders.example.com
  gateways:
    - istio-system/main-gateway
  http:
    - route:
        - destination:
            host: orders-service
```

```yaml
# Bad: Too generic
metadata:
  name: routing-rules

# Bad: Abbreviations that nobody understands
metadata:
  name: ord-svc-vs-ext-prod-v2
```

If a service has both internal (mesh) and external (gateway) VirtualServices, use suffixes like `-internal` and `-external` to distinguish them.

## DestinationRule Naming

DestinationRules define traffic policies for a destination. Name them after the destination host.

Pattern: `{service-name}` or `{service-name}-{policy-type}`

```yaml
# Good: Matches the service it configures
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: orders-service
  namespace: production
spec:
  host: orders-service
  trafficPolicy:
    connectionPool:
      http:
        maxRequestsPerConnection: 100
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
```

When you have a single DestinationRule per service (which is the common case), just use the service name. If you need multiple DestinationRules for different aspects of the same service, add a descriptive suffix.

## Gateway Naming

Gateways are typically shared resources, so their names should describe what they serve rather than a specific service.

Pattern: `{purpose}-gateway` or `{domain}-gateway`

```yaml
# Good: Describes what it serves
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: public-api-gateway
  namespace: istio-system
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
        credentialName: wildcard-cert
      hosts:
        - "api.example.com"
```

```yaml
# Good: Named after the domain it handles
metadata:
  name: example-com-gateway

# Good: Named after the environment
metadata:
  name: staging-gateway

# Bad: Too generic
metadata:
  name: gateway1

# Bad: Named after a specific service when it is shared
metadata:
  name: orders-gateway  # (unless it really is only for orders)
```

## AuthorizationPolicy Naming

AuthorizationPolicies are critical for security, so their names need to be especially clear about what they allow or deny and which workload they target.

Pattern: `{action}-{target}-{description}`

```yaml
# Good: Clear about what it does
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-orders-from-frontend
  namespace: production
spec:
  selector:
    matchLabels:
      app: orders-service
  action: ALLOW
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/production/sa/frontend"]
```

```yaml
# Good: Deny policy clearly named
metadata:
  name: deny-orders-external-access

# Bad: Unclear what this does
metadata:
  name: orders-policy

# Bad: Too abbreviated
metadata:
  name: ap-ord-fe-allow
```

## ServiceEntry Naming

ServiceEntries define external services. Name them after the external service they represent.

Pattern: `{external-service-name}` or `{provider}-{service}`

```yaml
# Good: Clear external service name
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: stripe-payment-api
  namespace: istio-system
spec:
  hosts:
    - api.stripe.com
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: TLS
  resolution: DNS
```

```yaml
# Good alternatives
metadata:
  name: google-maps-api
metadata:
  name: datadog-agent
metadata:
  name: aws-s3-us-east-1

# Bad: Just the hostname
metadata:
  name: api-stripe-com
```

## PeerAuthentication Naming

Pattern: `{scope}-{mode}` or `{target}-mtls`

```yaml
# Good: Mesh-wide policy
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: mesh-wide-strict-mtls
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
```

```yaml
# Good: Namespace-specific policy
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: production
spec:
  mtls:
    mode: STRICT
```

For namespace-level default policies, using the name `default` is actually the Istio convention and a good practice.

## EnvoyFilter Naming

EnvoyFilters are powerful but can be confusing. Their names should make the purpose obvious.

Pattern: `{target}-{what-it-does}`

```yaml
# Good: Clear purpose
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: orders-service-custom-headers
  namespace: production
spec:
  workloadSelector:
    labels:
      app: orders-service
  configPatches:
    - applyTo: CLUSTER
      match:
        context: SIDECAR_OUTBOUND
      patch:
        operation: MERGE
        value:
          connect_timeout: 5s
```

## Labels and Annotations

Beyond names, consistent labels help with filtering and selection:

```yaml
metadata:
  name: orders-service
  namespace: production
  labels:
    app.kubernetes.io/name: orders-service
    app.kubernetes.io/part-of: order-platform
    app.kubernetes.io/managed-by: argocd
    team: order-team
    environment: production
    istio-resource-type: virtualservice
```

The `istio-resource-type` label is not standard, but it helps when you want to list all VirtualServices managed by a specific team:

```bash
kubectl get virtualservices -n production -l team=order-team
```

## Enforcing Naming Conventions

Write an OPA Gatekeeper constraint that rejects resources with bad names:

```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: istionaming
spec:
  crd:
    spec:
      names:
        kind: IstioNaming
      validation:
        openAPIV3Schema:
          type: object
          properties:
            namePattern:
              type: string
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package istionaming
        violation[{"msg": msg}] {
          not re_match(input.parameters.namePattern, input.review.object.metadata.name)
          msg := sprintf("Resource name '%v' does not match required pattern '%v'", [input.review.object.metadata.name, input.parameters.namePattern])
        }
```

Apply it:

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: IstioNaming
metadata:
  name: virtualservice-naming
spec:
  match:
    kinds:
      - apiGroups: ["networking.istio.io"]
        kinds: ["VirtualService"]
  parameters:
    namePattern: "^[a-z][a-z0-9-]+-service(-[a-z]+)?$"
```

## Quick Reference Table

| Resource Type | Pattern | Example |
|---|---|---|
| VirtualService | `{service}` or `{service}-{context}` | `orders-service-external` |
| DestinationRule | `{service}` | `orders-service` |
| Gateway | `{purpose}-gateway` | `public-api-gateway` |
| AuthorizationPolicy | `{action}-{target}-{desc}` | `allow-orders-from-frontend` |
| ServiceEntry | `{provider}-{service}` | `stripe-payment-api` |
| PeerAuthentication | `{scope}-{mode}` or `default` | `mesh-wide-strict-mtls` |
| EnvoyFilter | `{target}-{purpose}` | `orders-service-custom-headers` |
| Sidecar | `{scope}` or `default` | `default` |

## Summary

Good naming conventions are a small investment with a big payoff. Pick patterns that are descriptive, consistent, and enforceable. Document them in your team wiki. Set up Gatekeeper or a similar tool to reject resources that do not follow the conventions. Your future self - debugging at 2 AM - will thank you.
