# How to use Gateway API policy attachment for extensibility

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Gateway API, Architecture

Description: Implement Gateway API policy attachment pattern to extend gateway functionality with custom policies for rate limiting, authentication, observability, and traffic management without modifying core Gateway or HTTPRoute resources.

---

The Gateway API provides a standardized policy attachment mechanism that allows vendors and platform teams to extend gateway functionality without cluttering the core API. Policy attachment enables adding features like rate limiting, authentication, circuit breaking, and custom transformations through separate policy resources that attach to Gateway, HTTPRoute, or backend Service resources. This guide shows you how to use and implement policy attachment for extensible gateway configuration.

## Understanding Policy Attachment

Policy attachment follows these principles:

1. **Separation of concerns**: Core routing stays in HTTPRoute, advanced features in policies
2. **Vendor extensibility**: Gateway implementations can add custom policies
3. **Hierarchy and precedence**: Policies can attach at different levels with clear precedence rules
4. **Target reference**: Policies reference Gateway API resources via targetRef

Policy attachment points:
- **Gateway**: Applies to all traffic through the gateway
- **HTTPRoute**: Applies to specific routes
- **Service**: Applies to traffic to specific backends
- **Namespace**: Applies to all resources in a namespace

## Basic Policy Attachment Pattern

Policies use the targetRef field to specify what they apply to:

```yaml
# Example policy structure
apiVersion: vendor.example.com/v1alpha1
kind: CustomPolicy
metadata:
  name: my-policy
  namespace: default
spec:
  targetRef:
    group: gateway.networking.k8s.io
    kind: HTTPRoute
    name: my-route
    namespace: default  # Optional if same namespace
  # Policy-specific configuration
  configuration:
    setting1: value1
    setting2: value2
```

## Rate Limiting Policy Example

Implement rate limiting using Envoy Gateway's BackendTrafficPolicy:

```yaml
# rate-limit-policy.yaml
apiVersion: gateway.envoyproxy.io/v1alpha1
kind: BackendTrafficPolicy
metadata:
  name: rate-limit-policy
  namespace: default
spec:
  # Attach to HTTPRoute
  targetRef:
    group: gateway.networking.k8s.io
    kind: HTTPRoute
    name: api-route
  rateLimit:
    type: Global
    global:
      rules:
      - clientSelectors:
        - headers:
          - name: x-user-id
            type: Distinct
        limit:
          requests: 100
          unit: Minute
---
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: api-route
spec:
  parentRefs:
  - name: production-gateway
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /api
    backendRefs:
    - name: api-service
      port: 8080
```

The HTTPRoute remains clean and focused on routing, while the policy adds rate limiting.

## Attaching Policies to Gateways

Apply policies to all traffic through a Gateway:

```yaml
# gateway-level-policy.yaml
apiVersion: gateway.envoyproxy.io/v1alpha1
kind: SecurityPolicy
metadata:
  name: gateway-security
  namespace: gateway-system
spec:
  # Attach to Gateway
  targetRef:
    group: gateway.networking.k8s.io
    kind: Gateway
    name: production-gateway
  cors:
    allowOrigins:
    - "https://example.com"
    - "https://api.example.com"
    allowMethods:
    - GET
    - POST
    - PUT
    - DELETE
    allowHeaders:
    - Content-Type
    - Authorization
    maxAge: 86400
---
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: production-gateway
  namespace: gateway-system
spec:
  gatewayClassName: envoy
  listeners:
  - name: http
    protocol: HTTP
    port: 80
```

All routes through this Gateway inherit the CORS policy.

## Multi-Level Policy Attachment

Attach policies at different levels with inheritance:

```yaml
# namespace-level-policy.yaml
apiVersion: vendor.example.com/v1alpha1
kind: TimeoutPolicy
metadata:
  name: namespace-timeout
  namespace: production
spec:
  targetRef:
    group: ""
    kind: Namespace
    name: production
  timeout:
    request: 30s
    idle: 60s
---
# gateway-level-policy.yaml
apiVersion: vendor.example.com/v1alpha1
kind: TimeoutPolicy
metadata:
  name: gateway-timeout
  namespace: gateway-system
spec:
  targetRef:
    group: gateway.networking.k8s.io
    kind: Gateway
    name: production-gateway
  timeout:
    request: 60s  # Overrides namespace default
    idle: 120s
---
# route-level-policy.yaml
apiVersion: vendor.example.com/v1alpha1
kind: TimeoutPolicy
metadata:
  name: slow-route-timeout
  namespace: production
spec:
  targetRef:
    group: gateway.networking.k8s.io
    kind: HTTPRoute
    name: slow-route
  timeout:
    request: 300s  # Overrides gateway and namespace
```

Precedence: Route-level > Gateway-level > Namespace-level

## Authentication Policy Attachment

Implement JWT authentication via policy:

```yaml
# jwt-auth-policy.yaml
apiVersion: gateway.envoyproxy.io/v1alpha1
kind: SecurityPolicy
metadata:
  name: jwt-authentication
  namespace: default
spec:
  targetRef:
    group: gateway.networking.k8s.io
    kind: HTTPRoute
    name: authenticated-api-route
  jwt:
    providers:
    - name: auth0
      issuer: "https://example.auth0.com/"
      audiences:
      - "https://api.example.com"
      remoteJWKS:
        uri: "https://example.auth0.com/.well-known/jwks.json"
      claimToHeaders:
      - claim: sub
        header: X-User-ID
      - claim: email
        header: X-User-Email
---
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: authenticated-api-route
spec:
  parentRefs:
  - name: production-gateway
  hostnames:
  - "api.example.com"
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /api
    backendRefs:
    - name: api-service
      port: 8080
```

The authentication policy attaches to the route without modifying the HTTPRoute resource.

## Circuit Breaking Policy

Implement circuit breaking via policy attachment:

```yaml
# circuit-breaker-policy.yaml
apiVersion: gateway.envoyproxy.io/v1alpha1
kind: BackendTrafficPolicy
metadata:
  name: circuit-breaker
  namespace: default
spec:
  targetRef:
    group: gateway.networking.k8s.io
    kind: HTTPRoute
    name: unstable-service-route
  circuitBreaker:
    maxConnections: 100
    maxPendingRequests: 50
    maxRequests: 200
    maxRetries: 3
```

## Request Transformation Policy

Transform requests using policy attachment:

```yaml
# transformation-policy.yaml
apiVersion: vendor.example.com/v1alpha1
kind: TransformationPolicy
metadata:
  name: api-transform
  namespace: default
spec:
  targetRef:
    group: gateway.networking.k8s.io
    kind: HTTPRoute
    name: legacy-api-route
  requestTransform:
    # Add headers
    addHeaders:
      X-API-Version: "v2"
      X-Gateway: "production"
    # Remove headers
    removeHeaders:
    - X-Internal-Token
    # Modify path
    pathRewrite:
      pattern: "^/api/v1/(.*)"
      replacement: "/v2/$1"
    # Transform body
    bodyTransform:
      template: |
        {
          "version": "v2",
          "data": {{ .request.body }}
        }
```

## Observability Policy Attachment

Add tracing and metrics via policy:

```yaml
# observability-policy.yaml
apiVersion: vendor.example.com/v1alpha1
kind: ObservabilityPolicy
metadata:
  name: tracing-policy
  namespace: default
spec:
  targetRef:
    group: gateway.networking.k8s.io
    kind: Gateway
    name: production-gateway
  tracing:
    provider: jaeger
    endpoint: "http://jaeger-collector.observability.svc.cluster.local:14268/api/traces"
    samplingRate: 100
    tags:
      environment: production
      team: platform
  metrics:
    enabled: true
    histogramBuckets: [0.001, 0.01, 0.1, 1, 10]
    customLabels:
      cluster: prod-us-east
```

## Custom Policy Resource Definition

Create your own policy type:

```yaml
# custom-policy-crd.yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: custompolicies.company.example.com
spec:
  group: company.example.com
  versions:
  - name: v1alpha1
    served: true
    storage: true
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              targetRef:
                type: object
                required: [group, kind, name]
                properties:
                  group:
                    type: string
                  kind:
                    type: string
                  name:
                    type: string
                  namespace:
                    type: string
              config:
                type: object
                properties:
                  feature1:
                    type: string
                  feature2:
                    type: boolean
  scope: Namespaced
  names:
    plural: custompolicies
    singular: custompolicy
    kind: CustomPolicy
```

Use the custom policy:

```yaml
# use-custom-policy.yaml
apiVersion: company.example.com/v1alpha1
kind: CustomPolicy
metadata:
  name: my-custom-policy
  namespace: default
spec:
  targetRef:
    group: gateway.networking.k8s.io
    kind: HTTPRoute
    name: my-route
  config:
    feature1: "enabled"
    feature2: true
```

## Implementing Policy Controller

Build a controller that watches for policy resources:

```go
// policy-controller.go
package main

import (
    "context"
    "fmt"

    gatewayv1 "sigs.k8s.io/gateway-api/apis/v1"
    "sigs.k8s.io/controller-runtime/pkg/client"
    "sigs.k8s.io/controller-runtime/pkg/reconcile"
)

type PolicyReconciler struct {
    client.Client
}

func (r *PolicyReconciler) Reconcile(ctx context.Context, req reconcile.Request) (reconcile.Result, error) {
    // Fetch the policy
    policy := &CustomPolicy{}
    if err := r.Get(ctx, req.NamespacedName, policy); err != nil {
        return reconcile.Result{}, client.IgnoreNotFound(err)
    }

    // Get the target resource
    targetRef := policy.Spec.TargetRef

    switch targetRef.Kind {
    case "HTTPRoute":
        // Handle HTTPRoute attachment
        route := &gatewayv1.HTTPRoute{}
        routeKey := client.ObjectKey{
            Name:      targetRef.Name,
            Namespace: targetRef.Namespace,
        }
        if err := r.Get(ctx, routeKey, route); err != nil {
            return reconcile.Result{}, err
        }

        // Apply policy to route
        if err := r.applyPolicyToRoute(ctx, policy, route); err != nil {
            return reconcile.Result{}, err
        }

    case "Gateway":
        // Handle Gateway attachment
        gateway := &gatewayv1.Gateway{}
        gwKey := client.ObjectKey{
            Name:      targetRef.Name,
            Namespace: targetRef.Namespace,
        }
        if err := r.Get(ctx, gwKey, gateway); err != nil {
            return reconcile.Result{}, err
        }

        // Apply policy to gateway
        if err := r.applyPolicyToGateway(ctx, policy, gateway); err != nil {
            return reconcile.Result{}, err
        }
    }

    return reconcile.Result{}, nil
}

func (r *PolicyReconciler) applyPolicyToRoute(ctx context.Context, policy *CustomPolicy, route *gatewayv1.HTTPRoute) error {
    // Implement policy application logic
    fmt.Printf("Applying policy %s to route %s\n", policy.Name, route.Name)

    // Example: Configure underlying gateway (Envoy, Kong, etc.)
    // This depends on your gateway implementation

    return nil
}

func (r *PolicyReconciler) applyPolicyToGateway(ctx context.Context, policy *CustomPolicy, gateway *gatewayv1.Gateway) error {
    fmt.Printf("Applying policy %s to gateway %s\n", policy.Name, gateway.Name)
    return nil
}
```

## Policy Precedence and Conflicts

Handle policy conflicts with clear precedence:

```yaml
# precedence-example.yaml
# Most specific wins: Route > Gateway > Namespace

# Namespace default: 30s timeout
apiVersion: vendor.example.com/v1alpha1
kind: TimeoutPolicy
metadata:
  name: namespace-default
  namespace: production
spec:
  targetRef:
    group: ""
    kind: Namespace
    name: production
  timeout:
    request: 30s
---
# Gateway override: 60s timeout
apiVersion: vendor.example.com/v1alpha1
kind: TimeoutPolicy
metadata:
  name: gateway-override
  namespace: production
spec:
  targetRef:
    group: gateway.networking.k8s.io
    kind: Gateway
    name: production-gateway
    namespace: gateway-system
  timeout:
    request: 60s
---
# Route-specific: 120s timeout (wins)
apiVersion: vendor.example.com/v1alpha1
kind: TimeoutPolicy
metadata:
  name: slow-route
  namespace: production
spec:
  targetRef:
    group: gateway.networking.k8s.io
    kind: HTTPRoute
    name: report-generation-route
  timeout:
    request: 120s
```

Document precedence rules in your policy CRD.

## Policy Status and Conditions

Report policy application status:

```yaml
# policy-with-status.yaml
apiVersion: vendor.example.com/v1alpha1
kind: RateLimitPolicy
metadata:
  name: api-rate-limit
spec:
  targetRef:
    group: gateway.networking.k8s.io
    kind: HTTPRoute
    name: api-route
  rateLimit:
    requests: 100
    window: 1m
status:
  conditions:
  - type: Accepted
    status: "True"
    reason: PolicyAccepted
    message: "Policy successfully attached to HTTPRoute"
    lastTransitionTime: "2026-02-09T10:00:00Z"
  - type: Enforced
    status: "True"
    reason: PolicyEnforced
    message: "Rate limiting is active"
    lastTransitionTime: "2026-02-09T10:00:30Z"
```

Check policy status:

```bash
kubectl get ratelimitpolicy api-rate-limit -o yaml
```

## Monitoring Policy Effectiveness

Track policy metrics:

```yaml
# policy-metrics-servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: policy-controller-metrics
spec:
  selector:
    matchLabels:
      app: policy-controller
  endpoints:
  - port: metrics
    interval: 30s
```

Query policy metrics:

```promql
# Policies applied
sum(policy_applied_total) by (policy_type, target_kind)

# Policy errors
sum(rate(policy_errors_total[5m])) by (policy_type, error_type)

# Rate limit hits
sum(rate(rate_limit_exceeded_total[5m])) by (policy_name)
```

## Best Practices for Policy Attachment

Follow these guidelines:

1. **Keep policies focused**: One policy per concern (auth, rate limiting, etc.)
2. **Document precedence**: Make clear which policy wins in conflicts
3. **Use appropriate attachment points**: Gateway for global, Route for specific
4. **Validate targetRef**: Ensure referenced resources exist
5. **Provide status feedback**: Update policy status with application results
6. **Version policies**: Use API versioning for policy evolution

Example policy template:

```yaml
apiVersion: company.example.com/v1alpha1
kind: PolicyTemplate
metadata:
  name: standard-api-policy
spec:
  # Apply to all HTTPRoutes with label
  targetSelector:
    matchLabels:
      policy: standard
  policies:
  - rateLimit:
      requests: 1000
      window: 1m
  - authentication:
      type: jwt
      issuer: "https://auth.company.com"
  - observability:
      tracing: enabled
      metrics: enabled
```

## Troubleshooting Policy Attachment

Debug policy issues:

```bash
# List all policies in namespace
kubectl get backendtrafficpolicy,securitypolicy -n default

# Check policy status
kubectl describe backendtrafficpolicy rate-limit-policy

# Verify targetRef resolution
kubectl get httproute api-route -o yaml | grep -A 5 metadata

# Check controller logs
kubectl logs -n gateway-system -l app=policy-controller

# Test policy effect
curl -v http://api.example.com/api/test  # Should see rate limit headers
```

Common issues:
1. **Policy not applied**: Check targetRef namespace and name
2. **Conflicts**: Review precedence rules
3. **Invalid targetRef**: Verify target resource exists
4. **Controller not running**: Check policy controller deployment

Policy attachment provides extensibility without API bloat in the Gateway API. Use policies to add rate limiting, authentication, observability, and custom transformations while keeping HTTPRoute clean and focused on routing. Implement custom policy types for organization-specific needs, follow clear precedence rules, and provide status feedback to users. Policy attachment enables a modular, extensible gateway architecture that adapts to diverse requirements.
